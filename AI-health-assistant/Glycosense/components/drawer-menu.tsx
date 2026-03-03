import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { Link } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/auth';

type DrawerMenuProps = {
  visible: boolean;
  onClose: () => void;
};

export function DrawerMenu({ visible, onClose }: DrawerMenuProps) {
  const { logout } = useAuth();

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.panel}>
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>

        <View style={styles.header}>
          <Image
            source={require('@/assets/images/glycosense-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Glycosense</Text>
          <Text style={styles.subtitle}>Health Monitoring</Text>
        </View>

        <View style={styles.divider} />

        <Link href="/(tabs)" asChild>
          <Pressable style={styles.option} onPress={onClose}>
            <MaterialCommunityIcons name="home-outline" size={22} color="#0F172A" style={styles.icon} />
            <Text style={styles.text}>Dashboard</Text>
          </Pressable>
        </Link>

        <Link href="/(tabs)/risk" asChild>
          <Pressable style={styles.option} onPress={onClose}>
            <MaterialCommunityIcons name="stethoscope" size={22} color="#0F172A" style={styles.icon} />
            <Text style={styles.text}>Risk Assessment</Text>
          </Pressable>
        </Link>

        <Link href="/(tabs)/metrics" asChild>
          <Pressable style={styles.option} onPress={onClose}>
            <MaterialCommunityIcons name="chart-line" size={22} color="#0F172A" style={styles.icon} />
            <Text style={styles.text}>My Metrics</Text>
          </Pressable>
        </Link>

        <Link href="/(tabs)/profile" asChild>
          <Pressable style={styles.option} onPress={onClose}>
            <MaterialCommunityIcons name="account-outline" size={22} color="#0F172A" style={styles.icon} />
            <Text style={styles.text}>Profile</Text>
          </Pressable>
        </Link>

        <View style={styles.divider} />

        <Pressable style={styles.logout} onPress={() => { logout(); onClose(); }}>
          <MaterialCommunityIcons name="logout" size={22} color="#991B1B" style={styles.icon} />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
      <Pressable style={styles.backdrop} onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    zIndex: 1000,
  },
  panel: {
    width: 280,
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F4F9F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 20,
    color: '#0F172A',
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0EA5A4',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F4F9F9',
  },
  icon: {
    fontSize: 22,
    marginRight: 14,
  },
  text: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    marginTop: 'auto',
  },
  logoutText: {
    fontSize: 16,
    color: '#991B1B',
    fontWeight: '600',
  },
});
