import { Platform } from 'react-native';

export const AD_CONFIG = {
  // App ID
  appId: 'ca-app-pub-3519978756490462~8148471148',
  
  // 테스트용 배너 ID (개발 중 사용)
  testBannerId: Platform.select({
    android: 'ca-app-pub-3940256099942544/6300978111',
    ios: 'ca-app-pub-3940256099942544/2934735716',
  }),
  
  // 실제 배너 광고 ID들
  bannerIds: {
    chat: 'ca-app-pub-3519978756490462/1982518046', // 채팅 화면 배너
    memos: 'ca-app-pub-3519978756490462/1982518046', // 메모 화면 배너  
    settings: 'ca-app-pub-3519978756490462/1982518046', // 설정 화면 배너
  },
  
  // 전면 광고 ID
  interstitialId: 'ca-app-pub-3519978756490462/4964190017',
  
  // 테스트용 전면 광고 ID
  testInterstitialId: Platform.select({
    android: 'ca-app-pub-3940256099942544/1033173712',
    ios: 'ca-app-pub-3940256099942544/4411468910',
  }),
  
  // 개발 모드 여부 (true: 테스트 광고, false: 실제 광고)
  isDevelopment: __DEV__,
};

export const getBannerAdId = (screenName: 'chat' | 'memos' | 'settings'): string => {
  if (AD_CONFIG.isDevelopment) {
    return AD_CONFIG.testBannerId!;
  }
  return AD_CONFIG.bannerIds[screenName];
};

export const getInterstitialAdId = (): string => {
  if (AD_CONFIG.isDevelopment) {
    return AD_CONFIG.testInterstitialId!;
  }
  return AD_CONFIG.interstitialId;
};