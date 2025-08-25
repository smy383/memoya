import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { initI18n } from './src/i18n';
import TabNavigator from './src/components/TabNavigator';

const AppContent: React.FC = () => {
  const { theme, isDark } = useTheme();

  return (
    <>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.surface}
      />
      <NavigationContainer>
        <TabNavigator />
      </NavigationContainer>
    </>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    initI18n();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;
