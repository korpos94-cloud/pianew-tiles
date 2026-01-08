import { View, Text, StyleSheet, Image, Platform, Modal, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Container, Card, Input } from '@/components/ui';
import { colors, spacing, typography, shadows, borderRadius } from '@/constants/design';
import { useGameStore } from '@/hooks/useGameStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withSpring, withRepeat, withSequence } from 'react-native-reanimated';

export default function Home() {
  const router = useRouter();
  const { stats, user, login, logout, isLoading, updateSettings } = useGameStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const iconScale = useSharedValue(1);

  useEffect(() => {
    iconScale.value = withRepeat(
      withSequence(
        withSpring(1.1, { damping: 2, stiffness: 80 }),
        withSpring(1, { damping: 2, stiffness: 80 })
      ),
      -1,
      true
    );
  }, []);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.backgroundSecondary]}
        style={StyleSheet.absoluteFill}
      />
      
      <Container safeArea padding="lg" style={styles.content}>
        <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.header}>
          <Text style={styles.title}>Pianew Tiles</Text>
          <Text style={styles.subtitle}>Tap to the rhythm of the melody</Text>
        </Animated.View>

        <Animated.View 
          entering={FadeInUp.duration(800).delay(400)} 
          style={[styles.heroContainer, animatedIconStyle]}
        >
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.icon}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(600)} style={styles.statsContainer}>
          <Card variant="elevated" style={styles.statsCard}>
            <Card.Content>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Best Score</Text>
                  <Text style={styles.statValue}>{stats.bestScore}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Stars</Text>
                  <Text style={styles.statValue}>⭐ {stats.bestStars}</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(800)} style={styles.actions}>
          <Button
            variant="primary"
            size="lg"
            onPress={() => router.push('/game')}
            style={styles.playButton}
            leftIcon={<Ionicons name="play" size={24} color={colors.white} />}
          >
            Play Now
          </Button>

          <View style={styles.row}>
            <Button
              variant="outline"
              size="md"
              onPress={() => setIsSettingsOpen(true)}
              style={styles.flex1}
              leftIcon={<Ionicons name="settings-outline" size={20} color={colors.primary} />}
            >
              Settings
            </Button>

            {!user ? (
              <Button
                variant="outline"
                size="md"
                onPress={login}
                style={styles.flex1}
                leftIcon={<Ionicons name="logo-google" size={20} color={colors.primary} />}
              >
                Sign in
              </Button>
            ) : (
              <View style={styles.flex1}>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={logout}
                  style={styles.authButton}
                >
                  Sign Out ({user.displayName || user.email})
                </Button>
              </View>
            )}
          </View>
        </Animated.View>

        <Modal visible={isSettingsOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <Card.Header>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Settings</Text>
                  <TouchableOpacity onPress={() => setIsSettingsOpen(false)}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </Card.Header>
              <Card.Content>
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Vibration</Text>
                  <TouchableOpacity 
                    onPress={() => updateSettings({ vibration: !stats.vibration })}
                    style={[styles.toggle, stats.vibration && styles.toggleActive]}
                  >
                    <View style={[styles.toggleHandle, stats.vibration && styles.toggleHandleActive]} />
                  </TouchableOpacity>
                </View>

                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Visual Effects</Text>
                  <TouchableOpacity 
                    onPress={() => updateSettings({ visualEffects: !stats.visualEffects })}
                    style={[styles.toggle, stats.visualEffects && styles.toggleActive]}
                  >
                    <View style={[styles.toggleHandle, stats.visualEffects && styles.toggleHandleActive]} />
                  </TouchableOpacity>
                </View>

                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Music Volume</Text>
                  <Text style={styles.settingValue}>{stats.musicVolume}%</Text>
                </View>
              </Card.Content>
              <Card.Footer>
                <Button variant="primary" onPress={() => setIsSettingsOpen(false)} style={styles.wFull}>
                  Close
                </Button>
              </Card.Footer>
            </Card>
          </View>
        </Modal>

        <Text style={styles.footer}>
          Version 1.0.0 • Made with Blink
        </Text>
      </Container>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  title: {
    ...typography.display,
    color: colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  heroContainer: {
    marginVertical: spacing.xxl,
  },
  icon: {
    width: 160,
    height: 160,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  statsContainer: {
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  statsCard: {
    backgroundColor: colors.backgroundTertiary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  statValue: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.xs,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  actions: {
    width: '100%',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex1: {
    flex: 1,
  },
  wFull: {
    width: '100%',
  },
  playButton: {
    height: 64,
    borderRadius: borderRadius.xl,
  },
  authButton: {
    alignSelf: 'center',
  },
  footer: {
    ...typography.small,
    color: colors.textDisabled,
    marginBottom: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDarkMode,
  },
  settingLabel: {
    ...typography.body,
    color: colors.text,
  },
  settingValue: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.backgroundTertiary,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleHandle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  toggleHandleActive: {
    transform: [{ translateX: 22 }],
  },
});
