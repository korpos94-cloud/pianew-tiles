import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as Tone from 'tone';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Volume2, VolumeX, Pause, Play, Home as HomeIcon } from 'lucide-react';
import { useLocation } from 'wouter';
import { useGameStorage } from '@/hooks/useGameStorage';

interface Tile {
  id: number;
  column: number;
  y: number;
}

interface ParticleEffect {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  type: 'perfect' | 'good';
}

interface GameState {
  score: number;
  perfectHits: number;
  totalTouches: number;
  gameOver: boolean;
  isPaused: boolean;
  stars: number;
  precision: number;
  bestScore: number;
}

const COLUMNS = 4;
const TILE_HEIGHT = 120;
const SPAWN_INTERVAL = 700;
const INITIAL_FALL_SPEED = 3;
const FALL_ACCELERATION = 0.001;
const MAX_FALL_SPEED = 8;
const PERFECT_DISTANCE = 30;
const GOOD_DISTANCE = 80;
const TARGET_LINE_Y = 100;
const PARTICLE_COUNT = 12;
const PARTICLE_GRAVITY = 0.2;
const PARTICLE_FADE = 0.02;

// Melodía extendida de Twinkle Twinkle Little Star (40 notas)
const MELODY_NOTES = [
  'C4', 'C4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5',
  'A5', 'A5', 'A5', 'G5', 'F5', 'E5', 'D5', 'C5', 'B4', 'A4',
  'G4', 'C4', 'C4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5',
  'G5', 'A5', 'A5', 'A5', 'G5', 'F5', 'E5', 'D5', 'C5', 'B4',
];

