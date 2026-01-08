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
const INITIAL_FALL_SPEED = 0.3; // pixels per ms
const MAX_FALL_SPEED = 0.6;
const HIT_THRESHOLD = 80; // pixels

interface Tile {
  id: number;
  column: number;
  y: number;
  hit: boolean;
  missed?: boolean;
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
  'C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'C4',
  'F4', 'A4', 'C5', 'F5', 'C5', 'A4', 'F4',
  'G4', 'B4', 'D5', 'G5', 'D5', 'B4', 'G4',
  'C4', 'E4', 'G4', 'C5', 'B4', 'A4', 'G4',
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
    lastHitQuality: null as HitQuality,
  });
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const tileIdRef = useRef<number>(0);
  const particleIdRef = useRef<number>(0);
  const fallSpeedRef = useRef(INITIAL_FALL_SPEED);
  const synth = useRef<Tone.Sampler | null>(null);
  const melodyIndexRef = useRef(0);
  const gameActive = useRef(true);

  // Initialize Audio
  useEffect(() => {
    const setupAudio = async () => {
      await Tone.start();
      
      // Using a Sampler for better piano sound
      synth.current = new Tone.Sampler({
        urls: {
          A0: "A0.mp3",
          C1: "C1.mp3",
          "D#1": "Ds1.mp3",
          "F#1": "Fs1.mp3",
          A1: "A1.mp3",
          C2: "C2.mp3",
          "D#2": "Ds2.mp3",
          "F#2": "Fs2.mp3",
          A2: "A2.mp3",
          C3: "C3.mp3",
          "D#3": "Ds3.mp3",
          "F#3": "Fs3.mp3",
          A3: "A3.mp3",
          C4: "C4.mp3",
          "D#4": "Ds4.mp3",
          "F#4": "Fs4.mp3",
          A4: "A4.mp3",
          C5: "C5.mp3",
          "D#5": "Ds5.mp3",
          "F#5": "Fs5.mp3",
          A5: "A5.mp3",
          C6: "C6.mp3",
          "D#6": "Ds6.mp3",
          "F#6": "Fs6.mp3",
          A6: "A6.mp3",
          C7: "C7.mp3",
          "D#7": "Ds7.mp3",
          "F#7": "Fs7.mp3",
          A7: "A7.mp3",
          C8: "C8.mp3"
        },
        release: 1,
        baseUrl: "https://tonejs.github.io/audio/salamander/"
      }).toDestination();
      
      if (synth.current) {
        synth.current.volume.value = -10 + (stats.musicVolume / 100) * 10;
      }
    };

    setupAudio();

    return () => {
      synth.current?.dispose();
    };
  }, []);

  // Handle Game Over
  useEffect(() => {
    if (gameState.gameOver) {
      const stars = gameState.score >= 500 ? 3 : gameState.score >= 250 ? 2 : gameState.score >= 100 ? 1 : 0;
      updateBestScore(gameState.score, stars);
    }
  }, [gameState.gameOver]);

  // Game Loop
  useEffect(() => {
    const gameLoop = (time: number) => {
      if (gameState.gameOver || gameState.isPaused || !gameActive.current) {
        lastTimeRef.current = time;
        return;
      }

      if (!lastTimeRef.current) lastTimeRef.current = time;
      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;
      
      // Spawn new tiles
      if (time - lastSpawnRef.current >= SPAWN_INTERVAL) {
        const column = Math.floor(Math.random() * COLUMNS);
        const newTile: Tile = {
          id: tileIdRef.current++,
          column,
          y: -TILE_HEIGHT,
          hit: false,
        };
        setTiles(prev => [...prev, newTile]);
        lastSpawnRef.current = time;
      }

      // Update positions
      setTiles(prev => {
        const updated = prev.map(tile => ({
          ...tile,
          y: tile.y + fallSpeedRef.current * deltaTime
        }));

        // Check for missed tiles
        const missedTile = updated.find(t => !t.hit && t.y > TARGET_LINE_Y + TILE_HEIGHT / 2);
        if (missedTile) {
          setGameState(prev => ({ ...prev, gameOver: true }));
          gameActive.current = false;
        }

        return updated.filter(t => t.y < SCREEN_HEIGHT + TILE_HEIGHT);
      });

      // Update particles
      setParticles(prev => {
        return prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.15, // reduced gravity for softer fall
            life: p.life - 0.015,
          }))
          .filter(p => p.life > 0);
      });

      // Increase speed gradually
      fallSpeedRef.current = Math.min(MAX_FALL_SPEED, INITIAL_FALL_SPEED + (gameState.score / 5000));

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.gameOver, gameState.isPaused, stats.musicVolume, gameState.score]);

  const onBackgroundPress = () => {
    if (!gameState.gameOver && !gameState.isPaused && gameActive.current) {
      if (stats.vibration) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setGameState(prev => ({ ...prev, gameOver: true }));
      gameActive.current = false;
    }
  };

  const onTilePress = (tile: Tile) => {
    if (tile.hit || gameState.gameOver || gameState.isPaused) return;

    // The tile should be centered around its Y position
    const tileCenterY = tile.y + TILE_HEIGHT / 2;
    const distance = Math.abs(tileCenterY - TARGET_LINE_Y);
    
    if (distance < HIT_THRESHOLD) {
      // Play note
      const note = MELODY_NOTES[melodyIndexRef.current % MELODY_NOTES.length];
      synth.current?.triggerAttackRelease(note, '4n');
      melodyIndexRef.current++;

      let quality: HitQuality = 'GOOD';
      let points = 10;
      let particleColor = colors.primaryLight;

      if (distance < 25) {
        quality = 'PERFECT';
        points = 30;
        particleColor = '#FFD700'; // Gold
      } else if (distance < 50) {
        quality = 'GREAT';
        points = 20;
        particleColor = colors.accentLight;
      }

      // Update score
      setGameState(prev => ({
        ...prev,
        score: prev.score + points,
        perfectHits: prev.perfectHits + (quality === 'PERFECT' ? 1 : 0),
        totalTouches: prev.totalTouches + 1,
        lastHitQuality: quality,
      }));

      // Reset quality text after a delay
      setTimeout(() => {
        setGameState(prev => ({ ...prev, lastHitQuality: null }));
      }, 500);

      // Create particles
      if (stats.visualEffects) {
        const newParticles: Particle[] = [];
        const particleCount = quality === 'PERFECT' ? 12 : quality === 'GREAT' ? 8 : 4;
        for (let i = 0; i < particleCount; i++) {
          const angle = (i / particleCount) * Math.PI * 2;
          const speed = Math.random() * 4 + 2;
          newParticles.push({
            id: particleIdRef.current++,
            x: (tile.column + 0.5) * TILE_WIDTH,
            y: TARGET_LINE_Y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            color: particleColor,
          });
        }
        setParticles(prev => [...prev, ...newParticles]);
      }

      // Haptics
      if (stats.vibration) {
        Haptics.impactAsync(
          quality === 'PERFECT' ? Haptics.ImpactFeedbackStyle.Heavy :
          quality === 'GREAT' ? Haptics.ImpactFeedbackStyle.Medium :
          Haptics.ImpactFeedbackStyle.Light
        );
      }

      // Mark tile as hit
      setTiles(prev => prev.map(t => t.id === tile.id ? { ...t, hit: true } : t));
    } else {
      // Tapped but missed the window
      if (stats.vibration) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setGameState(prev => ({ ...prev, gameOver: true }));
      gameActive.current = false;
    }
  };

  const resetGame = () => {
    setGameState({
      score: 0,
      gameOver: false,
      isPaused: false,
      perfectHits: 0,
      totalTouches: 0,
      lastHitQuality: null,
    });
    setTiles([]);
    setParticles([]);
    tileIdRef.current = 0;
    particleIdRef.current = 0;
    melodyIndexRef.current = 0;
    lastSpawnRef.current = 0;
    lastTimeRef.current = 0;
    fallSpeedRef.current = INITIAL_FALL_SPEED;
    gameActive.current = true;
  };

  const precision = gameState.totalTouches > 0 ? Math.round((gameState.perfectHits / gameState.totalTouches) * 100) : 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Background Lanes */}
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={onBackgroundPress} 
        style={styles.gameArea}
      >
        <View style={styles.lanes}>
          {[...Array(COLUMNS)].map((_, i) => (
            <View key={i} style={[styles.lane, { borderRightWidth: i < COLUMNS - 1 ? 1 : 0 }]} />
          ))}
        </View>

        {/* Target Line */}
        <View style={[styles.targetLine, { top: TARGET_LINE_Y }]} />

        {/* Tiles */}
        {tiles.map(tile => (
          <TouchableOpacity
            key={tile.id}
            activeOpacity={0.8}
            onPress={() => onTilePress(tile)}
            style={[
              styles.tile,
              {
                left: tile.column * TILE_WIDTH,
                top: tile.y,
                backgroundColor: tile.hit ? colors.transparent : colors.primary,
                opacity: tile.hit ? 0 : 1,
              }
            ]}
          >
            <View style={styles.tileContent} />
          </TouchableOpacity>
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
      </TouchableOpacity>

      {/* Top UI */}
      <View style={styles.topUi}>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>{gameState.score}</Text>
          <Text style={styles.bestScoreLabel}>Best: {stats.bestScore}</Text>
        </View>
        
        {/* Quality Indicator */}
        {gameState.lastHitQuality && (
          <Animated.View style={styles.qualityContainer}>
            <Text style={[
              styles.qualityText,
              { color: gameState.lastHitQuality === 'PERFECT' ? '#FFD700' : 
                       gameState.lastHitQuality === 'GREAT' ? colors.accentLight : 
                       colors.primaryLight }
            ]}>
              {gameState.lastHitQuality}
            </Text>
          </Animated.View>
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
                    color={i < (gameState.score >= 500 ? 3 : gameState.score >= 250 ? 2 : gameState.score >= 100 ? 1 : 0) ? colors.warning : colors.border} 
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
    backgroundColor: colors.primary,
    opacity: 0.5,
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
    backgroundColor: colors.primary,
    ...shadows.sm,
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
});
