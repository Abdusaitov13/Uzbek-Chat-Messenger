import { useColors } from '@/hooks/useColors';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function ChatAvatar({
  name,
  size = 54,
}: {
  name: string;
  size?: number;
}) {
  const colors = useColors();
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase())
    .join('');
  const useAccent = (name.codePointAt(0) ?? 0) % 2 === 0;

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: useAccent ? colors.accent : colors.primary,
        },
      ]}
    >
      <Text
        style={[
          styles.initials,
          { color: useAccent ? colors.accentForeground : colors.primaryForeground },
          { fontSize: Math.max(14, size * 0.28) },
        ]}
      >
        {initials || '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: 'Inter_600SemiBold',
  },
});
