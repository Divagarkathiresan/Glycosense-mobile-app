import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/auth';

export default function WelcomeScreen() {
  const { token, loading } = useAuth();

  useEffect(() => {
    if (!loading && token) {
      router.replace('/(tabs)');
    }
  }, [token, loading]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>+</Text>
          </View>
          <Text style={styles.appName}>Glycosense</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>+</Text>
        </View>
        
        <Text style={styles.appName}>Glycosense</Text>
        <Text style={styles.tagline}>Smart Preventive Health Monitoring</Text>
      </View>

      <View style={styles.bottomSection}>
        <Pressable style={styles.primaryButton} onPress={() => router.push('/login')}>
          <Text style={styles.buttonText}>Get Started</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F9F9',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  logoContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#0EA5A4',
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
  },
  bottomSection: {
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  primaryButton: {
    height: 55,
    borderRadius: 30,
    backgroundColor: '#0EA5A4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});