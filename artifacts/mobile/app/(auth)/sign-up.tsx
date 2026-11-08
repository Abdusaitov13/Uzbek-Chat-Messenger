import { LanguageToggle } from '@/components/LanguageToggle';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useSignUp } from '@clerk/expo';
import { type Href, Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function readableError(error: unknown, fallback: string) {
  return error && typeof error === 'object' && 'message' in error &&
    typeof error.message === 'string'
    ? error.message
    : fallback;
}

export default function SignUpScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signUp, fetchStatus } = useSignUp();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const isLoading = fetchStatus === 'fetching';

  const finishSignUp = async () => {
    await signUp.finalize({
      navigate: ({ session }) => {
        if (session?.currentTask) {
          setErrorMessage(t('accountNeedsAction'));
          return;
        }
        router.replace('/' as Href);
      },
    });
  };

  const handleSignUp = async () => {
    setErrorMessage('');
    try {
      const result = await signUp.password({
        emailAddress: emailAddress.trim(),
        password,
      });
      if (result.error) {
        setErrorMessage(result.error.message || t('retry'));
        return;
      }
      if (signUp.status === 'complete') {
        await finishSignUp();
        return;
      }
      const codeResult = await signUp.verifications.sendEmailCode();
      if (codeResult.error) {
        setErrorMessage(codeResult.error.message || t('retry'));
        return;
      }
      setIsVerifying(true);
    } catch (error) {
      setErrorMessage(readableError(error, t('retry')));
    }
  };

  const handleVerify = async () => {
    setErrorMessage('');
    try {
      const result = await signUp.verifications.verifyEmailCode({
        code: code.trim(),
      });
      if (result.error) {
        setErrorMessage(result.error.message || t('retry'));
        return;
      }
      if (signUp.status === 'complete') await finishSignUp();
    } catch (error) {
      setErrorMessage(readableError(error, t('retry')));
    }
  };

  const topInset = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomInset =
    Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topInset + 18,
          paddingBottom: bottomInset + 24,
        },
      ]}
      bottomOffset={64}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.logo}
          />
          <Text style={[styles.brandName, { color: colors.foreground }]}>
            Suhbat
          </Text>
        </View>
        <LanguageToggle />
      </View>

      <View style={styles.form}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {isVerifying ? t('verifyEmail') : t('createAccount')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {isVerifying ? t('codeSent') : t('authIntro')}
        </Text>

        {isVerifying ? (
          <>
            <Text style={[styles.label, { color: colors.foreground }]}>
              {t('verificationCode')}
            </Text>
            <TextInput
              testID="verification-code-input"
              value={code}
              onChangeText={setCode}
              placeholder="000000"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              maxLength={8}
              autoFocus
              style={[
                styles.input,
                styles.codeInput,
                {
                  color: colors.foreground,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            />
            <Pressable
              testID="verify-email-button"
              onPress={handleVerify}
              disabled={code.trim().length < 4 || isLoading}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: colors.primary },
                (code.trim().length < 4 || isLoading) && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>
                  {t('verify')}
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => {
                setErrorMessage('');
                signUp.verifications.sendEmailCode().then((result) => {
                  if (result.error) setErrorMessage(result.error.message || t('retry'));
                });
              }}
              disabled={isLoading}
              style={styles.textAction}
            >
              <Text style={[styles.link, { color: colors.primary }]}>
                {t('resendCode')}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={[styles.label, { color: colors.foreground }]}>
              {t('email')}
            </Text>
            <TextInput
              testID="email-input"
              value={emailAddress}
              onChangeText={setEmailAddress}
              placeholder={t('emailPlaceholder')}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            />
            <Text style={[styles.label, { color: colors.foreground }]}>
              {t('password')}
            </Text>
            <TextInput
              testID="password-input"
              value={password}
              onChangeText={setPassword}
              placeholder={t('passwordPlaceholder')}
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            />
            <Pressable
              testID="sign-up-button"
              onPress={handleSignUp}
              disabled={!emailAddress.trim() || password.length < 8 || isLoading}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: colors.primary },
                (!emailAddress.trim() || password.length < 8 || isLoading) &&
                  styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>
                  {t('signUp')}
                </Text>
              )}
            </Pressable>
            <View nativeID="clerk-captcha" style={styles.captcha} />
          </>
        )}

        {errorMessage ? (
          <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>
            {errorMessage}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            {t('hasAccount')}{' '}
          </Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable testID="go-to-sign-in">
              <Text style={[styles.link, { color: colors.primary }]}>
                {t('signIn')}
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 38, height: 38, borderRadius: 13 },
  brandName: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.4 },
  form: { flex: 1, justifyContent: 'center', paddingVertical: 38 },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 30,
    letterSpacing: -0.8,
    lineHeight: 38,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 30,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  codeInput: {
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 22,
    letterSpacing: 8,
  },
  primaryButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    marginTop: 24,
  },
  primaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  disabled: { opacity: 0.5 },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
  textAction: { alignSelf: 'center', padding: 14 },
  captcha: { minHeight: 1 },
  error: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  footerText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  link: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
});
