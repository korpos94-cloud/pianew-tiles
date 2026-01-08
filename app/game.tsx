import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, Platform, Alert, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Tone from 'tone';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '@/hooks/useGameStore';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/design';
import { Container, Button, Card } from '@/components/ui';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing, 
  runOnJS,
  cancelAnimation
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLUMNS = 4;
const TILE_WIDTH = SCREEN_WIDTH / COLUMNS;
const TILE_HEIGHT = 160;
const SPAWN_INTERVAL = 700;
const TARGET_LINE_Y = SCREEN_HEIGHT * 0.8;
const INITIAL_FALL_SPEED = 3.5; // seconds to reach bottom
const MAX_FALL_SPEED = 1.5;
const HIT_THRESHOLD = 80; // pixels
const PERFECT_THRESHOLD = 30; // pixels

interface Tile {
  id: number;
  column: number;
  y: number;
  hit: boolean;
  spawnTime: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

type HitQuality = 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS' | null;

const MELODY_NOTES = [
  'C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4',
  'F4', 'F4', 'E4', 'E4', 'D4', 'D4', 'C4',
  'G4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4',
  'G4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4',
];

export default function GameScreen() {
  const router = useRouter();
  const { stats, updateBestScore } = useGameStore();
  
  const [gameState, setGameState] = useState({
    score: 0,
    gameOver: false,
    isPaused: false,
    perfectHits: 0,
    totalTouches: 0,
    combo: 0,
  });
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [hitFeedback, setHitFeedback] = useState<{ id: number; text: string; x: number; y: number } | null>(null);

  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const tileIdRef = useRef<number>(0);
  const particleIdRef = useRef<number>(0);
  const fallSpeedSecondsRef = useRef(INITIAL_FALL_SPEED);
  const synth = useRef<Tone.Sampler | null>(null);
  const melodyIndexRef = useRef(0);
  const gameActive = useRef(true);

  // Initialize Audio
  useEffect(() => {
    const setupAudio = async () => {
      await Tone.start();
      // Using a better piano-like sound with a sampler or richer synth
      synth.current = new Tone.Sampler({
        urls: {
          A1: "A1.mp3",
          A2: "A2.mp3",
        },
        baseUrl: "https://tonejs.github.io/audio/salamander/",
        onload: () => {
          if (synth.current) {
            synth.current.volume.value = -5 + (stats.musicVolume / 100) * 10;
          }
        }
      }).toDestination();
    };

    setupAudio();

    return () => {
      synth.current?.dispose();
    };
  }, []);

  // Persist Score on Game Over
  useEffect(() => {
    if (gameState.gameOver) {
      const stars = gameState.score >= 200 ? 3 : gameState.score >= 100 ? 2 : gameState.score >= 50 ? 1 : 0;
      updateBestScore(gameState.score, stars);
    }
  }, [gameState.gameOver]);

  // Game Loop
  useEffect(() => {
    const gameLoop = (time: number) => {
      if (gameState.gameOver || gameState.isPaused || !gameActive.current) {
        lastTimeRef.current = 0;
        return;
      }

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = time;
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const deltaTime = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      // Spawn logic
      const spawnInterval = (fallSpeedSecondsRef.current * 1000) / 4; // Spawn a tile every 1/4 of the fall time
      if (time - lastSpawnRef.current >= spawnInterval) {
        const column = Math.floor(Math.random() * COLUMNS);
        const newTile: Tile = {
          id: tileIdRef.current++,
          column,
          y: -TILE_HEIGHT,
          hit: false,
          spawnTime: time,
        };
        setTiles(prev => [...prev, newTile]);
        lastSpawnRef.current = time;
      }

      // Update positions
      const pixelsPerSecond = SCREEN_HEIGHT / fallSpeedSecondsRef.current;
      setTiles(prev => {
        const updated = prev.map(tile => ({
          ...tile,
          y: tile.y + pixelsPerSecond * deltaTime
        }));

        // Check for missed tiles (not hit and passed the target line)
        const missedTile = updated.find(t => !t.hit && t.y > TARGET_LINE_Y + TILE_HEIGHT / 2);
        if (missedTile) {
          setGameState(prev => ({ ...prev, combo: 0, gameOver: true }));
          gameActive.current = false;
          if (stats.vibration) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }

        return updated.filter(t => t.y < SCREEN_HEIGHT + TILE_HEIGHT);
      });

      // Update particles
      setParticles(prev => {
        if (prev.length === 0) return prev;
        return prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.3,
            life: p.life - 0.03,
          }))
          .filter(p => p.life > 0);
      });

      // Increase speed gradually
      fallSpeedSecondsRef.current = Math.max(
        MAX_FALL_SPEED,
        INITIAL_FALL_SPEED - (gameState.score / 500) * (INITIAL_FALL_SPEED - MAX_FALL_SPEED)
      );

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.gameOver, gameState.isPaused, stats.musicVolume, gameState.score]);

  const onTilePress = (tile: Tile) => {
    if (tile.hit || gameState.gameOver || gameState.isPaused) return;

    const distance = Math.abs(tile.y - TARGET_LINE_Y);
    
    if (distance < HIT_THRESHOLD) {
      // Play note
      const note = MELODY_NOTES[melodyIndexRef.current % MELODY_NOTES.length];
      synth.current?.triggerAttackRelease(note, '8n');
      melodyIndexRef.current++;

      const isPerfect = distance < PERFECT_THRESHOLD;
      
      // Hit Feedback
      setHitFeedback({
        id: Date.now(),
        text: isPerfect ? 'PERFECT' : 'GOOD',
        x: (tile.column + 0.5) * TILE_WIDTH - 40,
        y: TARGET_LINE_Y - 40,
      });

      // Update score
      setGameState(prev => ({
        ...prev,
        score: prev.score + (isPerfect ? 20 : 10),
        perfectHits: prev.perfectHits + (isPerfect ? 1 : 0),
        totalTouches: prev.totalTouches + 1,
        combo: prev.combo + 1,
      }));

      // Create particles
      if (stats.visualEffects) {
        const newParticles: Particle[] = [];
        const count = isPerfect ? 12 : 6;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const force = isPerfect ? 6 : 4;
          newParticles.push({
            id: particleIdRef.current++,
            x: (tile.column + 0.5) * TILE_WIDTH,
            y: TARGET_LINE_Y,
            vx: Math.cos(angle) * force,
            vy: Math.sin(angle) * force,
            life: 1,
            color: isPerfect ? '#FFD700' : colors.primaryLight,
          });
        }
        setParticles(prev => [...prev, ...newParticles]);
      }

      // Haptics
      if (stats.vibration) {
        Haptics.impactAsync(isPerfect ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);
      }

      // Mark tile as hit
      setTiles(prev => prev.map(t => t.id === tile.id ? { ...t, hit: true } : t));
    } else {
      // Tapped too early/late but it was a tile press
      setGameState(prev => ({ ...prev, combo: 0, gameOver: true }));
      gameActive.current = false;
      if (stats.vibration) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const onBackgroundPress = () => {
    if (!gameState.gameOver && !gameState.isPaused && gameActive.current) {
      setGameState(prev => ({ ...prev, combo: 0, gameOver: true }));
      gameActive.current = false;
      if (stats.vibration) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const resetGame = () => {
    setGameState({
      score: 0,
      gameOver: false,
      isPaused: false,
      perfectHits: 0,
      totalTouches: 0,
      combo: 0,
    });
    setTiles([]);
    setParticles([]);
    setHitFeedback(null);
    tileIdRef.current = 0;
    particleIdRef.current = 0;
    melodyIndexRef.current = 0;
    lastSpawnRef.current = 0;
    lastTimeRef.current = 0;
    fallSpeedSecondsRef.current = INITIAL_FALL_SPEED;
    gameActive.current = true;
  };

  const precision = gameState.totalTouches > 0 ? Math.round((gameState.perfectHits / gameState.totalTouches) * 100) : 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Background Lanes */}
      <Pressable 
        onPress={onBackgroundPress} 
        style={styles.gameArea}
      >
        <View style={styles.lanes}>
          {[...Array(COLUMNS)].map((_, i) => (
            <View key={i} style={[styles.lane, { borderRightWidth: i < COLUMNS - 1 ? 1 : 0 }]} />
          ))}
        </View>

        {/* Target Line */}
        <View style={[styles.targetLine, { top: TARGET_LINE_Y }]}>
          <LinearGradient
            colors={[colors.transparent, colors.primary, colors.transparent]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Tiles */}
        {tiles.map(tile => (
          <Pressable
            key={tile.id}
            onPress={() => onTilePress(tile)}
            style={[
              styles.tile,
              {
                left: tile.column * TILE_WIDTH,
                top: tile.y,
                opacity: tile.hit ? 0 : 1,
              }
            ]}
          >
            <View style={styles.tileContent}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={StyleSheet.absoluteFill}
                borderRadius={borderRadius.sm}
              />
            </View>
          </Pressable>
        ))}

        {/* Particles */}
        {particles.map(p => (
          <View
            key={p.id}
            style={[
              styles.particle,
              {
                left: p.x,
                top: p.y,
                backgroundColor: p.color,
                opacity: p.life,
                transform: [{ scale: p.life }],
              }
            ]}
          />
        ))}

        {/* Hit Feedback Text */}
        {hitFeedback && (
          <AnimatedHitText 
            key={hitFeedback.id} 
            text={hitFeedback.text} 
            x={hitFeedback.x} 
            y={hitFeedback.y} 
          />
        )}
      </Pressable>

      {/* Top UI */}
      <View style={styles.topUi}>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>{gameState.score}</Text>
          <Text style={styles.bestScoreLabel}>Best: {stats.bestScore}</Text>
        </View>
        
        {/* Combo Indicator */}
        {gameState.combo > 1 && (
          <View style={styles.comboContainer}>
            <Text style={styles.comboText}>{gameState.combo}x</Text>
          </View>
        )}

        <Pressable onPress={() => setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }))} style={styles.pauseButton}>
          <Ionicons name={gameState.isPaused ? "play" : "pause"} size={28} color={colors.white} />
        </Pressable>
      </View>

      {/* Game Over Modal */}
      {gameState.gameOver && (
        <View style={styles.modalOverlay}>
          <Card variant="elevated" style={styles.modalCard}>
            <Card.Header>
              <Text style={styles.modalTitle}>Game Over</Text>
            </Card.Header>
            <Card.Content>
              <View style={styles.modalStats}>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatLabel}>Score</Text>
                  <Text style={styles.modalStatValue}>{gameState.score}</Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatLabel}>Precision</Text>
                  <Text style={styles.modalStatValue}>{precision}%</Text>
                </View>
              </View>
              <View style={styles.starsContainer}>
                {[...Array(3)].map((_, i) => (
                  <Ionicons 
                    key={i} 
                    name="star" 
                    size={40} 
                    color={i < (gameState.score >= 200 ? 3 : gameState.score >= 100 ? 2 : gameState.score >= 50 ? 1 : 0) ? colors.warning : colors.border} 
                  />
                ))}
              </View>
            </Card.Content>
            <Card.Footer style={styles.modalFooter}>
              <Button variant="primary" onPress={resetGame} style={styles.modalButton}>
                Play Again
              </Button>
              <Button variant="ghost" onPress={() => router.replace('/')} style={styles.modalButton}>
                Home
              </Button>
            </Card.Footer>
          </Card>
        </View>
      )}

      {/* Pause Menu */}
      {gameState.isPaused && !gameState.gameOver && (
        <View style={styles.modalOverlay}>
          <Card variant="elevated" style={styles.modalCard}>
            <Card.Header>
              <Text style={styles.modalTitle}>Paused</Text>
            </Card.Header>
            <Card.Content>
              <Text style={styles.modalSubtitle}>Take a breather!</Text>
            </Card.Content>
            <Card.Footer style={styles.modalFooter}>
              <Button variant="primary" onPress={() => setGameState(prev => ({ ...prev, isPaused: false }))} style={styles.modalButton}>
                Resume
              </Button>
              <Button variant="ghost" onPress={() => router.replace('/')} style={styles.modalButton}>
                Quit
              </Button>
            </Card.Footer>
          </Card>
        </View>
      )}
    </View>
  );
}

