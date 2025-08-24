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
import uuid from 'react-native-uuid';
import { Message } from '../types/message';
import { MessageBubble } from '../components/MessageBubble';
import { ChatInput } from '../components/ChatInput';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING } from '../styles/dimensions';

const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';

export const ChatScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const geminiService = useRef(new GeminiService(GEMINI_API_KEY));

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const savedMessages = await StorageService.getMessages();
      setMessages(savedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
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

  const renderMessage = ({ item }: { item: Message }) => (
    <MessageBubble message={item} />
  );

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
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        onLayout={scrollToBottom}
      />
      <ChatInput onSendMessage={handleSendMessage} loading={loading} />
    </KeyboardAvoidingView>
  );
};