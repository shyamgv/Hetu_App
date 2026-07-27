import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../../store/auth.store';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

export const OfflineBanner: React.FC = () => {
  const isOffline = useAuthStore((s) => s.isOffline);

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline-outline" size={16} color="#FFF" style={styles.icon} />
      <Text style={styles.text}>Offline Mode — Viewing cached conversations</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#C53030', // Urgent red/maroon indicator
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
