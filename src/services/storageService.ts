import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message } from '../types/message';

const MESSAGES_KEY = '@memoya_messages';

export class StorageService {
  static async saveMessages(messages: Message[]): Promise<void> {
    try {
      const jsonMessages = JSON.stringify(messages);
      await AsyncStorage.setItem(MESSAGES_KEY, jsonMessages);
    } catch (error) {
      console.error('Error saving messages:', error);
      throw error;
    }
  }

  static async getMessages(): Promise<Message[]> {
    try {
      const jsonMessages = await AsyncStorage.getItem(MESSAGES_KEY);
      if (jsonMessages) {
        const messages = JSON.parse(jsonMessages);
        return messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  static async addMessage(message: Message): Promise<void> {
    try {
      const messages = await this.getMessages();
      messages.push(message);
      await this.saveMessages(messages);
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  static async updateMessage(messageId: string, updates: Partial<Message>): Promise<void> {
    try {
      const messages = await this.getMessages();
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      if (messageIndex !== -1) {
        messages[messageIndex] = { ...messages[messageIndex], ...updates };
        await this.saveMessages(messages);
      }
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  }

  static async deleteMessage(messageId: string): Promise<void> {
    try {
      const messages = await this.getMessages();
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      if (messageIndex !== -1) {
        messages[messageIndex] = {
          ...messages[messageIndex],
          isDeleted: true,
          deletedAt: new Date(),
        };
        await this.saveMessages(messages);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  static async permanentlyDeleteMessage(messageId: string): Promise<void> {
    try {
      const messages = await this.getMessages();
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      if (messageIndex !== -1) {
        messages[messageIndex] = {
          ...messages[messageIndex],
          isPermanentlyDeleted: true,
        };
        await this.saveMessages(messages);
      }
    } catch (error) {
      console.error('Error permanently deleting message:', error);
      throw error;
    }
  }

  static async completelyRemoveMessage(messageId: string): Promise<void> {
    try {
      const messages = await this.getMessages();
      const filteredMessages = messages.filter(msg => msg.id !== messageId);
      await this.saveMessages(filteredMessages);
    } catch (error) {
      console.error('Error completely removing message:', error);
      throw error;
    }
  }

  static async restoreMessage(messageId: string): Promise<void> {
    try {
      const messages = await this.getMessages();
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      if (messageIndex !== -1) {
        messages[messageIndex] = {
          ...messages[messageIndex],
          isDeleted: false,
          deletedAt: undefined,
        };
        await this.saveMessages(messages);
      }
    } catch (error) {
      console.error('Error restoring message:', error);
      throw error;
    }
  }

  static async getDeletedMessages(): Promise<Message[]> {
    try {
      const messages = await this.getMessages();
      return messages.filter(msg => msg.isDeleted === true && !msg.isPermanentlyDeleted);
    } catch (error) {
      console.error('Error getting deleted messages:', error);
      return [];
    }
  }

  static async clearMessages(): Promise<void> {
    try {
      await AsyncStorage.removeItem(MESSAGES_KEY);
    } catch (error) {
      console.error('Error clearing messages:', error);
      throw error;
    }
  }
}