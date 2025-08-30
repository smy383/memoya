import React, { useEffect, useState, useRef } from 'react';
import { StatusBar, View, Text, AppState } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import mobileAds from 'react-native-google-mobile-ads';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { initI18n } from './src/i18n';
import TabNavigator from './src/components/TabNavigator';
import { RootTabParamList } from './src/types';

const AppContent: React.FC = () => {
  const { theme, isDark } = useTheme();
  const navigationRef = useRef<NavigationContainerRef<RootTabParamList>>(null);

  // AppState 변경 시 설정 페이지 이동 확인
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active') {
        try {
          const shouldNavigateToSettings = await AsyncStorage.getItem('navigate_to_settings');
          if (shouldNavigateToSettings === 'true') {
            await AsyncStorage.removeItem('navigate_to_settings');
            // 약간의 지연 후 설정 페이지로 이동
            setTimeout(() => {
              if (navigationRef.current) {
                navigationRef.current.navigate('Settings');
              }
            }, 1000);
          }
        } catch (error) {
          console.error('Error checking navigation flag:', error);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // 앱 시작 시에도 확인
    handleAppStateChange('active');
    
    return () => subscription?.remove();
  }, []);

  return (
    <>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.surface}
      />
      <NavigationContainer ref={navigationRef}>
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
