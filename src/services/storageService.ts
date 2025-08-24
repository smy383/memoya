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

  static async clearMessages(): Promise<void> {
    try {
      await AsyncStorage.removeItem(MESSAGES_KEY);
    } catch (error) {
      console.error('Error clearing messages:', error);
      throw error;
    }
  }
}