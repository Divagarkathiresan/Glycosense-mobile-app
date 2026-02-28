import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { router } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/auth';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { token, loading } = useAuth();

  useEffect(() => {
    if (!loading && !token) {
      router.replace('/welcome');
    }
  }, [token, loading]);

  if (loading) {
    return null;
  }

  if (!token) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: { display: 'none' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="risk"
        options={{
          title: 'Risk',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="waveform.path.ecg" color={color} />,
        }}
      />
      <Tabs.Screen
        name="metrics"
        options={{
          title: 'Metrics',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.xaxis" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.crop.circle" color={color} />,
        }}
      />
    </Tabs>
  );
}
