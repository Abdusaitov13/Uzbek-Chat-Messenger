import { ChatAvatar } from '@/components/ChatAvatar';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import { formatTime, getApiErrorMessage } from '@/utils/errors';
import {
  getListConversationsQueryKey,
  getListMessagesQueryKey,
  useListConversations,
  useListMessages,
  useSendMessage,
} from '@workspace/api-client-react';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatScreen() {
  const colors = useColors();
  const { language, t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { conversationId, displayName, email, userId } = useLocalSearchParams<{
    conversationId: string;
    displayName?: string;
    email?: string;
    userId?: string;
  }>();
  const [messageText, setMessageText] = useState('');
  const [sendError, setSendError] = useState('');
  const conversationsQuery = useListConversations({
    query: { refetchInterval: 12000 },
  });
  const messagesQuery = useListMessages(conversationId, {
    query: { enabled: Boolean(conversationId), refetchInterval: 3000 },
  });
  const sendMessage = useSendMessage();
  const conversation = conversationsQuery.data?.find(
    (item) => item.id === conversationId,
  );
  const contactName = useMemo(
    () =>
      conversation?.displayName ??
      displayName ??
      email?.split('@')[0] ??
      t('messages'),
    [conversation?.displayName, displayName, email, t],
  );
  const topInset = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomInset =
    Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;
  const messages = messagesQuery.data ?? [];

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || sendMessage.isPending) return;
    setSendError('');
    setMessageText('');
    try {
      await sendMessage.mutateAsync({
        conversationId,
        data: { text },
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getListMessagesQueryKey(conversationId),
        }),
        queryClient.invalidateQueries({
          queryKey: getListConversationsQueryKey(),
        }),
      ]);
    } catch (error) {
      setMessageText(text);
      setSendError(getApiErrorMessage(error, t('retry')));
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topInset + 6,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable
          testID="back-to-chats"
          accessibilityRole="button"
          accessibilityLabel={t('messages')}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <ChatAvatar name={contactName} size={42} />
        <View style={styles.contactCopy}>
          <Text numberOfLines={1} style={[styles.contactName, { color: colors.foreground }]}>
            {contactName}
          </Text>
          <Text numberOfLines={1} style={[styles.contactEmail, { color: colors.mutedForeground }]}>
            {conversation?.email ?? email ?? ''}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.chatBody}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {messagesQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : messagesQuery.isError ? (
          <View style={styles.loading}>
            <Text style={[styles.messageError, { color: colors.destructive }]}>
              {getApiErrorMessage(messagesQuery.error, t('retry'))}
            </Text>
            <Pressable
              testID="retry-messages"
              onPress={() => messagesQuery.refetch()}
              style={[styles.retryButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.retryText, { color: colors.primary }]}>
                {t('retry')}
              </Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            testID="message-list"
            data={messages}
            inverted
            keyExtractor={(item) => item.id}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.messageList}
            renderItem={({ item }) => {
              const mine = item.senderId === (user?.id ?? userId);
              return (
                <View
                  style={[
                    styles.messageRow,
                    { alignItems: mine ? 'flex-end' : 'flex-start' },
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      {
                        backgroundColor: mine ? colors.primary : colors.card,
                        borderColor: mine ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    {conversation?.type === 'group' && !mine ? (
                      <Text style={[styles.senderName, { color: colors.primary }]}>
                        {item.senderName}
                      </Text>
                    ) : null}
                    <Text
                      style={[
                        styles.messageText,
                        {
                          color: mine
                            ? colors.primaryForeground
                            : colors.cardForeground,
                        },
                      ]}
                    >
                      {item.text}
                    </Text>
                    <Text
                      style={[
                        styles.messageTime,
                        {
                          color: mine
                            ? colors.primaryForeground
                            : colors.mutedForeground,
                        },
                      ]}
                    >
                      {formatTime(item.createdAt, language)}
                    </Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.noMessages}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={28}
                  color={colors.mutedForeground}
                />
                <Text style={[styles.noMessagesText, { color: colors.mutedForeground }]}>
                  {t('noMessages')}
                </Text>
              </View>
            }
          />
        )}

        {sendError ? (
          <Text accessibilityRole="alert" style={[styles.sendError, { color: colors.destructive }]}>
            {sendError}
          </Text>
        ) : null}
        <View
          style={[
            styles.composerOuter,
            {
              borderTopColor: colors.border,
              paddingBottom: bottomInset + 8,
              backgroundColor: colors.background,
            },
          ]}
        >
          <View
            style={[
              styles.composer,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <TextInput
              testID="message-input"
              value={messageText}
              onChangeText={setMessageText}
              placeholder={t('messagePlaceholder')}
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={5000}
              blurOnSubmit={false}
              style={[styles.messageInput, { color: colors.foreground }]}
            />
            <Pressable
              testID="send-message-button"
              accessibilityRole="button"
              accessibilityLabel={t('send')}
              onPress={handleSend}
              disabled={!messageText.trim() || sendMessage.isPending}
              style={({ pressed }) => [
                styles.sendButton,
                { backgroundColor: colors.primary },
                (!messageText.trim() || sendMessage.isPending) && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              {sendMessage.isPending ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Ionicons name="arrow-up" size={22} color={colors.primaryForeground} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { width: 34, height: 44, justifyContent: 'center' },
  contactCopy: { flex: 1, gap: 4 },
  contactName: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  contactEmail: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  chatBody: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  messageList: { flexGrow: 1, paddingHorizontal: 16, paddingVertical: 14 },
  messageRow: { width: '100%', marginVertical: 4 },
  bubble: {
    maxWidth: '84%',
    paddingHorizontal: 13,
    paddingTop: 10,
    paddingBottom: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  messageText: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 21 },
  senderName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    marginBottom: 4,
  },
  messageTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  noMessages: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    transform: [{ scaleY: -1 }],
  },
  noMessagesText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  composerOuter: { paddingHorizontal: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  composer: {
    minHeight: 48,
    maxHeight: 132,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 5,
    paddingVertical: 5,
  },
  messageInput: {
    flex: 1,
    maxHeight: 116,
    minHeight: 38,
    paddingTop: 9,
    paddingBottom: 7,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendError: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  messageError: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center' },
  retryButton: {
    minHeight: 40,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginTop: 12,
  },
  retryText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});
