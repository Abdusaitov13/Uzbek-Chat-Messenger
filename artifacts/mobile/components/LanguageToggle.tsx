import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function LanguageToggle() {
  const colors = useColors();
  const { language, setLanguage } = useLanguage();

  return (
    <View
      style={[styles.track, { backgroundColor: colors.secondary }]}
      accessibilityRole="radiogroup"
      accessibilityLabel="Language"
    >
      {(['uz', 'ru'] as const).map((choice) => {
        const selected = language === choice;
        return (
          <Pressable
            key={choice}
            testID={`language-${choice}`}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => setLanguage(choice)}
            style={[
              styles.option,
              selected && { backgroundColor: colors.card },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: selected ? colors.foreground : colors.mutedForeground },
              ]}
            >
              {choice === 'uz' ? 'UZ' : 'RU'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: 14,
    gap: 2,
  },
  option: {
    minWidth: 42,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.4,
  },
});
