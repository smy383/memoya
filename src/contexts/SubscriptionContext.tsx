import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';
import Purchases, { 
  CustomerInfo, 
  PurchasesOffering, 
  PurchasesPackage,
  PURCHASES_ERROR_CODE 
} from 'react-native-purchases';

interface SubscriptionContextType {
  isPremium: boolean;
  subscriptionType: 'free' | 'monthly' | null;
  subscriptionEndDate: Date | null;
  isLoading: boolean;
  subscribeToPremium: () => Promise<boolean>;
  cancelSubscription: () => Promise<void>;
  restoreSubscription: () => Promise<boolean>;
  checkSubscriptionStatus: () => Promise<void>;
}

interface SubscriptionProviderProps {
  children: ReactNode;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const STORAGE_KEYS = {
  SUBSCRIPTION_TYPE: 'subscription_type',
  SUBSCRIPTION_END_DATE: 'subscription_end_date',
  IS_PREMIUM: 'is_premium',
  PURCHASE_TOKEN: 'purchase_token',
} as const;

// RevenueCat API 키들
const REVENUECAT_KEYS = {
  ios: 'appl_YOUR_IOS_API_KEY', 
  android: 'goog_POwgEGpLFCiaDaAtCdnEjMTCfVE'
};

// 구독 상품 식별자 - RevenueCat에서 설정한 entitlement identifier
const PREMIUM_ENTITLEMENT = 'premium';

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [subscriptionType, setSubscriptionType] = useState<'free' | 'monthly' | null>('free');
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);

  // 앱 시작시 RevenueCat 초기화 및 구독 상태 로드
  useEffect(() => {
    initializePurchases();
  }, []);

  const initializePurchases = async () => {
    try {
      setIsLoading(true);
      
      // RevenueCat 초기화
      const apiKey = Platform.OS === 'ios' ? REVENUECAT_KEYS.ios : REVENUECAT_KEYS.android;
      await Purchases.configure({ apiKey });
      
      console.log('RevenueCat initialized successfully');
      
      // 현재 사용자 정보 및 구독 상태 확인
      await checkCustomerInfo();
      
      // 사용 가능한 상품 정보 로드
      await loadOfferings();
      
    } catch (error) {
      console.error('RevenueCat initialization error:', error);
      // 초기화 실패시에도 앱은 계속 작동
      await loadSubscriptionStatus();
    } finally {
      setIsLoading(false);
    }
  };

  const checkCustomerInfo = async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      updateSubscriptionState(customerInfo);
    } catch (error) {
      console.error('Error getting customer info:', error);
    }
  };

  const loadOfferings = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current) {
        setCurrentOffering(offerings.current);
        console.log('Current offering loaded:', offerings.current.identifier);
      }
    } catch (error) {
      console.error('Error loading offerings:', error);
    }
  };

  const updateSubscriptionState = (customerInfo: CustomerInfo) => {
    const isPremiumActive = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] != null;
    setIsPremium(isPremiumActive);
    
    if (isPremiumActive) {
      setSubscriptionType('monthly');
      const expirationDate = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT].expirationDate;
      if (expirationDate) {
        setSubscriptionEndDate(new Date(expirationDate));
      }
    } else {
      setSubscriptionType('free');
      setSubscriptionEndDate(null);
    }

    // 로컬 저장소에도 저장
    saveSubscriptionStatus(isPremiumActive, isPremiumActive ? 'monthly' : 'free', 
      isPremiumActive && customerInfo.entitlements.active[PREMIUM_ENTITLEMENT].expirationDate 
        ? new Date(customerInfo.entitlements.active[PREMIUM_ENTITLEMENT].expirationDate) 
        : null
    );
  };

  const handlePurchaseSuccess = async (customerInfo: CustomerInfo) => {
    try {
      updateSubscriptionState(customerInfo);
      Alert.alert('구독 완료', '프리미엄 구독이 활성화되었습니다!');
    } catch (error) {
      console.error('Error handling purchase success:', error);
    }
  };

  const checkAndRestoreSubscription = async () => {
    try {
      // RevenueCat에서 자동으로 구독 상태 복원
      const customerInfo = await Purchases.getCustomerInfo();
      const isPremiumActive = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] != null;
      
      if (isPremiumActive) {
        console.log('Active subscription found, restoring...');
        updateSubscriptionState(customerInfo);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking/restoring subscription:', error);
      return false;
    }
  };

  const loadSubscriptionStatus = async () => {
    try {
      setIsLoading(true);
      
      const [storedIsPremium, storedType, storedEndDate] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.IS_PREMIUM),
        AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_TYPE),
        AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_END_DATE),
      ]);

      const premium = storedIsPremium === 'true';
      const type = (storedType as 'free' | 'monthly') || 'free';
      const endDate = storedEndDate ? new Date(storedEndDate) : null;

      // 구독 만료 확인
      if (premium && endDate && endDate <= new Date()) {
        // 구독이 만료됨
        await expireSubscription();
      } else {
        setIsPremium(premium);
        setSubscriptionType(type);
        setSubscriptionEndDate(endDate);
      }
    } catch (error) {
      console.error('구독 상태 로드 실패:', error);
      // 기본값으로 설정
      setIsPremium(false);
      setSubscriptionType('free');
      setSubscriptionEndDate(null);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSubscriptionStatus = async (premium: boolean, type: 'free' | 'monthly', endDate: Date | null) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.IS_PREMIUM, premium.toString()),
        AsyncStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_TYPE, type),
        endDate ? AsyncStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_END_DATE, endDate.toISOString()) : AsyncStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_END_DATE),
      ]);
    } catch (error) {
      console.error('구독 상태 저장 실패:', error);
    }
  };

  const expireSubscription = async () => {
    setIsPremium(false);
    setSubscriptionType('free');
    setSubscriptionEndDate(null);
    await saveSubscriptionStatus(false, 'free', null);
  };

  const subscribeToPremium = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      if (!currentOffering) {
        Alert.alert('구독 실패', '사용 가능한 구독 상품이 없습니다.');
        return false;
      }

      // 월간 구독 패키지 찾기 (첫 번째 패키지를 사용)
      const monthlyPackage = currentOffering.availablePackages[0];
      if (!monthlyPackage) {
        Alert.alert('구독 실패', '월간 구독 상품을 찾을 수 없습니다.');
        return false;
      }

      // RevenueCat으로 구독 구매
      const { customerInfo } = await Purchases.purchasePackage(monthlyPackage);
      
      console.log('Subscription purchased successfully');
      
      // 구매 성공 처리
      await handlePurchaseSuccess(customerInfo);
      return true;
      
    } catch (error: any) {
      console.error('구독 처리 실패:', error);
      
      if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED) {
        console.log('User cancelled subscription');
        return false;
      } else {
        Alert.alert('구독 실패', '구독 처리 중 문제가 발생했습니다.');
        return false;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const cancelSubscription = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Google Play 구독 취소는 Google Play 스토어에서만 가능
      Alert.alert(
        '구독 취소',
        'Google Play 스토어에서 구독을 취소할 수 있습니다.\n\n설정 → 구독 → Memoya를 선택하여 구독을 관리하세요.',
        [
          { text: '확인', style: 'default' }
        ]
      );
      
      // 로컬에서는 구독 정보만 제거
      await expireSubscription();
      
    } catch (error) {
      console.error('구독 취소 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const restoreSubscription = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      console.log('구독 복원 시도...');
      
      // RevenueCat에서 구독 복원
      const customerInfo = await Purchases.restorePurchases();
      const isPremiumActive = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] != null;
      
      if (isPremiumActive) {
        updateSubscriptionState(customerInfo);
        Alert.alert('복원 완료', '프리미엄 구독이 복원되었습니다!');
        return true;
      } else {
        Alert.alert('복원 실패', '활성 구독을 찾을 수 없습니다.');
        return false;
      }
    } catch (error) {
      console.error('구독 복원 실패:', error);
      Alert.alert('복원 오류', '구독 복원 중 문제가 발생했습니다.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const checkSubscriptionStatus = async (): Promise<void> => {
    await loadSubscriptionStatus();
  };

  const value: SubscriptionContextType = {
    isPremium,
    subscriptionType,
    subscriptionEndDate,
    isLoading,
    subscribeToPremium,
    cancelSubscription,
    restoreSubscription,
    checkSubscriptionStatus,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};