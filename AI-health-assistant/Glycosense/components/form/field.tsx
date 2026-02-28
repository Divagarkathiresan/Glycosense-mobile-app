import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/context/theme';

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
};

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry,
}: Props) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: isDark ? '#9CA3AF' : '#3B7C5B' }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isDark ? '#6B7280' : '#4F856A'}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        style={[
          styles.input,
          {
            backgroundColor: isDark ? '#1F2937' : '#F8FFFB',
            borderColor: isDark ? '#4B5563' : '#CDEFD8',
            color: isDark ? '#E5E7EB' : '#1B4332',
          },
        ]}
        autoCapitalize="none"
      />
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
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
});
