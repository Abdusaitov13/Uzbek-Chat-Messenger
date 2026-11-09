import { ChatAvatar } from '@/components/ChatAvatar';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import { calculateAge, isFutureBirthDate, isValidBirthDate } from '@/utils/profile';
import { getApiErrorMessage } from '@/utils/errors';
import {
  getGetProfileQueryKey,
  getListConversationsQueryKey,
  useGetProfile,
  useUpdateProfile,
} from '@workspace/api-client-react';
import { useUser } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const profileQuery = useGetProfile();
  const updateProfile = useUpdateProfile();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');

  const profile = profileQuery.data;
  const fullName = useMemo(
    () => [firstName, lastName].filter(Boolean).join(' ') || user?.fullName || '',
    [firstName, lastName, user?.fullName],
  );
  const topInset = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomInset =
    Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setDateOfBirth(profile.dateOfBirth ?? '');
    setUsername(profile.username ?? '');
    setBio(profile.bio ?? '');
  }, [profile]);

  const handleSave = async () => {
    setErrorMessage('');
    setNotice('');
    if (!firstName.trim() || !lastName.trim() || !dateOfBirth.trim()) {
      setErrorMessage(t('profileRequired'));
      return;
    }
    if (!isValidBirthDate(dateOfBirth.trim())) {
      setErrorMessage(t('invalidBirthDate'));
      return;
    }
    if (isFutureBirthDate(dateOfBirth.trim())) {
      setErrorMessage(t('futureBirthDate'));
      return;
    }
    if (!profile || !user) return;

    try {
      await user.updateMetadata({
        unsafeMetadata: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dateOfBirth: dateOfBirth.trim(),
        },
      });
      await user.reload();
      await updateProfile.mutateAsync({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dateOfBirth: dateOfBirth.trim(),
          username: username.trim().replace(/^@/, '') || null,
          bio: bio.trim() || null,
          isSearchable: profile.isSearchable,
          showLastSeen: profile.showLastSeen,
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() }),
        queryClient.invalidateQueries({
          queryKey: getListConversationsQueryKey(),
        }),
      ]);
      setNotice(t('profileSaved'));
    } catch (error) {
      const message = getApiErrorMessage(error, '');
      setErrorMessage(
        message === 'USERNAME_TAKEN'
          ? t('usernameTaken')
          : message.includes('Username')
            ? t('usernameRule')
            : t('retry'),
      );
    }
  };

  if (profileQuery.isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.destructive }]}>
          {t('retry')}
        </Text>
        <Pressable
          testID="retry-profile"
          onPress={() => profileQuery.refetch()}
          style={styles.retry}
        >
          <Text style={[styles.link, { color: colors.primary }]}>{t('retry')}</Text>
        </Pressable>
      </View>
    );
  }

  const age = profile.dateOfBirth ? calculateAge(profile.dateOfBirth) : null;
  const email = user?.primaryEmailAddress?.emailAddress ?? '';

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topInset + 18, paddingBottom: bottomInset + 24 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.heading, { color: colors.foreground }]}>
        {t('profile')}
      </Text>
      <View
        style={[
          styles.identityCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {user?.imageUrl ? (
          <Image source={{ uri: user.imageUrl }} style={styles.photo} />
        ) : (
          <ChatAvatar name={fullName} size={58} />
        )}
        <View style={styles.identityCopy}>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {fullName || email}
          </Text>
          <Text style={[styles.email, { color: colors.mutedForeground }]}>
            {email}
          </Text>
          {age !== null ? (
            <Text style={[styles.email, { color: colors.primary }]}>
              {t('age')}: {age} {t('years')}
            </Text>
          ) : null}
        </View>
      </View>

      <Text style={[styles.label, { color: colors.foreground }]}>{t('firstName')}</Text>
      <TextInput
        testID="edit-first-name"
        value={firstName}
        onChangeText={setFirstName}
        autoCapitalize="words"
        placeholder={t('firstName')}
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
      />
      <Text style={[styles.label, { color: colors.foreground }]}>{t('lastName')}</Text>
      <TextInput
        testID="edit-last-name"
        value={lastName}
        onChangeText={setLastName}
        autoCapitalize="words"
        placeholder={t('lastName')}
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
      />
      <Text style={[styles.label, { color: colors.foreground }]}>{t('dateOfBirth')}</Text>
      <TextInput
        testID="edit-birth-date"
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.mutedForeground}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
      />
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        {t('dateFormat')} · {t('profileHint')}
      </Text>
      <Text style={[styles.label, { color: colors.foreground }]}>{t('username')}</Text>
      <TextInput
        testID="edit-username"
        value={username}
        onChangeText={setUsername}
        placeholder="username"
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="none"
        maxLength={32}
        style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
      />
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        {t('usernameRule')}
      </Text>
      <Text style={[styles.label, { color: colors.foreground }]}>{t('bio')}</Text>
      <TextInput
        testID="edit-bio"
        value={bio}
        onChangeText={setBio}
        placeholder={t('bio')}
        placeholderTextColor={colors.mutedForeground}
        maxLength={180}
        multiline
        style={[
          styles.input,
          styles.bioInput,
          { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border },
        ]}
      />

      {errorMessage ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>
          {errorMessage}
        </Text>
      ) : notice ? (
        <Text accessibilityRole="status" style={[styles.notice, { color: colors.primary }]}>
          {notice}
        </Text>
      ) : null}
      <Pressable
        testID="save-profile-button"
        onPress={handleSave}
        disabled={updateProfile.isPending}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.primary },
          updateProfile.isPending && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        {updateProfile.isPending ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <>
            <Feather name="check" size={18} color={colors.primaryForeground} />
            <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
              {t('saveProfile')}
            </Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 20 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  heading: { fontFamily: 'Inter_700Bold', fontSize: 27, marginBottom: 18 },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  photo: { width: 58, height: 58, borderRadius: 22 },
  identityCopy: { flex: 1, gap: 5 },
  name: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  email: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginTop: 14, marginBottom: 7 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, fontFamily: 'Inter_400Regular', fontSize: 14 },
  bioInput: { minHeight: 90, paddingVertical: 12, textAlignVertical: 'top' },
  hint: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 6 },
  error: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19, marginTop: 12 },
  notice: { fontFamily: 'Inter_500Medium', fontSize: 13, marginTop: 12 },
  retry: { padding: 10 },
  link: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  button: { minHeight: 52, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 22 },
  buttonText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.85 },
});
