import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

type Props = { name: string; color: string; size?: number };

export default function IconTile({ name, color, size = 32 }: Props) {
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size * 0.3, backgroundColor: color + '22' }]}>
      <Feather name={name as any} size={size * 0.44} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
});
