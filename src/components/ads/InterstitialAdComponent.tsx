import { useEffect } from 'react';
import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { getInterstitialAdId } from '../../config/adConfig';

class InterstitialAdManager {
  private static instance: InterstitialAdManager;
  private interstitialAd: InterstitialAd;
  private isLoaded = false;
  private isShowing = false;

  private constructor() {
    const adUnitId = getInterstitialAdId();
    this.interstitialAd = InterstitialAd.createForAdRequest(adUnitId);
    
    this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      console.log('InterstitialAd: Ad loaded successfully');
      this.isLoaded = true;
    });

    this.interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
      console.log('InterstitialAd: Failed to load ad:', error);
      this.isLoaded = false;
    });

    this.interstitialAd.addAdEventListener(AdEventType.OPENED, () => {
      console.log('InterstitialAd: Ad opened');
      this.isShowing = true;
    });

    this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('InterstitialAd: Ad closed, loading new ad');
      this.isShowing = false;
      this.isLoaded = false;
      // 광고가 닫힌 후 새로운 광고 로드
      this.loadAd();
    });

    // 초기 광고 로드
    this.loadAd();
  }

  public static getInstance(): InterstitialAdManager {
    if (!InterstitialAdManager.instance) {
      InterstitialAdManager.instance = new InterstitialAdManager();
    }
    return InterstitialAdManager.instance;
  }

  private loadAd() {
    if (!this.isLoaded && !this.isShowing) {
      console.log('InterstitialAd: Loading ad...');
      this.interstitialAd.load();
    }
  }

  public async showAd(): Promise<boolean> {
    if (this.isLoaded && !this.isShowing) {
      try {
        console.log('InterstitialAd: Showing ad...');
        await this.interstitialAd.show();
        return true;
      } catch (error) {
        console.log('InterstitialAd: Failed to show ad:', error);
        return false;
      }
    } else {
      console.log('InterstitialAd: Ad not ready to show. Loaded:', this.isLoaded, 'Showing:', this.isShowing);
      return false;
    }
  }

  public isAdReady(): boolean {
    return this.isLoaded && !this.isShowing;
  }
}

export const useInterstitialAd = () => {
  const adManager = InterstitialAdManager.getInstance();

  return {
    showInterstitialAd: () => adManager.showAd(),
    isInterstitialReady: () => adManager.isAdReady(),
  };
};

export default InterstitialAdManager;