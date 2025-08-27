import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { getBannerAdId } from '../../config/adConfig';

interface BannerAdComponentProps {
  screenName: 'chat' | 'memos' | 'settings';
  style?: any;
}

const BannerAdComponent: React.FC<BannerAdComponentProps> = ({ screenName, style }) => {
  const adUnitId = getBannerAdId(screenName);

  console.log(`[${screenName}] BannerAdComponent rendered with adUnitId: ${adUnitId}`);

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          console.log(`[${screenName}] Banner Ad loaded successfully`);
        }}
        onAdFailedToLoad={(error) => {
          console.log(`[${screenName}] Banner Ad failed to load:`, error);
        }}
        onAdOpened={() => {
          console.log(`[${screenName}] Banner Ad opened`);
        }}
        onAdClosed={() => {
          console.log(`[${screenName}] Banner Ad closed`);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    marginBottom: 8,
    borderRadius: 8,
    marginHorizontal: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
});

export default BannerAdComponent;