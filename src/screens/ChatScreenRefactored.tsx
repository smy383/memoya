import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { Memo, RootStackParamList } from '../types';
import { useChatRooms } from '../hooks/useChatRooms';
import { getResponsiveFontSize } from '../utils/dimensions';
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

type NavigationProp = StackNavigationProp<RootStackParamList>;

const ChatScreenRefactored: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { getCurrentRoom } = useChatRooms();
  const [message, setMessage] = useState('');

  // 현재 채팅방 정보 가져오기
  const currentRoom = getCurrentRoom();
  const flatListRef = useRef<FlatList>(null);
  
  const { chatMessages, chatListData, addMessage, saveChatMessages } = useChat(currentRoom?.id);
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

      const memosKey = currentRoom?.id ? `memos_${currentRoom.id}` : 'memos';
      const existingMemos = await AsyncStorage.getItem(memosKey);
      const memos = existingMemos ? JSON.parse(existingMemos) : [];
      
      memos.unshift(newMemo);
      await AsyncStorage.setItem(memosKey, JSON.stringify(memos));
      
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
    
    // 현재 채팅방 ID를 포함한 도구 실행 함수
    const roomSpecificExecuteMemoTool = (functionName: string, args: any) => {
      return executeMemoTool(functionName, args, currentRoom?.id);
    };

    // AI 응답 처리
    const aiResponse = await sendToAI(
      newMessage.content,
      updatedMessages,
      getMemoTools(),
      roomSpecificExecuteMemoTool
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing?.md || 16,
      paddingVertical: theme.spacing?.sm || 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    backButton: {
      padding: theme.spacing?.xs || 4,
    },
    headerTitle: {
      fontSize: getResponsiveFontSize(18),
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
      textAlign: 'center',
    },
    headerPlaceholder: {
      width: 32, // backButton과 동일한 너비로 중앙 정렬
    },
    chatContainer: {
      flex: 1,
    },
    messagesList: {
      flex: 1,
      paddingTop: theme.spacing?.sm || 8,
      paddingBottom: theme.spacing?.xs || 4,
    },
  }), [theme.colors.background, theme.spacing, theme.colors.border, theme.colors.surface, theme.colors.text]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Icon name="chevron-back" size={24} color={theme.colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>
        {currentRoom?.title || '채팅'}
      </Text>
      <View style={styles.headerPlaceholder} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
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