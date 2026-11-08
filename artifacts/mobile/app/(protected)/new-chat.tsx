import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import { getApiErrorMessage } from '@/utils/errors';
import {
  getListConversationsQueryKey,
  useCreateConversation,
} from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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

export default function NewChatScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const createConversation = useCreateConversation();
  const topInset = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomInset =
    Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;

  const handleCreate = async () => {
    setErrorMessage('');
    try {
      const conversation = await createConversation.mutateAsync({
        data: { recipientEmail: email.trim() },
      });
      await queryClient.invalidateQueries({
        queryKey: getListConversationsQueryKey(),
      });
      router.replace({
        pathname: '/chat/[conversationId]',
        params: {
          conversationId: conversation.id,
          displayName: conversation.displayName,
          email: conversation.email,
          userId: conversation.userId,
        },
      });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, t('retry')));
    }
  };

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.background,
          paddingTop: topInset + 8,
          paddingBottom: bottomInset + 14,
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
          {t('newChat')}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: colors.accent }]}>
          <Feather name="send" size={24} color={colors.accentForeground} />
        </View>
        <Text style={[styles.heading, { color: colors.foreground }]}>
          {t('startChat')}
        </Text>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          {t('recipientHint')}
        </Text>
        <Text style={[styles.label, { color: colors.foreground }]}>
          {t('recipientEmail')}
        </Text>
        <View
          style={[
            styles.inputWrap,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="at-sign" size={17} color={colors.mutedForeground} />
          <TextInput
            testID="recipient-email-input"
            value={email}
            onChangeText={setEmail}
            placeholder={t('emailPlaceholder')}
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="go"
            onSubmitEditing={handleCreate}
            style={[styles.input, { color: colors.foreground }]}
          />
        </View>
        {errorMessage ? (
          <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>
            {errorMessage}
          </Text>
        ) : null}
        <Pressable
          testID="create-conversation-button"
          onPress={handleCreate}
          disabled={!email.trim() || createConversation.isPending}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: colors.primary },
            (!email.trim() || createConversation.isPending) && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          {createConversation.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>
              {t('continue')}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  header: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 42, height: 42, justifyContent: 'center' },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 17 },
  content: { flex: 1, justifyContent: 'center', paddingBottom: 40 },
  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heading: { fontFamily: 'Inter_700Bold', fontSize: 25, letterSpacing: -0.5 },
  hint: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, marginTop: 8 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginTop: 28, marginBottom: 8 },
  inputWrap: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: { flex: 1, height: 52, fontFamily: 'Inter_400Regular', fontSize: 15 },
  error: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19, marginTop: 12 },
  primaryButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    marginTop: 18,
  },
  primaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.83, transform: [{ scale: 0.985 }] },
});
