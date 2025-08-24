import AsyncStorage from '@react-native-async-storage/async-storage';

export type SubscriptionTier = 'free' | 'pro';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  expiresAt?: Date;
  isActive: boolean;
}

const SUBSCRIPTION_KEY = '@memoya_subscription';

export class SubscriptionService {
  static async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      const savedStatus = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
      if (savedStatus) {
        const status = JSON.parse(savedStatus);
        // Check if pro subscription is still valid
        if (status.tier === 'pro' && status.expiresAt) {
          const expiresAt = new Date(status.expiresAt);
          if (expiresAt < new Date()) {
            // Expired, revert to free
            return { tier: 'free', isActive: true };
          }
        }
        return {
          ...status,
          expiresAt: status.expiresAt ? new Date(status.expiresAt) : undefined,
        };
      }
      // Default to free tier
      return { tier: 'free', isActive: true };
    } catch (error) {
      console.error('Error getting subscription status:', error);
      return { tier: 'free', isActive: true };
    }
  }

  static async setSubscriptionStatus(status: SubscriptionStatus): Promise<void> {
    try {
      await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(status));
    } catch (error) {
      console.error('Error setting subscription status:', error);
      throw error;
    }
  }

  static async upgradeToPro(expiresAt?: Date): Promise<void> {
    try {
      const status: SubscriptionStatus = {
        tier: 'pro',
        expiresAt,
        isActive: true,
      };
      await this.setSubscriptionStatus(status);
    } catch (error) {
      console.error('Error upgrading to pro:', error);
      throw error;
    }
  }

  static async downgradeToFree(): Promise<void> {
    try {
      const status: SubscriptionStatus = {
        tier: 'free',
        isActive: true,
      };
      await this.setSubscriptionStatus(status);
    } catch (error) {
      console.error('Error downgrading to free:', error);
      throw error;
    }
  }

  static getContextLength(tier: SubscriptionTier): number {
    switch (tier) {
      case 'free':
        return 20;
      case 'pro':
        return 40;
      default:
        return 20;
    }
  }
}