import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/theme';

type Option = { label: string; value: string };

type Props = {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
};

export function OptionGroup({ label, value, options, onChange }: Props) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: isDark ? '#9CA3AF' : '#3B7C5B' }]}>{label}</Text>
      <View style={styles.row}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={[
                styles.option,
                {
                  borderColor: active ? '#0EA5A4' : isDark ? '#4B5563' : '#CDEFD8',
                  backgroundColor: active ? '#0EA5A4' : isDark ? '#1F2937' : '#F8FFFB',
                },
              ]}>
              <Text style={[styles.optionText, { color: active ? '#fff' : isDark ? '#E5E7EB' : '#1B4332' }]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
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
  },
  optionText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
