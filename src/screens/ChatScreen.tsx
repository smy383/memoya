import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { Memo } from '../types';
import { getResponsiveFontSize, isTablet } from '../utils/dimensions';
import { API_CONFIG } from '../config/api';

interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  type: 'user' | 'ai' | 'record';
}

interface ChatListItem {
  id: string;
  type: 'message' | 'dateSeparator';
  message?: ChatMessage;
  date?: string;
}

const ChatScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatListData, setChatListData] = useState<ChatListItem[]>([]);

  useEffect(() => {
    loadChatMessages();
  }, []);

  useEffect(() => {
    groupMessagesByDate();
  }, [chatMessages]);

  const formatDate = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isToday) {
      return t('common.today');
    } else if (isYesterday) {
      return t('common.yesterday');
    } else {
      const weekdays = t('weekdays');
      const weekday = weekdays[date.getDay()];
      return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${weekday}`;
    }
  };

  const groupMessagesByDate = () => {
    if (chatMessages.length === 0) {
      setChatListData([]);
      return;
    }

    const grouped: ChatListItem[] = [];
    let currentDate = '';

    chatMessages.forEach((message, index) => {
      const messageDate = message.timestamp.toDateString();
      
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        grouped.push({
          id: `date-${messageDate}`,
          type: 'dateSeparator',
          date: formatDate(message.timestamp),
        });
      }
      
      grouped.push({
        id: message.id,
        type: 'message',
        message,
      });
    });

    setChatListData(grouped);
  };

  const loadChatMessages = async () => {
    try {
      const savedMessages = await AsyncStorage.getItem('chatMessages');
      if (savedMessages) {
        const parsedMessages: ChatMessage[] = JSON.parse(savedMessages);
        // timestamp를 Date 객체로 변환
        const messagesWithDates = parsedMessages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setChatMessages(messagesWithDates);
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  };

  const saveChatMessages = async (messages: ChatMessage[]) => {
    try {
      await AsyncStorage.setItem('chatMessages', JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving chat messages:', error);
    }
  };

  const handleRecord = async () => {
    if (!message.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: message.trim(),
      timestamp: new Date(),
      type: 'record',
    };

    const updatedMessages = [...chatMessages, newMessage];
    setChatMessages(updatedMessages);
    
    // 채팅 메시지 저장
    await saveChatMessages(updatedMessages);

    try {
      const newMemo: Memo = {
        id: newMessage.id,
        content: newMessage.content,
        timestamp: newMessage.timestamp,
      };

      const existingMemos = await AsyncStorage.getItem('memos');
      const memos = existingMemos ? JSON.parse(existingMemos) : [];
      
      memos.unshift(newMemo);
      await AsyncStorage.setItem('memos', JSON.stringify(memos));
      
      setMessage('');
    } catch (error) {
      console.error('Error saving memo:', error);
    }
  };

  const handleChat = async () => {
    if (!message.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: message.trim(),
      timestamp: new Date(),
      type: 'user',
    };

    const updatedMessages = [...chatMessages, newMessage];
    setChatMessages(updatedMessages);
    
    // 채팅 메시지 저장
    await saveChatMessages(updatedMessages);
    
    setMessage('');
    
    // AI 응답 처리
    await sendToGemini(message.trim(), updatedMessages);
  };

  const sendToGemini = async (userMessage: string, currentMessages: ChatMessage[]) => {
    try {
      // API 설정에서 키와 모델명 가져오기
      const apiKey = API_CONFIG.GEMINI_API_KEY;
      const model = API_CONFIG.GEMINI_MODEL;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: userMessage
            }]
          }]
        })
      });

      const data = await response.json();
      
      if (response.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        const aiResponse: ChatMessage = {
          id: Date.now().toString() + '_ai',
          content: data.candidates[0].content.parts[0].text,
          timestamp: new Date(),
          type: 'ai',
        };

        const updatedMessagesWithAI = [...currentMessages, aiResponse];
        setChatMessages(updatedMessagesWithAI);
        await saveChatMessages(updatedMessagesWithAI);
      } else {
        throw new Error(data.error?.message || t('api.error'));
      }
    } catch (error) {
      console.error('Gemini API error:', error);
      Alert.alert(t('api.aiError'), t('api.error'));
    }
  };

  const renderDateSeparator = (date: string) => (
    <View style={styles.dateSeparatorContainer}>
      <View style={styles.dateSeparatorLine} />
      <Text style={styles.dateSeparatorText}>{date}</Text>
      <View style={styles.dateSeparatorLine} />
    </View>
  );

  const renderChatMessage = (message: ChatMessage) => {
    const isUser = message.type === 'user';
    const isRecord = message.type === 'record';
    const isRightAligned = isUser || isRecord;
    
    return (
      <View style={[styles.messageContainer, isRightAligned ? styles.userMessage : styles.aiMessage]}>
        <View style={[
          styles.messageBubble, 
          isRecord ? styles.recordBubble : (isUser ? styles.userBubble : styles.aiBubble)
        ]}>
          <Text style={[
            styles.messageText, 
            isRecord ? styles.recordText : (isUser ? styles.userText : styles.aiText)
          ]}>
            {message.content}
          </Text>
          <Text style={[
            styles.messageTime, 
            isRecord ? styles.recordTime : (isUser ? styles.userTime : styles.aiTime)
          ]}>
            {message.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const renderChatListItem = ({ item }: { item: ChatListItem }) => {
    if (item.type === 'dateSeparator') {
      return renderDateSeparator(item.date!);
    } else {
      return renderChatMessage(item.message!);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    chatContainer: {
      flex: 1,
      paddingHorizontal: theme.spacing.sm,
    },
    messageContainer: {
      marginVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
    },
    userMessage: {
      alignItems: 'flex-end',
    },
    aiMessage: {
      alignItems: 'flex-start',
    },
    messageBubble: {
      maxWidth: '80%',
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 2,
    },
    userBubble: {
      backgroundColor: theme.colors.primary,
      borderBottomRightRadius: 4,
    },
    recordBubble: {
      backgroundColor: '#4CAF50', // 초록색
      borderBottomRightRadius: 4,
    },
    aiBubble: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderBottomLeftRadius: 4,
    },
    messageText: {
      fontSize: getResponsiveFontSize(16),
      lineHeight: 20,
    },
    userText: {
      color: '#FFFFFF',
    },
    recordText: {
      color: '#FFFFFF',
    },
    aiText: {
      color: theme.colors.text,
    },
    messageTime: {
      fontSize: getResponsiveFontSize(11),
      marginTop: 2,
    },
    userTime: {
      color: 'rgba(255, 255, 255, 0.7)',
    },
    recordTime: {
      color: 'rgba(255, 255, 255, 0.7)',
    },
    aiTime: {
      color: theme.colors.textSecondary,
    },
    dateSeparatorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    dateSeparatorLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border,
    },
    dateSeparatorText: {
      marginHorizontal: theme.spacing.sm,
      fontSize: getResponsiveFontSize(12),
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    inputContainer: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    textInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: getResponsiveFontSize(16),
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
      maxHeight: 100,
      marginBottom: theme.spacing.sm,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    button: {
      flex: 1,
      borderRadius: 20,
      paddingVertical: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    recordButton: {
      backgroundColor: '#4CAF50', // 초록색
    },
    chatButton: {
      backgroundColor: theme.colors.primary, // 파란색
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: getResponsiveFontSize(16),
      fontWeight: '600',
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          style={styles.chatContainer}
          data={chatListData}
          renderItem={renderChatListItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          inverted={false}
        />
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={theme.colors.textSecondary}
            value={message}
            onChangeText={setMessage}
            multiline
          />
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.recordButton]}
              onPress={handleRecord}
            >
              <Text style={styles.buttonText}>{t('chat.record')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.chatButton]}
              onPress={handleChat}
            >
              <Text style={styles.buttonText}>{t('chat.chat')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;