export default function Game() {
  const [, setLocation] = useLocation();
  const { gameData, isLoaded, updateBestScore, updateSettings } = useGameStorage();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>({
    score: 0,
    perfectHits: 0,
    totalTouches: 0,
    gameOver: false,
    isPaused: false,
    stars: 0,
    precision: 0,
    bestScore: gameData.bestScore,
  });

  const tilesRef = useRef<Tile[]>([]);
  const particlesRef = useRef<ParticleEffect[]>([]);
  const gameLoopRef = useRef<number | null>(null);
  const lastSpawnRef = useRef<number>(0);
  const tileIdRef = useRef<number>(0);
  const particleIdRef = useRef<number>(0);
  const synth = useRef<Tone.PolySynth | null>(null);
  const pattern = useRef<Tone.Loop | null>(null);
  const errorSynth = useRef<Tone.Synth | null>(null);

  const [gameState, setGameState] = useState<GameState>(gameStateRef.current);
  const [musicVolume, setMusicVolume] = useState(gameData.musicVolume);
  const [effectsVolume, setEffectsVolume] = useState(gameData.effectsVolume);
  const [visualEffects, setVisualEffects] = useState(gameData.visualEffects);
  const [vibration, setVibration] = useState(gameData.vibration);
  const [fps, setFps] = useState(60);

  // Initialize Tone.js and synthesizers
  useEffect(() => {
    const initAudio = async () => {
      await Tone.start();

      // Main melody synthesizer
      synth.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: {
          attack: 0.005,
          decay: 0.1,
          sustain: 0,
          release: 0.1,
        },
      }).toDestination();

      synth.current.volume.value = -10 + (musicVolume / 100) * 5;

      // Error sound synthesizer
      errorSynth.current = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: {
          attack: 0.01,
          decay: 0.2,
          sustain: 0,
          release: 0.05,
        },
      }).toDestination();

      errorSynth.current.volume.value = -15 + (effectsVolume / 100) * 5;

      // Create the melody pattern
      pattern.current = new Tone.Loop((time) => {
        if (!gameStateRef.current.gameOver && !gameStateRef.current.isPaused) {
          const noteIndex = Math.floor((time * 1000) / SPAWN_INTERVAL) % MELODY_NOTES.length;
          synth.current?.triggerAttackRelease(MELODY_NOTES[noteIndex], '8n', time);
        }
      }, SPAWN_INTERVAL / 1000);

      pattern.current.start(0);
    };

    if (isLoaded) {
      initAudio();
    }

    return () => {
      pattern.current?.stop();
      synth.current?.dispose();
      errorSynth.current?.dispose();
    };
  }, [isLoaded, musicVolume, effectsVolume]);

  // Update volumes
  useEffect(() => {
    if (synth.current) {
      synth.current.volume.value = -10 + (musicVolume / 100) * 5;
    }
    if (errorSynth.current) {
      errorSynth.current.volume.value = -15 + (effectsVolume / 100) * 5;
    }
  }, [musicVolume, effectsVolume]);

  // Game loop with performance monitoring
  useEffect(() => {
    if (!canvasRef.current || !isLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameCount = 0;
    let lastTime = performance.now();

    const render = (timestamp: number) => {
      const state = gameStateRef.current;

      // Performance monitoring
      frameCount++;
      if (timestamp - lastTime > 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = timestamp;
      }

      if (!state.gameOver && !state.isPaused) {
        // Spawn new tiles
        if (timestamp - lastSpawnRef.current > SPAWN_INTERVAL) {
          const randomColumn = Math.floor(Math.random() * COLUMNS);
          tilesRef.current.push({
            id: tileIdRef.current++,
            column: randomColumn,
            y: -TILE_HEIGHT,
          });
          lastSpawnRef.current = timestamp;
        }

        // Update tiles with acceleration
        const fallSpeed = Math.min(
          INITIAL_FALL_SPEED + FALL_ACCELERATION * (timestamp / 1000),
          MAX_FALL_SPEED
        );

        tilesRef.current = tilesRef.current.filter((tile) => {
          tile.y += fallSpeed;
          if (tile.y > canvas.height) {
            state.gameOver = true;
            return false;
          }
          return true;
        });

        // Update particles
        particlesRef.current = particlesRef.current.filter((particle) => {
          particle.y += particle.vy;
          particle.vy += PARTICLE_GRAVITY;
          particle.life -= PARTICLE_FADE;
          return particle.life > 0;
        });
      }

      // Clear canvas
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw target line
      ctx.strokeStyle = 'rgba(255, 100, 0, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, TARGET_LINE_Y);
      ctx.lineTo(canvas.width, TARGET_LINE_Y);
      ctx.stroke();

      // Draw tiles
      const tileWidth = canvas.width / COLUMNS;
      tilesRef.current.forEach((tile) => {
        const x = tile.column * tileWidth;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x + 5, tile.y, tileWidth - 10, TILE_HEIGHT);
      });

      // Draw particles
      particlesRef.current.forEach((particle) => {
        ctx.fillStyle = particle.type === 'perfect'
          ? `rgba(255, 215, 0, ${particle.life})`
          : `rgba(0, 200, 255, ${particle.life})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw score
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Score: ${state.score}`, canvas.width / 2, 30);

      gameLoopRef.current = requestAnimationFrame(render);
    };

    gameLoopRef.current = requestAnimationFrame(render);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [isLoaded]);

  // Touch handling
  const handleCanvasTouch = useCallback((e: React.TouchEvent) => {
    if (!canvasRef.current) return;

    const state = gameStateRef.current;
    if (state.gameOver || state.isPaused) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const tileWidth = canvas.width / COLUMNS;

    Array.from(e.touches).forEach((touch) => {
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const touchedColumn = Math.floor(x / tileWidth);
      if (touchedColumn < 0 || touchedColumn >= COLUMNS) return;

      // Find closest tile in this column
      const tilesInColumn = tilesRef.current.filter((t) => t.column === touchedColumn);
      if (tilesInColumn.length === 0) return;

      const closestTile = tilesInColumn.reduce((prev, curr) =>
        Math.abs(curr.y - TARGET_LINE_Y) < Math.abs(prev.y - TARGET_LINE_Y) ? curr : prev
      );

      const distance = Math.abs(closestTile.y - TARGET_LINE_Y);

      if (distance < GOOD_DISTANCE) {
        state.totalTouches++;

        let isPerfect = false;
        if (distance < PERFECT_DISTANCE) {
          state.score += 10;
          state.perfectHits++;
          isPerfect = true;
        } else {
          state.score += 5;
        }

        // Create particle effect
        if (visualEffects) {
          const centerX = (touchedColumn + 0.5) * tileWidth;
          for (let i = 0; i < PARTICLE_COUNT; i++) {
            const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
            particlesRef.current.push({
              id: particleIdRef.current++,
              x: centerX,
              y: TARGET_LINE_Y,
              vx: Math.cos(angle) * 3,
              vy: Math.sin(angle) * 3,
              life: 1,
              type: isPerfect ? 'perfect' : 'good',
            });
          }
        }

        // Haptic feedback
        if (vibration) {
          Haptics.impact({ style: ImpactStyle.Medium });
        }

        // Remove the tile
        tilesRef.current = tilesRef.current.filter((t) => t.id !== closestTile.id);

        // Update precision
        state.precision = Math.round((state.perfectHits / state.totalTouches) * 100);

        // Calculate stars
        const scorePercentage = (state.score / 400) * 100;
        state.stars = scorePercentage >= 80 ? 3 : scorePercentage >= 50 ? 2 : 1;

        setGameState({ ...state });
      } else {
        // Play error sound
        if (errorSynth.current) {
          errorSynth.current.triggerAttackRelease('C2', '0.1');
        }
        state.gameOver = true;
        setGameState({ ...state });
      }
    });
  }, [visualEffects, vibration]);

  const togglePause = () => {
    const state = gameStateRef.current;
    state.isPaused = !state.isPaused;
    setGameState({ ...state });
  };

  const resetGame = async () => {
    // Save score if it's the best
    await updateBestScore(gameStateRef.current.score, gameStateRef.current.stars);

    gameStateRef.current = {
      score: 0,
      perfectHits: 0,
      totalTouches: 0,
      gameOver: false,
      isPaused: false,
      stars: 0,
      precision: 0,
      bestScore: gameData.bestScore,
    };
    tilesRef.current = [];
    particlesRef.current = [];
    lastSpawnRef.current = 0;
    setGameState({ ...gameStateRef.current });
  };

  const goHome = () => {
    setLocation('/');
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
        <p className="text-white text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-white">Pianew Tiles</h1>
          <div className="flex gap-2">
            <button
              onClick={togglePause}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
            >
              {gameState.isPaused ? (
                <Play className="w-5 h-5 text-white" />
              ) : (
                <Pause className="w-5 h-5 text-white" />
              )}
            </button>
            <button
              onClick={goHome}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
            >
              <HomeIcon className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* FPS Counter */}
        <div className="text-white text-xs mb-2 text-center opacity-75">
          FPS: {fps}
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={320}
          height={600}
          onTouchStart={handleCanvasTouch}
          className="w-full bg-white/90 rounded-lg shadow-lg cursor-pointer"
        />

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-white text-sm">
          <div className="bg-white/20 p-2 rounded">
            <p className="text-xs opacity-75">Perfect Hits</p>
            <p className="text-lg font-bold">{gameState.perfectHits}</p>
          </div>
          <div className="bg-white/20 p-2 rounded">
            <p className="text-xs opacity-75">Precision</p>
            <p className="text-lg font-bold">{gameState.precision}%</p>
          </div>
        </div>

        {/* Game Over Modal */}
        {gameState.gameOver && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full">
              <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
              <div className="mb-4">
                <p className="text-4xl font-bold text-center text-purple-600">
                  {gameState.score}
                </p>
                <p className="text-center text-gray-600 mt-2">
                  ⭐ {gameState.stars} Stars
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                <div>
                  <p className="text-gray-600">Total Touches</p>
                  <p className="font-bold">{gameState.totalTouches}</p>
                </div>
                <div>
                  <p className="text-gray-600">Precision</p>
                  <p className="font-bold">{gameState.precision}%</p>
                </div>
              </div>
              <div className="mb-4 p-3 bg-purple-100 rounded">
                <p className="text-gray-600 text-xs">Best Score</p>
                <p className="text-lg font-bold text-purple-600">{gameStateRef.current.bestScore}</p>
              </div>
              <button
                onClick={resetGame}
                className="w-full bg-purple-600 text-white py-2 rounded-lg font-bold hover:bg-purple-700 transition"
              >
                Play Again
              </button>
            </div>
          </div>
        )}

        {/* Settings */}
        <div className="mt-4 bg-white/20 rounded-lg p-4 text-white max-h-40 overflow-y-auto">
          <h3 className="font-bold mb-3">Settings</h3>
          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-2 text-sm mb-1">
                <Volume2 className="w-4 h-4" /> Music: {musicVolume}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={musicVolume}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMusicVolume(val);
                  updateSettings({ musicVolume: val });
                }}
                className="w-full"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm mb-1">
                <VolumeX className="w-4 h-4" /> Effects: {effectsVolume}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={effectsVolume}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setEffectsVolume(val);
                  updateSettings({ effectsVolume: val });
                }}
                className="w-full"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={visualEffects}
                onChange={(e) => {
                  setVisualEffects(e.target.checked);
                  updateSettings({ visualEffects: e.target.checked });
                }}
              />
              Visual Effects
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={vibration}
                onChange={(e) => {
                  setVibration(e.target.checked);
                  updateSettings({ vibration: e.target.checked });
                }}
              />
              Vibration
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
