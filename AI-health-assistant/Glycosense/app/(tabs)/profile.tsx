import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppHeader } from '@/components/app-header';
import { DrawerMenu } from '@/components/drawer-menu';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';
import { apiFetch } from '@/lib/api';

type Metric = {
  metric_id: number;
  created_at?: string;
  timestamp?: number;
  weight_kg?: number;
  height_cm?: number;
};

export default function ProfileScreen() {
  const { user, token, loading, login, register, updateProfile, logout } = useAuth();
  const { mode } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [editMode, setEditMode] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [updating, setUpdating] = useState(false);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

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
      setEditMode(false);
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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access to change profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const loadMetrics = useCallback(async () => {
    if (!token) return;
    setLoadingMetrics(true);
    try {
      const data = await apiFetch<Metric[]>('/user-metrics', { token });
      const sorted = [...data].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
      setMetrics(sorted);
    } catch (err) {
      console.error('Failed to load metrics:', err);
    } finally {
      setLoadingMetrics(false);
    }
  }, [token]);

  useEffect(() => {
    if (token && user) {
      loadMetrics();
      prefill();
    }
  }, [token, user, loadMetrics]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {user && token && <AppHeader onMenuPress={() => setMenuOpen(true)} hideUsername />}
          {loading ? (
          <ActivityIndicator />
        ) : user && token ? (
          <>
            <View style={styles.header}>
              <Pressable onPress={pickImage} style={styles.avatarContainer}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarCircle}>
                    {user.name?.charAt(0) ? (
                      <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
                    ) : (
                      <MaterialCommunityIcons name="account-outline" size={34} color="#FFFFFF" />
                    )}
                  </View>
                )}
                <View style={styles.cameraIcon}>
                  <MaterialCommunityIcons name="camera-outline" size={16} color="#FFFFFF" style={styles.cameraText} />
                </View>
              </Pressable>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{metrics.length}</Text>
                <Text style={styles.statLabel}>Total Assessments</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {metrics[0]?.created_at
                    ? new Date(metrics[0].created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '—'}
                </Text>
                <Text style={styles.statLabel}>Last Assessment</Text>
              </View>
            </View>

            {editMode ? (
              <View style={styles.editCard}>
                <View style={styles.editHeader}>
                  <View style={styles.sectionTitleRow}>
                    <MaterialCommunityIcons name="pencil-outline" size={16} color={isDark ? '#E5E7EB' : '#1B4332'} />
                    <Text style={styles.sectionTitle}>Edit Profile</Text>
                  </View>
                  <Pressable onPress={() => setEditMode(false)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                </View>
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
            ) : (
              <>
                <View style={styles.infoSection}>
                  <View style={styles.infoHeader}>
                    <View style={styles.sectionTitleRow}>
                      <MaterialCommunityIcons name="clipboard-text-outline" size={16} color={isDark ? '#E5E7EB' : '#1B4332'} />
                      <Text style={styles.sectionTitle}>Personal Information</Text>
                    </View>
                    <Pressable onPress={() => setEditMode(true)} style={styles.editButton}>
                      <Text style={styles.editButtonText}>Edit</Text>
                    </Pressable>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Name</Text>
                    <Text style={styles.infoValue}>{user.name || '—'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{user.email || '—'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{user.phone_number || '—'}</Text>
                  </View>
                  {/* <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Member Since</Text>
                    <Text style={styles.infoValue}>
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                        : '—'}
                    </Text>
                  </View> */}
                </View>

                {metrics[0] && (
                  <View style={styles.infoSection}>
                    <View style={styles.sectionTitleRow}>
                      <MaterialCommunityIcons name="chart-line" size={16} color={isDark ? '#E5E7EB' : '#1B4332'} />
                      <Text style={styles.sectionTitle}>Health Metrics</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Recent Weight</Text>
                      <Text style={styles.infoValue}>{metrics[0].weight_kg ? `${metrics[0].weight_kg} kg` : '—'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Height</Text>
                      <Text style={styles.infoValue}>{metrics[0].height_cm ? `${metrics[0].height_cm} cm` : '—'}</Text>
                    </View>
                    {metrics[0].weight_kg && metrics[0].height_cm && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>BMI</Text>
                        <Text style={styles.infoValue}>
                          {(metrics[0].weight_kg / Math.pow(metrics[0].height_cm / 100, 2)).toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </>
            )}
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
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
    marginTop: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#0EA5A4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0EA5A4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    shadowColor: '#0EA5A4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0EA5A4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cameraText: {
    fontSize: 16,
  },
  avatarText: {
    fontSize: 42,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: isDark ? '#E5E7EB' : '#1B4332',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: isDark ? '#9CA3AF' : '#4F856A',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: isDark ? '#374151' : '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0EA5A4',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 12,
    color: isDark ? '#9CA3AF' : '#4F856A',
    textAlign: 'center',
  },
  infoSection: {
    backgroundColor: isDark ? '#374151' : '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editButton: {
    backgroundColor: '#0EA5A4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#4B5563' : '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: isDark ? '#9CA3AF' : '#4F856A',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#E5E7EB' : '#1B4332',
  },
  editCard: {
    backgroundColor: isDark ? '#374151' : '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cancelText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 14,
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
  formCard: {
    width: '100%',
    backgroundColor: isDark ? '#374151' : '#F8FFFB',
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: isDark ? '#4B5563' : '#CDEFD8',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
