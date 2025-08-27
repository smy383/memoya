import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import mobileAds from 'react-native-google-mobile-ads';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
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
    
    // AdMob 초기화
    mobileAds()
      .initialize()
      .then(adapterStatuses => {
        console.log('AdMob initialized successfully:', adapterStatuses);
      })
      .catch(error => {
        console.error('AdMob initialization failed:', error);
      });
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SubscriptionProvider>
          <AppContent />
        </SubscriptionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;