function AnimatedHitText({ text, x, y }: { text: string; x: number; y: number }) {
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(0, { duration: 500 });
    translateY.value = withTiming(-50, { duration: 500 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.hitFeedback, { left: x, top: y }, animatedStyle]}>
      <Text style={[
        styles.hitFeedbackText,
        { color: text === 'PERFECT' ? '#FFD700' : colors.primaryLight }
      ]}>
        {text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gameArea: {
    flex: 1,
    width: '100%',
  },
  lanes: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  lane: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.05)',
  },
  qualityContainer: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  qualityText: {
    ...typography.h1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    opacity: 0.8,
  },
  tile: {
    position: 'absolute',
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    padding: 4,
  },
  tileContent: {
    flex: 1,
    borderRadius: borderRadius.sm,
    ...shadows.md,
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  topUi: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: spacing.lg,
    zIndex: 10,
  },
  scoreContainer: {
    alignItems: 'flex-start',
  },
  scoreText: {
    ...typography.display,
    color: colors.white,
  },
  bestScoreLabel: {
    ...typography.smallBold,
    color: colors.textTertiary,
  },
  comboContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 100,
    alignItems: 'center',
    zIndex: 1,
  },
  comboText: {
    ...typography.h2,
    fontWeight: 'bold',
    color: colors.warning,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  pauseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    zIndex: 100,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.backgroundSecondary,
  },
  modalTitle: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: spacing.lg,
  },
  modalStatItem: {
    alignItems: 'center',
  },
  modalStatLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  modalStatValue: {
    ...typography.h2,
    color: colors.primary,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modalFooter: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  modalButton: {
    width: '100%',
  },
  hitFeedback: {
    position: 'absolute',
    width: 80,
    alignItems: 'center',
    zIndex: 50,
  },
  hitFeedbackText: {
    ...typography.h3,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
});
