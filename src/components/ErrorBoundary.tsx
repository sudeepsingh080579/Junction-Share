import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Screen } from './Screen';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Screen>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          Restart JunctionShare. If this keeps happening, email hello@rydio.app.
        </Text>
        <Pressable
          style={styles.btn}
          onPress={() => this.setState({ error: null })}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Text style={styles.btnText}>Try again</Text>
        </Pressable>
      </Screen>
    );
  }
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', color: '#1C2A1F', marginTop: 12, marginBottom: 12 },
  body: { color: '#5A655C', lineHeight: 22 },
  btn: {
    marginTop: 24,
    backgroundColor: '#2F6F4E',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
});
