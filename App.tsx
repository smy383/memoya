import React, { useEffect, useState } from 'react';
import { StatusBar, View, Text } from 'react-native';
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
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const initializeApp = async () => {
      try {
        // i18n 초기화 (순차적으로)
        await initI18n();
        console.log('i18n initialized successfully');
        
        // AdMob 초기화 (실패해도 앱이 크래시되지 않도록)
        try {
          const adapterStatuses = await mobileAds().initialize();
          console.log('AdMob initialized successfully:', adapterStatuses);
        } catch (adMobError) {
          console.error('AdMob initialization failed (non-critical):', adMobError);
        }
        
        if (isMounted) {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('App initialization failed:', error);
        // 초기화 실패해도 앱은 계속 실행
        if (isMounted) {
          setIsInitialized(true);
        }
      }
    };

    initializeApp();

    return () => {
      isMounted = false;
    };
  }, []);

  // 초기화 완료 전까지 로딩 화면 표시
  if (!isInitialized) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
          <Text style={{ fontSize: 18, color: '#000000' }}>메모야</Text>
        </View>
      </SafeAreaProvider>
    );
  }

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
