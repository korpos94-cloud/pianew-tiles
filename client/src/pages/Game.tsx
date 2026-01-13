import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { Home as HomeIcon } from 'lucide-react';
import { useLocation } from 'wouter';

interface Tile {
  id: number;
  column: number;
  y: number;
}

const COLUMNS = 4;
const TILE_HEIGHT = 80;
const SPAWN_INTERVAL = 700;
const INITIAL_FALL_SPEED = 3;
const TARGET_LINE_Y = 100;

const MELODY_NOTES = [
  'C4', 'C4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5',
  'A5', 'A5', 'A5', 'G5', 'F5', 'E5', 'D5', 'C5', 'B4', 'A4',
  'G4', 'C4', 'C4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5',
  'G5', 'A5', 'A5', 'A5', 'G5', 'F5', 'E5', 'D5', 'C5', 'B4',
];

export default function Game() {
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  const gameStateRef = useRef({
    tiles: [] as Tile[],
    score: 0,
    gameOver: false,
    lastSpawn: 0,
    tileId: 0,
    synth: null as Tone.PolySynth | null,
    pattern: null as Tone.Loop | null,
  });

  // Resize canvas to full width
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight - 150;
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Initialize audio ONLY after first user interaction
  const initAudio = async () => {
    if (audioReady) return;

    try {
      await Tone.start();

      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 },
      }).toDestination();

      synth.volume.value = -10;

      const pattern = new Tone.Loop((time) => {
        const state = gameStateRef.current;
        if (!state.gameOver) {
          const noteIndex = Math.floor((time * 1000) / SPAWN_INTERVAL) % MELODY_NOTES.length;
          synth.triggerAttackRelease(MELODY_NOTES[noteIndex], '8n', time);
        }
      }, SPAWN_INTERVAL / 1000);

      pattern.start(0);

      gameStateRef.current.synth = synth;
      gameStateRef.current.pattern = pattern;

      setAudioReady(true);
    } catch (err) {
      console.error('Audio init failed:', err);
      setAudioReady(true);
    }
  };

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const loop = (timestamp: number) => {
      const state = gameStateRef.current;

      // Spawn tiles
      if (timestamp - state.lastSpawn > SPAWN_INTERVAL && !state.gameOver) {
        const randomColumn = Math.floor(Math.random() * COLUMNS);
        state.tiles.push({
          id: state.tileId++,
          column: randomColumn,
          y: -TILE_HEIGHT,
        });
        state.lastSpawn = timestamp;
      }

      // Update tiles
      state.tiles = state.tiles.filter((tile) => {
        tile.y += INITIAL_FALL_SPEED;
        if (tile.y > canvas.height) {
          state.gameOver = true;
          setGameOver(true);
          return false;
        }
        return true;
      });

      // Draw background
      ctx.fillStyle = '#7c3aed';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw target line
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, TARGET_LINE_Y);
      ctx.lineTo(canvas.width, TARGET_LINE_Y);
      ctx.stroke();

      // Draw tiles
      const tileWidth = canvas.width / COLUMNS;
      ctx.fillStyle = 'white';
      state.tiles.forEach((tile) => {
        const x = tile.column * tileWidth;
        ctx.fillRect(x, tile.y, tileWidth, TILE_HEIGHT);
      });

      // Draw score
      ctx.fillStyle = 'white';
      ctx.font = '24px bold';
      ctx.fillText(`Score: ${state.score}`, 20, 40);

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Handle clicks
  const handleClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    await initAudio();

    if (!canvasRef.current || gameOver) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const tileWidth = canvasRef.current.width / COLUMNS;
    const clickedColumn = Math.floor(x / tileWidth);

    const state = gameStateRef.current;
    const closestTile = state.tiles
      .filter((t) => t.column === clickedColumn)
      .sort((a, b) => Math.abs(a.y - TARGET_LINE_Y) - Math.abs(b.y - TARGET_LINE_Y))[0];

    if (closestTile && Math.abs(closestTile.y - TARGET_LINE_Y) < 50) {
      state.tiles = state.tiles.filter((t) => t.id !== closestTile.id);
      state.score += 10;
      setScore(state.score);

      if ('vibrate' in navigator) navigator.vibrate(50);
    }
  };

  return (
    <div className="w-full h-screen bg-purple-600 flex flex-col">
      <div className="flex justify-between items-center p-4 bg-purple-700">
        <h1 className="text-white text-2xl font-bold">Pianew Tiles</h1>
        <button
          onClick={() => setLocation('/')}
          className="bg-white text-purple-600 p-2 rounded-lg hover:bg-gray-100"
        >
          <HomeIcon size={24} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          className="border-4 border-white rounded-lg cursor-pointer bg-purple-600"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      <div className="p-4 bg-purple-700 text-white text-center">
        <p className="text-lg font-bold">Score: {score}</p>
        {gameOver && <p className="text-red-300 text-xl font-bold">Game Over!</p>}
      </div>
    </div>
  );
}
