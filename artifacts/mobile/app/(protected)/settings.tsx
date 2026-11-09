import { ChatAvatar } from '@/components/ChatAvatar';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import { useClerk, useUser } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  getGetProfileQueryKey,
  useGetProfile,
  useUpdateProfile,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
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
  const queryClient = useQueryClient();
  const profileQuery = useGetProfile();
  const updateProfile = useUpdateProfile();
  const insets = useSafeAreaInsets();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [privacyError, setPrivacyError] = useState('');
  const topInset = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomInset =
    Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;
  const profileName =
    [
      typeof user?.unsafeMetadata.firstName === 'string'
        ? user.unsafeMetadata.firstName
        : user?.firstName,
      typeof user?.unsafeMetadata.lastName === 'string'
        ? user.unsafeMetadata.lastName
        : user?.lastName,
    ]
      .filter(Boolean)
      .join(' ') ||
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
    'Suhbat';
  const profile = profileQuery.data;

  const setPrivacy = async (
    field: 'isSearchable' | 'showLastSeen',
    value: boolean,
  ) => {
    if (!profile) return;
    setPrivacyError('');
    try {
      await updateProfile.mutateAsync({
        data: { ...profile, [field]: value },
      });
      await queryClient.invalidateQueries({
        queryKey: getGetProfileQueryKey(),
      });
    } catch {
      setPrivacyError(t('retry'));
    }
  };

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
          <Pressable
            testID="open-profile"
            accessibilityRole="button"
            onPress={() => router.push('/profile')}
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
            <Feather name="chevron-right" size={19} color={colors.mutedForeground} />
          </Pressable>

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

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            {t('privacy')}
          </Text>
          {profileQuery.isLoading ? (
            <View style={styles.privacyLoading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : profile ? (
            <>
              <View
                style={[
                  styles.settingRow,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.privacyCopy}>
                  <Text style={[styles.settingText, { color: colors.foreground }]}>
                    {t('searchable')}
                  </Text>
                  <Text style={[styles.privacyHint, { color: colors.mutedForeground }]}>
                    {t('searchableHint')}
                  </Text>
                </View>
                <Switch
                  testID="searchable-toggle"
                  value={profile.isSearchable}
                  onValueChange={(value) => void setPrivacy('isSearchable', value)}
                  disabled={updateProfile.isPending}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              </View>
              <View
                style={[
                  styles.settingRow,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.settingText, { color: colors.foreground }]}>
                  {t('showLastSeen')}
                </Text>
                <Switch
                  testID="last-seen-toggle"
                  value={profile.showLastSeen}
                  onValueChange={(value) => void setPrivacy('showLastSeen', value)}
                  disabled={updateProfile.isPending}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              </View>
            </>
          ) : (
            <Pressable
              testID="retry-settings-profile"
              onPress={() => profileQuery.refetch()}
              style={styles.retryButton}
            >
              <Text style={[styles.retryText, { color: colors.primary }]}>
                {t('retry')}
              </Text>
            </Pressable>
          )}
          {privacyError ? (
            <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>
              {privacyError}
            </Text>
          ) : null}

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
  privacyCopy: { flex: 1, gap: 4 },
  privacyHint: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  privacyLoading: { minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  retryButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  retryText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  error: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 6 },
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
