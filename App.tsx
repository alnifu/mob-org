import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { Provider as PaperProvider } from 'react-native-paper';
import { theme } from './src/theme/theme';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <AppNavigator />
          <StatusBar style="auto" />
        </SafeAreaView>
      </SafeAreaProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
