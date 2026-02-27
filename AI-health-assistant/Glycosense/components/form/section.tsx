import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const styles = createStyles(colors, colorScheme === 'dark');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const createStyles = (colors: typeof Colors.light, isDark: boolean) => StyleSheet.create({
  container: {
    backgroundColor: isDark ? '#1f2937' : '#f9fafb',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
    color: colors.icon,
  },
  body: {
    gap: 14,
  },
});
