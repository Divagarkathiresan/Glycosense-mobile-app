import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Link } from 'expo-router';

import { useAuth } from '@/context/auth';

type MenuDrawerProps = {
  title?: string;
  subtitle?: string;
  rightContent?: React.ReactNode;
  containerStyle?: ViewStyle;
};

export function MenuDrawer({ title, subtitle, rightContent, containerStyle }: MenuDrawerProps) {
  const { user, token, logout } = useAuth();
  const [optionsOpen, setOptionsOpen] = useState(false);

  const isAuthed = useMemo(() => Boolean(user && token), [user, token]);
  const hasTitle = Boolean(title || subtitle);

  return (
    <>
      <View style={[styles.topBar, containerStyle]}>
        <Pressable
          style={styles.menuButton}
          onPress={() => setOptionsOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open navigation menu"
        >
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
        </Pressable>

        {hasTitle ? (
          <View style={styles.titleWrap}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        ) : null}

        {hasTitle ? (rightContent ?? <View style={styles.menuSpacer} />) : rightContent ?? null}
      </View>

      {optionsOpen ? (
        <View style={styles.optionsOverlay}>
          <View style={styles.optionsPanel}>
            <Pressable style={styles.closeButton} onPress={() => setOptionsOpen(false)}>
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>

            <View style={styles.drawerHeader}>
              <Image
                source={require('@/assets/images/glycosense-logo.png')}
                style={styles.drawerLogo}
                resizeMode="contain"
              />
              <Text style={styles.drawerTitle}>Glycosense</Text>
              <Text style={styles.drawerSubtitle}>Health Monitoring</Text>
            </View>

            <View style={styles.divider} />

            <Link href="/" asChild>
              <Pressable style={styles.optionButton} onPress={() => setOptionsOpen(false)}>
                <Text style={styles.optionIcon}>🏠</Text>
                <Text style={styles.optionText}>Dashboard</Text>
              </Pressable>
            </Link>

            <Link href="/(tabs)/risk" asChild>
              <Pressable style={styles.optionButton} onPress={() => setOptionsOpen(false)}>
                <Text style={styles.optionIcon}>🩺</Text>
                <Text style={styles.optionText}>Risk Assessment</Text>
              </Pressable>
            </Link>

            <Link href="/(tabs)/metrics" asChild>
              <Pressable style={styles.optionButton} onPress={() => setOptionsOpen(false)}>
                <Text style={styles.optionIcon}>📊</Text>
                <Text style={styles.optionText}>My Metrics</Text>
              </Pressable>
            </Link>

            <Link href="/(tabs)/profile" asChild>
              <Pressable style={styles.optionButton} onPress={() => setOptionsOpen(false)}>
                <Text style={styles.optionIcon}>👤</Text>
                <Text style={styles.optionText}>Profile</Text>
              </Pressable>
            </Link>

            <View style={styles.divider} />

            {isAuthed ? (
              <Pressable
                style={styles.logoutButton}
                onPress={() => {
                  logout();
                  setOptionsOpen(false);
                }}
              >
                <Text style={styles.logoutIcon}>🚪</Text>
                <Text style={styles.logoutText}>Logout</Text>
              </Pressable>
            ) : (
              <Link href="/welcome" asChild>
                <Pressable style={styles.loginButton} onPress={() => setOptionsOpen(false)}>
                  <Text style={styles.loginIcon}>🔐</Text>
                  <Text style={styles.loginText}>Sign In</Text>
                </Pressable>
              </Link>
            )}
          </View>
          <Pressable style={styles.optionsBackdrop} onPress={() => setOptionsOpen(false)} />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  title: {
    fontSize: 16,
    color: '#1B4332',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    color: '#3B7C5B',
  },
  menuSpacer: {
    width: 44,
    height: 44,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8FFFB',
    borderWidth: 1,
    borderColor: '#CDEFD8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  menuLine: {
    width: 20,
    height: 2,
    backgroundColor: '#1B4332',
    marginVertical: 2,
  },
  optionsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  optionsPanel: {
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
  optionsBackdrop: {
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
  drawerHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  drawerLogo: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  drawerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0EA5A4',
    marginBottom: 4,
  },
  drawerSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F4F9F9',
  },
  optionIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  optionText: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    marginTop: 'auto',
  },
  logoutIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  logoutText: {
    fontSize: 16,
    color: '#991B1B',
    fontWeight: '600',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#E7F6EE',
    marginTop: 'auto',
    borderWidth: 1,
    borderColor: '#CDEFD8',
  },
  loginIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  loginText: {
    fontSize: 16,
    color: '#1B4332',
    fontWeight: '600',
  },
});
