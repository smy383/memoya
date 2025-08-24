import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message } from '../types/message';

export interface MonthlyMessages {
  month: string; // Format: 'YYYY-MM'
  messages: Message[];
}

export class StorageServiceV2 {
  private static getMonthKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `@memoya_messages_${year}-${month}`;
  }

  private static getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private static getPreviousMonth(monthKey: string): string {
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() - 1);
    const prevYear = date.getFullYear();
    const prevMonth = String(date.getMonth() + 1).padStart(2, '0');
    return `${prevYear}-${prevMonth}`;
  }

  static async getMessagesForMonth(monthKey: string): Promise<Message[]> {
    try {
      const storageKey = `@memoya_messages_${monthKey}`;
      const jsonMessages = await AsyncStorage.getItem(storageKey);
      if (jsonMessages) {
        const messages = JSON.parse(jsonMessages);
        return messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
      }
      return [];
    } catch (error) {
      console.error(`Error getting messages for ${monthKey}:`, error);
      return [];
    }
  }

  static async getCurrentMonthMessages(): Promise<Message[]> {
    const currentMonth = this.getCurrentMonth();
    return this.getMessagesForMonth(currentMonth);
  }

  static async addMessage(message: Message): Promise<void> {
    try {
      const monthKey = this.getCurrentMonth();
      const messages = await this.getMessagesForMonth(monthKey);
      messages.push(message);
      
      const storageKey = `@memoya_messages_${monthKey}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  static async updateMessage(messageId: string, updates: Partial<Message>): Promise<void> {
    try {
      // Try current month first
      const currentMonth = this.getCurrentMonth();
      let messages = await this.getMessagesForMonth(currentMonth);
      let messageIndex = messages.findIndex(msg => msg.id === messageId);
      
      if (messageIndex !== -1) {
        messages[messageIndex] = { ...messages[messageIndex], ...updates };
        const storageKey = `@memoya_messages_${currentMonth}`;
        await AsyncStorage.setItem(storageKey, JSON.stringify(messages));
        return;
      }

      // If not found in current month, search in previous months
      // For now, we'll search recent months (last 12 months)
      const searchMonths = await this.getRecentMonths(12);
      for (const month of searchMonths) {
        if (month === currentMonth) continue; // Already checked
        
        messages = await this.getMessagesForMonth(month);
        messageIndex = messages.findIndex(msg => msg.id === messageId);
        
        if (messageIndex !== -1) {
          messages[messageIndex] = { ...messages[messageIndex], ...updates };
          const storageKey = `@memoya_messages_${month}`;
          await AsyncStorage.setItem(storageKey, JSON.stringify(messages));
          return;
        }
      }
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  }

  static async deleteMessage(messageId: string): Promise<void> {
    await this.updateMessage(messageId, {
      isDeleted: true,
      deletedAt: new Date(),
    });
  }

  static async permanentlyDeleteMessage(messageId: string): Promise<void> {
    await this.updateMessage(messageId, {
      isPermanentlyDeleted: true,
    });
  }

  static async restoreMessage(messageId: string): Promise<void> {
    await this.updateMessage(messageId, {
      isDeleted: false,
      deletedAt: undefined,
    });
  }

  static async completelyRemoveMessage(messageId: string): Promise<void> {
    try {
      // Search and remove from all months
      const searchMonths = await this.getRecentMonths(12);
      for (const month of searchMonths) {
        const messages = await this.getMessagesForMonth(month);
        const filteredMessages = messages.filter(msg => msg.id !== messageId);
        
        if (filteredMessages.length !== messages.length) {
          // Message found and removed
          const storageKey = `@memoya_messages_${month}`;
          await AsyncStorage.setItem(storageKey, JSON.stringify(filteredMessages));
          return;
        }
      }
    } catch (error) {
      console.error('Error completely removing message:', error);
      throw error;
    }
  }

  static async getDeletedMessages(): Promise<Message[]> {
    try {
      const searchMonths = await this.getRecentMonths(12);
      const allDeletedMessages: Message[] = [];
      
      for (const month of searchMonths) {
        const messages = await this.getMessagesForMonth(month);
        const deletedMessages = messages.filter(msg => msg.isDeleted === true && !msg.isPermanentlyDeleted);
        allDeletedMessages.push(...deletedMessages);
      }
      
      return allDeletedMessages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.error('Error getting deleted messages:', error);
      return [];
    }
  }

  private static async getRecentMonths(count: number): Promise<string[]> {
    const months: string[] = [];
    const now = new Date();
    
    for (let i = 0; i < count; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      months.push(`${year}-${month}`);
    }
    
    return months;
  }

  static async getMessagesWithPagination(monthsToLoad: number = 1): Promise<Message[]> {
    try {
      const months = await this.getRecentMonths(monthsToLoad);
      const allMessages: Message[] = [];
      
      for (const month of months) {
        const messages = await this.getMessagesForMonth(month);
        allMessages.push(...messages);
      }
      
      return allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (error) {
      console.error('Error getting messages with pagination:', error);
      return [];
    }
  }

  static async getAllAvailableMonths(): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const messageKeys = allKeys.filter(key => key.startsWith('@memoya_messages_'));
      const months = messageKeys
        .map(key => key.replace('@memoya_messages_', ''))
        .filter(key => key.match(/^\d{4}-\d{2}$/)) // Valid YYYY-MM format
        .sort()
        .reverse(); // Most recent first
      
      return months;
    } catch (error) {
      console.error('Error getting available months:', error);
      return [];
    }
  }

  static async clearMessages(): Promise<void> {
    try {
      const months = await this.getAllAvailableMonths();
      const keys = months.map(month => `@memoya_messages_${month}`);
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error clearing messages:', error);
      throw error;
    }
  }

  // Migration method to convert old storage format to new monthly format
  static async migrateFromOldStorage(): Promise<void> {
    try {
      const oldMessages = await AsyncStorage.getItem('@memoya_messages');
      if (!oldMessages) return;

      const messages: Message[] = JSON.parse(oldMessages).map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));

      // Group messages by month
      const messagesByMonth: { [key: string]: Message[] } = {};
      
      messages.forEach(message => {
        const monthKey = this.getMonthKey(message.timestamp).replace('@memoya_messages_', '');
        if (!messagesByMonth[monthKey]) {
          messagesByMonth[monthKey] = [];
        }
        messagesByMonth[monthKey].push(message);
      });

      // Save each month's messages
      for (const [monthKey, monthMessages] of Object.entries(messagesByMonth)) {
        const storageKey = `@memoya_messages_${monthKey}`;
        await AsyncStorage.setItem(storageKey, JSON.stringify(monthMessages));
      }

      // Remove old storage
      await AsyncStorage.removeItem('@memoya_messages');
      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Error during migration:', error);
    }
  }
}