import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

/** Shared chrome so notches / home indicators never cover primary actions. */
export function Screen({ children, style }: Props) {
  return (
    <SafeAreaView style={[styles.root, style]} edges={['top', 'left', 'right', 'bottom']}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F4EF', paddingHorizontal: 20 },
});
