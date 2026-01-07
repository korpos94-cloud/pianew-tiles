import { useEffect, useState } from 'react';
import { Preferences } from '@capacitor/preferences';

interface GameData {
  bestScore: number;
  bestStars: number;
  totalGamesPlayed: number;
  musicVolume: number;
  effectsVolume: number;
  visualEffects: boolean;
  vibration: boolean;
}

const DEFAULT_GAME_DATA: GameData = {
  bestScore: 0,
  bestStars: 0,
  totalGamesPlayed: 0,
  musicVolume: 50,
  effectsVolume: 50,
  visualEffects: true,
  vibration: true,
};

export function useGameStorage() {
  const [gameData, setGameData] = useState<GameData>(DEFAULT_GAME_DATA);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data from storage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await Preferences.get({ key: 'gameData' });
        if (result.value) {
          const data = JSON.parse(result.value);
          setGameData({ ...DEFAULT_GAME_DATA, ...data });
        }
      } catch (error) {
        console.error('Failed to load game data:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadData();
  }, []);

  // Save data to storage whenever it changes
  const saveGameData = async (data: Partial<GameData>) => {
    try {
      const updatedData = { ...gameData, ...data };
      await Preferences.set({
        key: 'gameData',
        value: JSON.stringify(updatedData),
      });
      setGameData(updatedData);
    } catch (error) {
      console.error('Failed to save game data:', error);
    }
  };

  const updateBestScore = async (score: number, stars: number) => {
    if (score > gameData.bestScore) {
      await saveGameData({
        bestScore: score,
        bestStars: stars,
        totalGamesPlayed: gameData.totalGamesPlayed + 1,
      });
    } else {
      await saveGameData({
        totalGamesPlayed: gameData.totalGamesPlayed + 1,
      });
    }
  };

  const updateSettings = async (settings: Partial<Omit<GameData, 'bestScore' | 'bestStars' | 'totalGamesPlayed'>>) => {
    await saveGameData(settings);
  };

  return {
    gameData,
    isLoaded,
    updateBestScore,
    updateSettings,
  };
}
