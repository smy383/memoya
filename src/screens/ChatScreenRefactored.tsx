import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { Memo } from '../types';
import { useChat } from '../hooks/useChat';
import { useAI } from '../hooks/useAI';
import { getMemoTools, executeMemoTool } from '../services/memoTools';
import ChatMessageComponent, { ChatMessage } from '../components/chat/ChatMessage';
import ChatInput from '../components/chat/ChatInput';
import DateSeparator from '../components/chat/DateSeparator';
import AIProcessingIndicator from '../components/chat/AIProcessingIndicator';

interface ChatListItem {
  id: string;
  type: 'message' | 'dateSeparator';
  message?: ChatMessage;
  date?: string;
}

const ChatScreenRefactored: React.FC = () => {
  const { theme } = useTheme();
  const [message, setMessage] = useState('');
  const flatListRef = useRef<FlatList>(null);
  
  const { chatMessages, chatListData, addMessage, saveChatMessages } = useChat();
  const { isAIProcessing, aiProcessingStatus, sendToAI } = useAI();

  // 새 메시지가 추가되면 하단으로 스크롤
  useEffect(() => {
    if (chatListData.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatListData.length]);

  // AI 처리 상태가 변경될 때도 하단으로 스크롤
  useEffect(() => {
    if (isAIProcessing) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [isAIProcessing]);

  const handleRecord = useCallback(async () => {
    if (!message.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: message.trim(),
      timestamp: new Date(),
      type: 'record',
      memoStatus: 'active',
    };

    const updatedMessages = addMessage(newMessage);

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
  }, [message, addMessage]);

  const handleChat = useCallback(async () => {
    if (!message.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: message.trim(),
      timestamp: new Date(),
      type: 'user',
    };

    const updatedMessages = addMessage(newMessage);
    setMessage('');
    
    // AI 응답 처리
    const aiResponse = await sendToAI(
      newMessage.content,
      updatedMessages,
      getMemoTools(),
      executeMemoTool
    );

    if (aiResponse) {
      addMessage(aiResponse);
    }
  }, [message, addMessage, sendToAI]);

  const renderItem = useCallback(({ item }: { item: ChatListItem }) => {
    if (item.type === 'dateSeparator') {
      return <DateSeparator date={item.date!} />;
    } else if (item.message) {
      return <ChatMessageComponent message={item.message} />;
    }
    return null;
  }, []);

  const keyExtractor = useCallback((item: ChatListItem) => item.id, []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 80, // 예상 아이템 높이
    offset: 80 * index,
    index,
  }), []);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    chatContainer: {
      flex: 1,
    },
    messagesList: {
      flex: 1,
      paddingTop: theme.spacing?.sm || 8,
      paddingBottom: theme.spacing?.xs || 4,
    },
  }), [theme.colors.background, theme.spacing]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.chatContainer}>
          <FlatList
            ref={flatListRef}
            style={styles.messagesList}
            data={chatListData}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={20}
            ListFooterComponent={() => (
              <AIProcessingIndicator 
                isProcessing={isAIProcessing} 
                status={aiProcessingStatus} 
              />
            )}
          />
          
          <ChatInput
            message={message}
            onMessageChange={setMessage}
            onRecord={handleRecord}
            onChat={handleChat}
            isAIProcessing={isAIProcessing}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreenRefactored;