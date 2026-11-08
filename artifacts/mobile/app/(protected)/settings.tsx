import { ChatAvatar } from '@/components/ChatAvatar';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import { useClerk, useUser } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const topInset = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomInset =
    Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;
  const profileName =
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
    'Suhbat';

  const handleSignOut = () => {
    const confirm = async () => {
      setIsSigningOut(true);
      try {
        await signOut();
        router.replace('/(auth)/sign-in');
      } finally {
        setIsSigningOut(false);
      }
    };

    if (Platform.OS === 'web') {
      void confirm();
    } else {
      Alert.alert(t('signOut'), t('signOutConfirm'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('signOut'), style: 'destructive', onPress: () => void confirm() },
      ]);
    }
  };

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.background,
          paddingTop: topInset + 8,
          paddingBottom: bottomInset + 20,
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          testID="back-button"
          accessibilityRole="button"
          accessibilityLabel={t('cancel')}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {t('settings')}
        </Text>
      </View>

      {!isLoaded ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          <View
            style={[
              styles.profileCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <ChatAvatar name={profileName} size={62} />
            <View style={styles.profileCopy}>
              <Text style={[styles.profileName, { color: colors.foreground }]}>
                {profileName}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>
                {user?.primaryEmailAddress?.emailAddress ?? ''}
              </Text>
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            {t('language')}
          </Text>
          <View
            style={[
              styles.settingRow,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.settingLabel}>
              <Feather name="globe" size={19} color={colors.primary} />
              <Text style={[styles.settingText, { color: colors.foreground }]}>
                {t('language')}
              </Text>
            </View>
            <LanguageToggle />
          </View>

          <Pressable
            testID="sign-out-button"
            onPress={handleSignOut}
            disabled={isSigningOut}
            style={({ pressed }) => [
              styles.signOutButton,
              { backgroundColor: colors.card, borderColor: colors.border },
              pressed && styles.pressed,
            ]}
          >
            {isSigningOut ? (
              <ActivityIndicator color={colors.destructive} />
            ) : (
              <>
                <Feather name="log-out" size={19} color={colors.destructive} />
                <Text style={[styles.signOutText, { color: colors.destructive }]}>
                  {t('signOut')}
                </Text>
              </>
            )}
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  header: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 42, height: 42, justifyContent: 'center' },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 17 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 20,
  },
  profileCopy: { flex: 1, gap: 5 },
  profileName: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  profileEmail: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  sectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.4,
    marginTop: 30,
    marginBottom: 10,
  },
  settingRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    borderWidth: 1,
    borderRadius: 17,
  },
  settingLabel: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingText: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  signOutButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 24,
    borderWidth: 1,
    borderRadius: 16,
  },
  signOutText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
});
