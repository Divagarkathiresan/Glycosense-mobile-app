import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/theme';

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#374151' : '#FFFFFF',
        },
      ]}>
      <Text style={[styles.title, { color: isDark ? '#9CA3AF' : '#3B7C5B' }]}>{title}</Text>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  body: {
    gap: 14,
  },
});
