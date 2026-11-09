import { ChatAvatar } from '@/components/ChatAvatar';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import { formatTime } from '@/utils/errors';
import { useListConversations } from '@workspace/api-client-react';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ConversationsScreen() {
  const colors = useColors();
  const { language, t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const conversationsQuery = useListConversations({
    query: { refetchInterval: 8000 },
  });

  const conversations = conversationsQuery.data ?? [];
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return conversations;
    return conversations.filter(
      (conversation) =>
        conversation.displayName.toLocaleLowerCase().includes(term) ||
        (conversation.email ?? '').toLocaleLowerCase().includes(term) ||
        (conversation.lastMessage ?? '').toLocaleLowerCase().includes(term),
    );
  }, [conversations, search]);
  const topInset = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomInset =
    Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topInset + 10, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.headingRow}>
          <View style={styles.brand}>
            <Image
              source={require('../../assets/images/icon.png')}
              style={styles.logo}
            />
            <View>
              <Text style={[styles.brandName, { color: colors.foreground }]}>
                Suhbat
              </Text>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                {t('messages')}
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable
              testID="new-chat-button"
              accessibilityRole="button"
              accessibilityLabel={t('newChat')}
              onPress={() => router.push('/new-chat')}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <Feather name="edit-3" size={20} color={colors.primary} />
            </Pressable>
            <Pressable
              testID="settings-button"
              accessibilityRole="button"
              accessibilityLabel={t('settings')}
              onPress={() => router.push('/settings')}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <Ionicons name="settings-outline" size={21} color={colors.foreground} />
            </Pressable>
          </View>
        </View>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="search" size={17} color={colors.mutedForeground} />
          <TextInput
            testID="chat-search-input"
            value={search}
            onChangeText={setSearch}
            placeholder={t('searchChats')}
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="search"
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {search ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('cancel')}
              onPress={() => setSearch('')}
              hitSlop={10}
            >
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {conversationsQuery.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : conversationsQuery.isError ? (
        <View style={styles.emptyState}>
          <Feather name="wifi-off" size={28} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {t('retry')}
          </Text>
          <Pressable
            testID="retry-conversations"
            onPress={() => conversationsQuery.refetch()}
            style={[styles.retryButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.retryText, { color: colors.primary }]}>
              {t('retry')}
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              testID={`conversation-${item.id}`}
              onPress={() =>
                router.push({
                  pathname: '/chat/[conversationId]',
                  params: {
                    conversationId: item.id,
                    displayName: item.displayName,
                    ...(item.email ? { email: item.email } : {}),
                    ...(item.userId ? { userId: item.userId } : {}),
                  },
                })
              }
              style={({ pressed }) => [
                styles.conversationRow,
                { borderBottomColor: colors.border },
                pressed && { backgroundColor: colors.secondary },
              ]}
            >
              <ChatAvatar name={item.displayName} />
              <View style={styles.conversationContent}>
                <View style={styles.conversationTopline}>
                  <Text
                    numberOfLines={1}
                    style={[styles.contactName, { color: colors.foreground }]}
                  >
                    {item.displayName}
                  </Text>
                  <Text style={[styles.time, { color: colors.mutedForeground }]}>
                    {item.lastMessageAt
                      ? formatTime(item.lastMessageAt, language)
                      : ''}
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.preview, { color: colors.mutedForeground }]}
                >
                  {item.lastMessage
                    ? `${item.lastMessageByMe ? t('youPrefix') : ''}${item.lastMessage}`
                    : item.type === 'group'
                      ? t('groupChat')
                      : item.email ?? ''}
                </Text>
              </View>
              <Feather name="chevron-right" size={17} color={colors.mutedForeground} />
            </Pressable>
          )}
          refreshing={conversationsQuery.isRefetching}
          onRefresh={() => conversationsQuery.refetch()}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomInset + 16 },
            filtered.length === 0 && styles.emptyList,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: colors.accent },
                ]}
              >
                <Ionicons
                  name={search ? 'search-outline' : 'chatbubbles-outline'}
                  size={26}
                  color={colors.accentForeground}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {search
                  ? t('noSearchMatches')
                  : conversations.length
                    ? t('noSearchMatches')
                    : t('noChats')}
              </Text>
              {!search && conversations.length === 0 ? (
                <Text
                  style={[
                    styles.emptySubtitle,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {t('noChatsHint')}
                </Text>
              ) : null}
              {!search && conversations.length === 0 ? (
                <Pressable
                  testID="start-first-chat"
                  onPress={() => router.push('/new-chat')}
                  style={({ pressed }) => [
                    styles.startButton,
                    { backgroundColor: colors.primary },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.startButtonText, { color: colors.primaryForeground }]}>
                    {t('startChat')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 42, height: 42, borderRadius: 15 },
  brandName: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.5 },
  sectionTitle: { fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: { flex: 1, height: 44, fontFamily: 'Inter_400Regular', fontSize: 14 },
  listContent: { paddingHorizontal: 18 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  conversationRow: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  conversationContent: { flex: 1, justifyContent: 'center', gap: 7 },
  conversationTopline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  contactName: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  time: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  preview: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 270,
  },
  startButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  startButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  retryButton: {
    minHeight: 42,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  retryText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});
