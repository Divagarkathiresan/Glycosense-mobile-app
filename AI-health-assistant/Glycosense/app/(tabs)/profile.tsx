import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { AppHeader } from '@/components/app-header';
import { DrawerMenu } from '@/components/drawer-menu';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';

export default function ProfileScreen() {
  const { user, token, loading, login, register, updateProfile, logout } = useAuth();
  const { mode } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [updating, setUpdating] = useState(false);

  const isDark = mode === 'dark';
  const styles = useMemo(() => createStyles(isDark), [isDark]);

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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {user && token && <AppHeader onMenuPress={() => setMenuOpen(true)} />}
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
                placeholderTextColor={isDark ? '#9CA3AF' : '#4F856A'}
                style={styles.input}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              <TextInput
                placeholder="Email"
                placeholderTextColor={isDark ? '#9CA3AF' : '#4F856A'}
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                placeholder="Phone"
                placeholderTextColor={isDark ? '#9CA3AF' : '#4F856A'}
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
                <Text style={styles.title}>{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</Text>
                <Text style={styles.subtitle}>
                  {authMode === 'login'
                    ? 'Login to continue monitoring your health'
                    : 'Start your preventive health journey'}
                </Text>
              </View>

              <View style={styles.switchRow}>
                <Pressable
                  onPress={() => setAuthMode('login')}
                  style={[styles.switchButton, authMode === 'login' && styles.switchButtonActive]}>
                  <Text style={[styles.switchText, authMode === 'login' && styles.switchTextActive]}>
                    Login
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setAuthMode('register')}
                  style={[styles.switchButton, authMode === 'register' && styles.switchButtonActive]}>
                  <Text style={[styles.switchText, authMode === 'register' && styles.switchTextActive]}>
                    Register
                  </Text>
                </Pressable>
              </View>

              <View style={styles.formCard}>
                {authMode === 'register' ? (
                  <TextInput
                    placeholder="Full Name"
                    placeholderTextColor={isDark ? '#9CA3AF' : '#4F856A'}
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                ) : null}
                <TextInput
                  placeholder="Email"
                  placeholderTextColor={isDark ? '#9CA3AF' : '#4F856A'}
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {authMode === 'register' ? (
                  <TextInput
                    placeholder="Phone"
                    placeholderTextColor={isDark ? '#9CA3AF' : '#4F856A'}
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                ) : null}
                <TextInput
                  placeholder="Password"
                  placeholderTextColor={isDark ? '#9CA3AF' : '#4F856A'}
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                <Pressable
                  style={styles.primaryButton}
                  onPress={authMode === 'login' ? handleLogin : handleRegister}
                  disabled={updating}>
                  <Text style={styles.primaryButtonText}>
                    {updating ? 'Please wait...' : authMode === 'login' ? 'Login' : 'Create Account'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ImageBackground>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
      <DrawerMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </SafeAreaView>
  );
}

const createStyles = (isDark: boolean) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: isDark ? '#1F2937' : '#E9F7EF',
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
    backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(233, 247, 239, 0.9)',
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
    backgroundColor: isDark ? '#374151' : '#F8FFFB',
    borderWidth: 1,
    borderColor: isDark ? '#4B5563' : '#CDEFD8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 30,
    fontWeight: '700',
    color: isDark ? '#E5E7EB' : '#1B4332',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: isDark ? '#E5E7EB' : '#1B4332',
  },
  subtitle: {
    fontSize: 15,
    color: isDark ? '#9CA3AF' : '#4F856A',
    marginTop: 6,
    textAlign: 'center',
  },
  infoCard: {
    width: '100%',
    backgroundColor: isDark ? '#374151' : '#F8FFFB',
    padding: 18,
    borderRadius: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: isDark ? '#4B5563' : '#CDEFD8',
  },
  cardLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: isDark ? '#9CA3AF' : '#4F856A',
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '600',
    color: isDark ? '#E5E7EB' : '#1B4332',
    marginTop: 8,
  },
  cardHint: {
    color: isDark ? '#9CA3AF' : '#4F856A',
    marginTop: 4,
  },
  adminBadge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: isDark ? '#E5E7EB' : '#1B4332',
    color: isDark ? '#1B4332' : '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
  },
  formCard: {
    width: '100%',
    backgroundColor: isDark ? '#374151' : '#F8FFFB',
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: isDark ? '#4B5563' : '#CDEFD8',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#E5E7EB' : '#1B4332',
    marginBottom: 10,
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: isDark ? '#4B5563' : '#CDEFD8',
    paddingHorizontal: 16,
    backgroundColor: isDark ? '#1F2937' : '#F8FFFB',
    marginVertical: 10,
    color: isDark ? '#E5E7EB' : '#1B4332',
  },
  primaryButton: {
    height: 55,
    borderRadius: 30,
    backgroundColor: '#0EA5A4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#0EA5A4',
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
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#F5C2C2',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: '#991B1B',
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
    borderColor: isDark ? '#4B5563' : '#CDEFD8',
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: isDark ? '#1F2937' : '#F8FFFB',
  },
  switchButtonActive: {
    backgroundColor: '#0EA5A4',
    borderColor: '#0EA5A4',
  },
  switchText: {
    fontWeight: '600',
    color: isDark ? '#E5E7EB' : '#1B4332',
  },
  switchTextActive: {
    color: '#FFFFFF',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    backgroundColor: isDark ? '#1F2937' : '#E7F6EE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: isDark ? '#4B5563' : '#CDEFD8',
  },
  secondaryButtonText: {
    color: isDark ? '#E5E7EB' : '#1B4332',
    fontWeight: '600',
  },
});
