import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import uuid from 'react-native-uuid';
import { Message } from '../types/message';
import { MessageBubble } from '../components/MessageBubble';
import { ChatInput } from '../components/ChatInput';
import { DateSeparator } from '../components/DateSeparator';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING } from '../styles/dimensions';

const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';

type ChatItem = Message | { type: 'date-separator'; date: Date; id: string };

export const ChatScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const geminiService = useRef(new GeminiService(GEMINI_API_KEY));

  useEffect(() => {
    loadMessages();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadMessages();
    }, [])
  );

  const loadMessages = async () => {
    try {
      const savedMessages = await StorageService.getMessages();
      setMessages(savedMessages);
      setChatItems(createChatItemsWithDateSeparators(savedMessages));
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const createChatItemsWithDateSeparators = (messages: Message[]): ChatItem[] => {
    if (messages.length === 0) return [];

    const items: ChatItem[] = [];
    let currentDate: string | null = null;

    messages.forEach((message) => {
      const messageDate = new Date(message.timestamp);
      const dateString = messageDate.toDateString();

      // 날짜가 바뀌면 구분선 추가
      if (currentDate !== dateString) {
        items.push({
          type: 'date-separator',
          date: messageDate,
          id: `date-${dateString}`
        });
        currentDate = dateString;
      }

      items.push(message);
    });

    return items;
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSendMessage = async (text: string, isMemory: boolean) => {
    const userMessage: Message = {
      id: uuid.v4() as string,
      text,
      type: isMemory ? 'memo' : 'user',
      timestamp: new Date(),
      isMemory,
    };

    try {
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setChatItems(createChatItemsWithDateSeparators(updatedMessages));
      await StorageService.addMessage(userMessage);
      scrollToBottom();

      if (!isMemory) {
        setLoading(true);
        
        try {
          const chatHistory = messages
            .filter(m => m.type !== 'memo')
            .map(m => m.text);
          
          const aiResponse = await geminiService.current.generateChatResponse(
            chatHistory,
            text
          );

          const aiMessage: Message = {
            id: uuid.v4() as string,
            text: aiResponse,
            type: 'ai',
            timestamp: new Date(),
            isMemory: false,
          };

          const finalMessages = [...updatedMessages, aiMessage];
          setMessages(finalMessages);
          setChatItems(createChatItemsWithDateSeparators(finalMessages));
          await StorageService.addMessage(aiMessage);
          scrollToBottom();
        } catch (error) {
          console.error('Error getting AI response:', error);
          Alert.alert(t('chat.errorTitle'), t('chat.errorAI'));
        }
        
        setLoading(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert(t('chat.errorTitle'), t('chat.errorStorage'));
    }
  };

  const renderChatItem = ({ item }: { item: ChatItem }) => {
    if ('type' in item && item.type === 'date-separator') {
      return <DateSeparator date={item.date} />;
    }
    return <MessageBubble message={item as Message} />;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    },
    messagesList: {
      flex: 1,
    },
    messagesContainer: {
      paddingVertical: SPACING.md,
      flexGrow: 1,
      justifyContent: 'flex-end',
    },
  });

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FlatList
        ref={flatListRef}
        data={chatItems}
        renderItem={renderChatItem}
        keyExtractor={(item) => 'id' in item ? item.id : `date-${item.date.toDateString()}`}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        onLayout={scrollToBottom}
      />
      <ChatInput onSendMessage={handleSendMessage} loading={loading} />
    </KeyboardAvoidingView>
  );
};