import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SubscriptionContextType {
  isPremium: boolean;
  subscriptionType: 'free' | 'monthly' | 'yearly' | null;
  subscriptionEndDate: Date | null;
  isLoading: boolean;
  subscribeToPremium: (type: 'monthly' | 'yearly') => Promise<boolean>;
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
} as const;

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [subscriptionType, setSubscriptionType] = useState<'free' | 'monthly' | 'yearly' | null>('free');
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 앱 시작시 구독 상태 로드
  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  const loadSubscriptionStatus = async () => {
    try {
      setIsLoading(true);
      
      const [storedIsPremium, storedType, storedEndDate] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.IS_PREMIUM),
        AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_TYPE),
        AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_END_DATE),
      ]);

      const premium = storedIsPremium === 'true';
      const type = (storedType as 'free' | 'monthly' | 'yearly') || 'free';
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

  const saveSubscriptionStatus = async (premium: boolean, type: 'free' | 'monthly' | 'yearly', endDate: Date | null) => {
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

  const subscribeToPremium = async (type: 'monthly' | 'yearly'): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // TODO: 실제 결제 처리 로직 구현
      // 현재는 테스트용으로 즉시 구독 활성화
      const now = new Date();
      const endDate = new Date(now);
      
      if (type === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      setIsPremium(true);
      setSubscriptionType(type);
      setSubscriptionEndDate(endDate);
      
      await saveSubscriptionStatus(true, type, endDate);
      
      console.log(`프리미엄 구독 활성화: ${type}, 만료일: ${endDate.toISOString()}`);
      return true;
    } catch (error) {
      console.error('구독 처리 실패:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const cancelSubscription = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // TODO: 실제 구독 취소 처리 로직 구현
      await expireSubscription();
      
      console.log('구독이 취소되었습니다.');
    } catch (error) {
      console.error('구독 취소 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const restoreSubscription = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // TODO: 실제 구독 복원 로직 구현
      // 현재는 테스트용으로 항상 false 반환
      console.log('구독 복원 시도...');
      return false;
    } catch (error) {
      console.error('구독 복원 실패:', error);
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