import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { isFutureBirthDate, isValidBirthDate } from '@/utils/profile';
import { useAuth, useUser } from '@clerk/expo';
import { Redirect, type Href, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CompleteProfileScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const { isLoaded, user } = useUser();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user || hasLoadedProfile) return;
    const metadata = user.unsafeMetadata;
    setFirstName(
      typeof metadata.firstName === 'string'
        ? metadata.firstName
        : user.firstName ?? '',
    );
    setLastName(
      typeof metadata.lastName === 'string'
        ? metadata.lastName
        : user.lastName ?? '',
    );
    setDateOfBirth(
      typeof metadata.dateOfBirth === 'string' ? metadata.dateOfBirth : '',
    );
    setHasLoadedProfile(true);
  }, [hasLoadedProfile, isLoaded, user]);

  const handleSave = async () => {
    setErrorMessage('');
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
    if (!user) return;

    setIsSaving(true);
    try {
      await user.updateMetadata({
        unsafeMetadata: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dateOfBirth: dateOfBirth.trim(),
        },
      });
      await user.reload();
      router.replace('/' as Href);
    } catch {
      setErrorMessage(t('retry'));
    } finally {
      setIsSaving(false);
    }
  };

  const topInset = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomInset =
    Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;

  if (!isLoaded) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!isSignedIn || !user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topInset + 24, paddingBottom: bottomInset + 24 },
      ]}
      bottomOffset={64}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.foreground }]}>
        {t('completeProfile')}
      </Text>
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        {t('profileHint')}
      </Text>

      <Text style={[styles.label, { color: colors.foreground }]}>{t('firstName')}</Text>
      <TextInput
        testID="profile-first-name"
        value={firstName}
        onChangeText={setFirstName}
        autoCapitalize="words"
        placeholder={t('firstName')}
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
      />
      <Text style={[styles.label, { color: colors.foreground }]}>{t('lastName')}</Text>
      <TextInput
        testID="profile-last-name"
        value={lastName}
        onChangeText={setLastName}
        autoCapitalize="words"
        placeholder={t('lastName')}
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
      />
      <Text style={[styles.label, { color: colors.foreground }]}>{t('dateOfBirth')}</Text>
      <TextInput
        testID="profile-birth-date"
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.mutedForeground}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
      />
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        {t('dateFormat')}
      </Text>

      {errorMessage ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>
          {errorMessage}
        </Text>
      ) : null}
      <Pressable
        testID="complete-profile-button"
        onPress={handleSave}
        disabled={isSaving}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.primary },
          isSaving && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        {isSaving ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
            {t('continue')}
          </Text>
        )}
      </Pressable>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 24, justifyContent: 'center' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, marginBottom: 8 },
  hint: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, marginBottom: 12 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginTop: 14, marginBottom: 7 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 15, paddingHorizontal: 15, fontFamily: 'Inter_400Regular', fontSize: 15 },
  error: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19, marginTop: 14 },
  button: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16, marginTop: 22 },
  buttonText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});
