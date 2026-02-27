import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

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
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const styles = createStyles(colors, colorScheme === 'dark');

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.icon}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        style={styles.input}
        autoCapitalize="none"
      />
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
  input: {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderColor: isDark ? '#374151' : '#e5e7eb',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
});
