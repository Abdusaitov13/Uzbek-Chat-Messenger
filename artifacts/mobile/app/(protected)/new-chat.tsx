import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import { getApiErrorMessage } from '@/utils/errors';
import {
  getListConversationsQueryKey,
  useCreateConversation,
  useCreateGroup,
  useSearchContacts,
  type Contact,
} from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
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

export default function NewChatScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [groupTitle, setGroupTitle] = useState('');
  const [selected, setSelected] = useState<Contact[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const createConversation = useCreateConversation();
  const createGroup = useCreateGroup();
  const searchTerm = search.trim();
  const searchQuery = useSearchContacts(
    { query: searchTerm.length >= 2 ? searchTerm : '__' },
    {
      query: {
        enabled: searchTerm.length >= 2,
        staleTime: 20_000,
      },
    },
  );
  const isPending = createConversation.isPending || createGroup.isPending;
  const topInset = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomInset =
    Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;

  const selectedIds = useMemo(
    () => new Set(selected.map((contact) => contact.id)),
    [selected],
  );

  const toggleContact = (contact: Contact) => {
    setErrorMessage('');
    setSelected((current) =>
      current.some((item) => item.id === contact.id)
        ? current.filter((item) => item.id !== contact.id)
        : [...current, contact],
    );
  };

  const handleCreate = async () => {
    if (selected.length === 0 || isPending) return;
    setErrorMessage('');
    try {
      const conversation =
        selected.length === 1
          ? await createConversation.mutateAsync({
              data: { recipientEmail: selected[0]!.email },
            })
          : await createGroup.mutateAsync({
              data: {
                title: groupTitle.trim() || undefined,
                memberIds: selected.map((contact) => contact.id),
              },
            });
      await queryClient.invalidateQueries({
        queryKey: getListConversationsQueryKey(),
      });
      router.replace({
        pathname: '/chat/[conversationId]',
        params: {
          conversationId: conversation.id,
          displayName: conversation.displayName,
          ...(conversation.email ? { email: conversation.email } : {}),
          ...(conversation.userId ? { userId: conversation.userId } : {}),
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
          paddingBottom: bottomInset + 10,
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

      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        {t('recipientHint')}
      </Text>
      <View
        style={[
          styles.inputWrap,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Feather name="search" size={17} color={colors.mutedForeground} />
        <TextInput
          testID="contact-search-input"
          value={search}
          onChangeText={setSearch}
          placeholder={t('searchUsers')}
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          returnKeyType="search"
          style={[styles.input, { color: colors.foreground }]}
        />
      </View>

      {selected.length > 1 ? (
        <View style={styles.groupFields}>
          <Text style={[styles.selectionCount, { color: colors.primary }]}>
            {selected.length} {t('groupMembers')}
          </Text>
          <TextInput
            testID="group-title-input"
            value={groupTitle}
            onChangeText={setGroupTitle}
            placeholder={t('groupName')}
            placeholderTextColor={colors.mutedForeground}
            maxLength={100}
            style={[
              styles.input,
              styles.groupTitleInput,
              {
                color: colors.foreground,
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          />
        </View>
      ) : null}

      {searchTerm.length < 2 ? (
        <View style={styles.emptyState}>
          <Feather name="users" size={28} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {t('searchUsersHint')}
          </Text>
        </View>
      ) : searchQuery.isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : searchQuery.isError ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.destructive }]}>
            {getApiErrorMessage(searchQuery.error, t('retry'))}
          </Text>
          <Pressable onPress={() => searchQuery.refetch()} style={styles.retry}>
            <Text style={[styles.retryText, { color: colors.primary }]}>
              {t('retry')}
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          testID="contact-search-results"
          data={searchQuery.data ?? []}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.contactsList,
            (searchQuery.data?.length ?? 0) === 0 && styles.emptyList,
          ]}
          renderItem={({ item }) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <Pressable
                testID={`contact-${item.id}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                onPress={() => toggleContact(item)}
                style={({ pressed }) => [
                  styles.contactRow,
                  { borderBottomColor: colors.border },
                  pressed && { backgroundColor: colors.secondary },
                ]}
              >
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: isSelected ? colors.primary : colors.accent },
                  ]}
                >
                  <Text
                    style={[
                      styles.avatarText,
                      {
                        color: isSelected
                          ? colors.primaryForeground
                          : colors.accentForeground,
                      },
                    ]}
                  >
                    {item.displayName.trim().charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={styles.contactCopy}>
                  <Text
                    numberOfLines={1}
                    style={[styles.contactName, { color: colors.foreground }]}
                  >
                    {item.displayName}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.contactEmail, { color: colors.mutedForeground }]}
                  >
                    {item.username
                      ? `@${item.username} · ${item.email}`
                      : item.email}
                  </Text>
                </View>
                <Feather
                  name={isSelected ? 'check-circle' : 'circle'}
                  size={21}
                  color={isSelected ? colors.primary : colors.mutedForeground}
                />
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {t('noContacts')}
              </Text>
            </View>
          }
        />
      )}

      {errorMessage ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>
          {errorMessage}
        </Text>
      ) : null}
      <Pressable
        testID="create-conversation-button"
        onPress={handleCreate}
        disabled={selected.length === 0 || isPending}
        style={({ pressed }) => [
          styles.primaryButton,
          { backgroundColor: colors.primary },
          (selected.length === 0 || isPending) && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        {isPending ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>
            {selected.length > 1 ? t('startGroup') : t('continue')}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  header: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 42, height: 42, justifyContent: 'center' },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 17 },
  hint: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, marginBottom: 12 },
  inputWrap: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: { flex: 1, height: 50, fontFamily: 'Inter_400Regular', fontSize: 15 },
  groupFields: { marginTop: 12, gap: 8 },
  selectionCount: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  groupTitleInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  contactsList: { paddingTop: 10, paddingBottom: 12 },
  emptyList: { flexGrow: 1 },
  contactRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  contactCopy: { flex: 1, gap: 4 },
  contactName: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  contactEmail: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  emptyState: { flex: 1, minHeight: 170, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center' },
  retry: { padding: 8 },
  retryText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  error: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19, marginBottom: 8 },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    marginTop: 10,
  },
  primaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.83, transform: [{ scale: 0.985 }] },
});
