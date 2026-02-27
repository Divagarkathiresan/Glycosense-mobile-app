import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

type Option = { label: string; value: string };

type Props = {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
};

export function OptionGroup({ label, value, options, onChange }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const styles = createStyles(colors, colorScheme === 'dark');

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={[styles.option, active && styles.optionActive]}>
              <Text style={[styles.optionText, active && styles.optionTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors: typeof Colors.light, isDark: boolean) => StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: isDark ? '#374151' : '#e5e7eb',
    backgroundColor: isDark ? '#1f2937' : '#fff',
  },
  optionActive: {
    backgroundColor: colors.tint,
    borderColor: colors.tint,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  optionTextActive: {
    color: '#fff',
  },
});
