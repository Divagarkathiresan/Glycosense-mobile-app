import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { useAuth } from '@/context/auth';

type HeaderProps = {
  onMenuPress: () => void;
};

export function AppHeader({ onMenuPress }: HeaderProps) {
  const { user } = useAuth();

  return (
    <View style={styles.topBar}>
      <Pressable style={styles.menuButton} onPress={onMenuPress}>
        <View style={styles.menuLine} />
        <View style={styles.menuLine} />
        <View style={styles.menuLine} />
      </Pressable>
      <View style={styles.userBadge}>
        <View style={styles.avatarCircle} />
        <Text style={styles.userName}>{user?.name ?? 'Guest'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FFFB',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#CDEFD8',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#CDEFD8',
    marginRight: 8,
  },
  userName: {
    fontSize: 14,
    color: '#1B4332',
    fontWeight: '600',
  },
});
