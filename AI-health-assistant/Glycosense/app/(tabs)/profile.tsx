import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/context/auth';

const COLORS = {
  background: '#E9F7EF',
  primary: '#1B4332',
  secondary: '#2D6A4F',
  textPrimary: '#1B4332',
  textSecondary: '#4F856A',
  inputBorder: '#CDEFD8',
  card: '#F8FFFB',
  error: '#8B1F1F',
  logoBg: '#CDEFD8',
  divider: '#CDEFD8',
};

export default function ProfileScreen() {
  const { user, token, loading, login, register, updateProfile, logout } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [updating, setUpdating] = useState(false);

  const handleLogin = async () => {
    try {
      setUpdating(true);
      await login(email, password);
      setPassword('');
    } catch (err: any) {
      Alert.alert('Login failed', err.message ?? 'Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleRegister = async () => {
    try {
      setUpdating(true);
      await register({ name, email, phone_number: phone, password });
      setPassword('');
    } catch (err: any) {
      Alert.alert('Registration failed', err.message ?? 'Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setUpdating(true);
      await updateProfile({ name, email, phone_number: phone });
      Alert.alert('Profile updated');
    } catch (err: any) {
      Alert.alert('Update failed', err.message ?? 'Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setEmail('');
    setPassword('');
    router.replace('/welcome');
  };

  const prefill = () => {
    if (!user) return;
    setName(user.name ?? '');
    setEmail(user.email ?? '');
    setPhone(user.phone_number ?? '');
  };

  return (
    <KeyboardAvoidingView
      style={styles.safeArea}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {loading ? (
          <ActivityIndicator />
        ) : user && token ? (
          <>
            <View style={styles.header}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoText}>+</Text>
              </View>
              <Text style={styles.title}>Profile</Text>
              <Text style={styles.subtitle}>Manage your health account details</Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.cardLabel}>Signed In</Text>
              <Text style={styles.cardValue}>{user.name}</Text>
              <Text style={styles.cardHint}>{user.email}</Text>
              <Text style={styles.cardHint}>Phone: {user.phone_number}</Text>
              {user.is_admin ? <Text style={styles.adminBadge}>Admin</Text> : null}
            </View>

            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Edit Profile</Text>
              <Pressable style={styles.secondaryButton} onPress={prefill}>
                <Text style={styles.secondaryButtonText}>Load Current Info</Text>
              </Pressable>
              <TextInput
                placeholder="Full Name"
                placeholderTextColor={COLORS.textSecondary}
                style={styles.input}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              <TextInput
                placeholder="Email"
                placeholderTextColor={COLORS.textSecondary}
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                placeholder="Phone"
                placeholderTextColor={COLORS.textSecondary}
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <Pressable style={styles.primaryButton} onPress={handleUpdate} disabled={updating}>
                <Text style={styles.primaryButtonText}>{updating ? 'Saving...' : 'Save Changes'}</Text>
              </Pressable>
            </View>

            <Pressable style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Log Out</Text>
            </Pressable>
          </>
        ) : (
          <ImageBackground
            source={require('../../assets/images/ai-doctor-bg.png')}
            style={styles.authBackground}
            imageStyle={styles.authBackgroundImage}
          >
            <View style={styles.authOverlay}>
              <View style={styles.header}>
                <View style={styles.logoCircle}>
                  <Text style={styles.logoText}>+</Text>
                </View>
                <Text style={styles.title}>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</Text>
                <Text style={styles.subtitle}>
                  {mode === 'login'
                    ? 'Login to continue monitoring your health'
                    : 'Start your preventive health journey'}
                </Text>
              </View>

              <View style={styles.switchRow}>
                <Pressable
                  onPress={() => setMode('login')}
                  style={[styles.switchButton, mode === 'login' && styles.switchButtonActive]}>
                  <Text style={[styles.switchText, mode === 'login' && styles.switchTextActive]}>
                    Login
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setMode('register')}
                  style={[styles.switchButton, mode === 'register' && styles.switchButtonActive]}>
                  <Text style={[styles.switchText, mode === 'register' && styles.switchTextActive]}>
                    Register
                  </Text>
                </Pressable>
              </View>

              <View style={styles.formCard}>
                {mode === 'register' ? (
                  <TextInput
                    placeholder="Full Name"
                    placeholderTextColor={COLORS.textSecondary}
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                ) : null}
                <TextInput
                  placeholder="Email"
                  placeholderTextColor={COLORS.textSecondary}
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {mode === 'register' ? (
                  <TextInput
                    placeholder="Phone"
                    placeholderTextColor={COLORS.textSecondary}
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                ) : null}
                <TextInput
                  placeholder="Password"
                  placeholderTextColor={COLORS.textSecondary}
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                <Pressable
                  style={styles.primaryButton}
                  onPress={mode === 'login' ? handleLogin : handleRegister}
                  disabled={updating}>
                  <Text style={styles.primaryButtonText}>
                    {updating ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ImageBackground>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 40,
    alignItems: 'center',
  },
  authBackground: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  authBackgroundImage: {
    resizeMode: 'cover',
  },
  authOverlay: {
    backgroundColor: 'rgba(233, 247, 239, 0.9)',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  infoCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    padding: 18,
    borderRadius: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  cardLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  cardHint: {
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  adminBadge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: COLORS.primary,
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
  },
  formCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: 16,
    backgroundColor: COLORS.card,
    marginVertical: 10,
    color: COLORS.textPrimary,
  },
  primaryButton: {
    height: 55,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logoutButton: {
    marginTop: 18,
    width: '100%',
    backgroundColor: '#FCEEEE',
    borderWidth: 1,
    borderColor: '#F5C2C2',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: '#8B1F1F',
    fontWeight: '600',
  },
  switchRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  switchButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: COLORS.card,
  },
  switchButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  switchText: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  switchTextActive: {
    color: '#FFFFFF',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#E7F6EE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  secondaryButtonText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
});
