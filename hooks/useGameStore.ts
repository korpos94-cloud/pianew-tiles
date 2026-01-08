import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blink } from '@/lib/blink';
import { useEffect, useState } from 'react';

export interface GameStats {
  id: string;
  userId: string;
  bestScore: number;
  bestStars: number;
  totalGamesPlayed: number;
  musicVolume: number;
  effectsVolume: number;
  visualEffects: boolean;
  vibration: boolean;
}

const DEFAULT_STATS: GameStats = {
  id: '',
  userId: '',
  bestScore: 0,
  bestStars: 0,
  totalGamesPlayed: 0,
  musicVolume: 50,
  effectsVolume: 50,
  visualEffects: true,
  vibration: true,
};

export function useGameStore() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
    });
    return unsubscribe;
  }, []);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['gameStats', user?.id],
    queryFn: async () => {
      if (!user) return DEFAULT_STATS;
      
      const list = await blink.db.gameStats.list({
        where: { userId: user.id },
        limit: 1,
      });

      if (list.length === 0) {
        const newStats = await blink.db.gameStats.create({
          userId: user.id,
          ...DEFAULT_STATS,
        });
        return {
          ...newStats,
          visualEffects: Number(newStats.visualEffects) > 0,
          vibration: Number(newStats.vibration) > 0,
        } as GameStats;
      }

      const s = list[0];
      return {
        ...s,
        visualEffects: Number(s.visualEffects) > 0,
        vibration: Number(s.vibration) > 0,
      } as GameStats;
    },
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: async (updates: Partial<GameStats>) => {
      if (!user || !stats?.id) return;

      const dbUpdates: any = { ...updates };
      if (updates.visualEffects !== undefined) dbUpdates.visualEffects = updates.visualEffects ? '1' : '0';
      if (updates.vibration !== undefined) dbUpdates.vibration = updates.vibration ? '1' : '0';

      return await blink.db.gameStats.update(stats.id, dbUpdates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameStats', user?.id] });
    },
  });

  const updateBestScore = async (score: number, stars: number) => {
    if (!stats) return;
    
    const updates: Partial<GameStats> = {
      totalGamesPlayed: (stats.totalGamesPlayed || 0) + 1,
    };

    if (score > stats.bestScore) {
      updates.bestScore = score;
      updates.bestStars = stars;
    }

    mutation.mutate(updates);
  };

  const updateSettings = (settings: Partial<Pick<GameStats, 'musicVolume' | 'effectsVolume' | 'visualEffects' | 'vibration'>>) => {
    mutation.mutate(settings);
  };

  return {
    stats: stats || DEFAULT_STATS,
    isLoading,
    user,
    updateBestScore,
    updateSettings,
    login: () => blink.auth.login(),
    logout: () => blink.auth.signOut(),
  };
}
