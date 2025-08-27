import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { Memo, RootStackParamList } from '../types';
import { useChatRooms } from '../hooks/useChatRooms';
import { useChat } from '../hooks/useChat';
import { useAI } from '../hooks/useAI';
import ChatMessageComponent, { ChatMessage } from '../components/chat/ChatMessage';
import { getResponsiveFontSize, isTablet } from '../utils/dimensions';
import { getMemoTools, executeMemoTool } from '../services/memoTools';

interface ChatListItem {
  id: string;
  type: 'message' | 'dateSeparator';
  message?: ChatMessage;
  date?: string;
}

type NavigationProp = StackNavigationProp<RootStackParamList>;

const ChatScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { getCurrentRoom, calculateRoomMetadata, updateRoomMetadata } = useChatRooms();
  const { isAIProcessing, aiProcessingStatus, sendToAI } = useAI();
  const [message, setMessage] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // 현재 채팅방 정보 가져오기 - route params 우선 사용
  const routeRoomId = (route.params as any)?.roomId;
  const currentRoom = getCurrentRoom();
  const activeRoomId = routeRoomId || currentRoom?.id;
  

  
  // 메타데이터 업데이트 콜백
  const handleMetadataUpdate = useCallback(async (roomId: string) => {
    try {
      const metadata = await calculateRoomMetadata(roomId);
      await updateRoomMetadata(roomId, metadata);
    } catch (error) {
      console.error('ChatScreen: Error updating metadata:', error);
    }
  }, [calculateRoomMetadata, updateRoomMetadata]);
  
  // useChat 훅 사용 (채팅방별 데이터 분리)
  const { chatMessages, chatListData, setChatMessages, addMessage, saveChatMessages } = useChat(activeRoomId, handleMetadataUpdate);

  useEffect(() => {
    // 새 메시지가 추가되면 하단으로 스크롤
    if (chatListData.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatListData.length]);

  useEffect(() => {
    // AI 처리 상태가 변경될 때도 하단으로 스크롤
    if (isAIProcessing) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [isAIProcessing]);

  const handleRecord = async () => {
    if (!message.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: message.trim(),
      timestamp: new Date(),
      type: 'record',
      memoStatus: 'active',
    };

    // useChat 훅의 addMessage 사용
    const updatedMessages = addMessage(newMessage);

    try {
      const newMemo: Memo = {
        id: newMessage.id,
        content: newMessage.content,
        timestamp: newMessage.timestamp,
      };

      const memosKey = currentRoom ? `memos_${currentRoom.id}` : 'memos';
      
      const existingMemos = await AsyncStorage.getItem(memosKey);
      const memos = existingMemos ? JSON.parse(existingMemos) : [];
      
      memos.unshift(newMemo);
      await AsyncStorage.setItem(memosKey, JSON.stringify(memos));
      
      // 메모 추가 후 메타데이터 업데이트
      if (currentRoom) {
        await handleMetadataUpdate(currentRoom.id);
      }
      
      setMessage('');
    } catch (error) {
      console.error('Error saving memo:', error);
    }
  };

  const handleChat = async () => {
    if (!message.trim()) return;

    const userMessage = message.trim();
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: userMessage,
      timestamp: new Date(),
      type: 'user',
    };

    console.log('handleChat: Adding user message:', userMessage);
    
    // useChat 훅의 addMessage 사용
    addMessage(newMessage);
    
    setMessage('');
    
    // AI 응답 처리 - 현재 메시지 배열에 새 메시지를 추가한 배열을 전달
    try {
      const memoTools = getMemoTools(t);
      const executeTool = (functionName: string, args: any) => 
        executeMemoTool(functionName, args, activeRoomId, t);
      
      // 현재 메시지 배열에 새로 추가된 사용자 메시지를 포함한 배열 생성
      const messagesForAI = [...chatMessages, newMessage];
      
      console.log('handleChat: Calling AI with messages count:', messagesForAI.length);
      
      const aiResponse = await sendToAI(userMessage, messagesForAI, memoTools, executeTool);
      
      if (aiResponse) {
        console.log('handleChat: Got AI response, adding to chat');
        addMessage(aiResponse);
      }
    } catch (error) {
      console.error('Error in handleChat:', error);
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
    return <ChatMessageComponent message={message} />;
  };

  const renderProcessingIndicator = () => (
    <View style={styles.processingContainer}>
      <View style={styles.processingBubble}>
        <View style={styles.processingContent}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.processingText}>{aiProcessingStatus}</Text>
        </View>
      </View>
    </View>
  );

  const renderChatListItem = ({ item }: { item: ChatListItem }) => {
    if (item.type === 'dateSeparator') {
      return renderDateSeparator(item.date!);
    } else {
      return renderChatMessage(item.message!);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Icon name="chevron-back" size={24} color={theme.colors.text} />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>
          {currentRoom?.title || t('chat.title')}
        </Text>
      </View>
    </View>
  );

  const renderInput = () => (
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.textInput}
        value={message}
        onChangeText={setMessage}
        placeholder={t('chat.placeholder')}
        placeholderTextColor={theme.colors.textSecondary}
        multiline
        editable={!isAIProcessing}
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.recordButton,
            (!message.trim() || isAIProcessing) && styles.disabledButton
          ]}
          onPress={handleRecord}
          disabled={!message.trim() || isAIProcessing}
        >
          <Text style={styles.buttonText}>{t('chat.record')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            styles.chatButton,
            (!message.trim() || isAIProcessing) && styles.disabledButton
          ]}
          onPress={handleChat}
          disabled={!message.trim() || isAIProcessing}
        >
          <Text style={styles.buttonText}>{t('chat.chat')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {renderHeader()}
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <FlatList
          ref={flatListRef}
          data={chatListData}
          renderItem={renderChatListItem}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={isAIProcessing ? renderProcessingIndicator : null}
        />
        {renderInput()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '600',
    color: '#333',
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingVertical: 8,
  },
  dateSeparatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dateSeparatorText: {
    marginHorizontal: 16,
    fontSize: getResponsiveFontSize(12),
    color: '#666',
    fontWeight: '500',
  },
  processingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  processingBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F5F5',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '80%',
  },
  processingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  processingText: {
    marginLeft: 8,
    fontSize: getResponsiveFontSize(14),
    color: '#666',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: getResponsiveFontSize(16),
    color: '#333',
    backgroundColor: '#FFFFFF',
    maxHeight: 100,
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButton: {
    backgroundColor: '#4CAF50',
  },
  chatButton: {
    backgroundColor: '#2196F3',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
  },
});

export default ChatScreen;