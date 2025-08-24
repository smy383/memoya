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
import { StorageServiceV2 } from '../services/storageServiceV2';
import { GeminiService } from '../services/geminiService';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING } from '../styles/dimensions';

type ChatItem = Message | { type: 'date-separator'; date: Date; id: string };

export const ChatScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [loadedMonths, setLoadedMonths] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const geminiService = useRef(new GeminiService());

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
      // Migrate old storage format if needed
      await StorageServiceV2.migrateFromOldStorage();
      
      const savedMessages = await StorageServiceV2.getMessagesWithPagination(1);
      setMessages(savedMessages);
      setChatItems(createChatItemsWithDateSeparators(savedMessages));
      setLoadedMonths(1);
      
      // Check if there are more months available
      const availableMonths = await StorageServiceV2.getAllAvailableMonths();
      setHasMoreMessages(availableMonths.length > 1);
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

  const loadOlderMessages = async () => {
    if (loadingOlderMessages || !hasMoreMessages) return;

    try {
      setLoadingOlderMessages(true);
      const nextMonthCount = loadedMonths + 1;
      const allMessages = await StorageServiceV2.getMessagesWithPagination(nextMonthCount);
      
      // Check if we got more messages than before
      if (allMessages.length > messages.length) {
        setMessages(allMessages);
        setChatItems(createChatItemsWithDateSeparators(allMessages));
        setLoadedMonths(nextMonthCount);
        
        // Check if there are more months available
        const availableMonths = await StorageServiceV2.getAllAvailableMonths();
        setHasMoreMessages(availableMonths.length > nextMonthCount);
      } else {
        // No more messages to load
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error loading older messages:', error);
    } finally {
      setLoadingOlderMessages(false);
    }
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
      await StorageServiceV2.addMessage(userMessage);
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
          await StorageServiceV2.addMessage(aiMessage);
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

  const renderHeader = () => {
    if (!hasMoreMessages) return null;
    
    return (
      <View style={{ padding: SPACING.md, alignItems: 'center' }}>
        {loadingOlderMessages ? (
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            이전 메시지 불러오는 중...
          </Text>
        ) : (
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            위로 스크롤하여 이전 메시지 보기
          </Text>
        )}
      </View>
    );
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
        ListHeaderComponent={renderHeader}
        onScroll={({ nativeEvent }) => {
          // Check if user scrolled to top
          if (nativeEvent.contentOffset.y <= 100 && hasMoreMessages && !loadingOlderMessages) {
            loadOlderMessages();
          }
        }}
        scrollEventThrottle={400}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 100,
        }}
      />
      <ChatInput onSendMessage={handleSendMessage} loading={loading} />
    </KeyboardAvoidingView>
  );
};