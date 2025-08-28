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
import ChatMessageComponent, { ChatMessage, MemoActionData } from '../components/chat/ChatMessage';
import { getResponsiveFontSize, isTablet } from '../utils/dimensions';
import { getMemoTools, executeMemoTool, executeCreateMemo, executeUpdateMemo, executeDeleteMemo } from '../services/memoTools';

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
    // 채팅방 변경 시 데이터 로드 완료 후 하단으로 스크롤
    if (activeRoomId && chatListData.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 300); // 데이터 로딩 완료를 위해 좀 더 긴 지연시간 적용
    }
  }, [activeRoomId, chatListData]);

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

  // 승인 처리 함수들
  const handleActionApprove = async (messageId: string, actionData: MemoActionData) => {
    try {
      let result;
      const args = actionData.originalToolResult?.args || {};
      
      switch (actionData.actionType) {
        case 'create':
          result = await executeCreateMemo(args, activeRoomId);
          break;
        case 'update':
          result = await executeUpdateMemo(args, activeRoomId);
          break;
        case 'delete':
          result = await executeDeleteMemo(args, activeRoomId);
          break;
        default:
          throw new Error('Unknown action type');
      }

      // 메시지에서 pendingAction 제거하고 결과 메시지 추가
      setChatMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === messageId 
            ? { ...msg, pendingAction: undefined }
            : msg
        )
      );

      // 결과 메시지 추가
      const resultMessage: ChatMessage = {
        id: Date.now().toString() + '_result',
        content: result.message,
        timestamp: new Date(),
        type: 'ai',
      };
      
      addMessage(resultMessage);

      // 메타데이터 업데이트
      if (currentRoom) {
        await handleMetadataUpdate(currentRoom.id);
      }

    } catch (error) {
      console.error('Error executing action:', error);
      Alert.alert(t('api.aiError'), '작업 실행 중 오류가 발생했습니다.');
    }
  };

  const handleActionCancel = (messageId: string) => {
    // 메시지에서 pendingAction 제거
    setChatMessages(prevMessages => 
      prevMessages.map(msg => 
        msg.id === messageId 
          ? { ...msg, pendingAction: undefined }
          : msg
      )
    );

    // 취소 메시지 추가
    const cancelMessage: ChatMessage = {
      id: Date.now().toString() + '_cancel',
      content: '작업이 취소되었습니다.',
      timestamp: new Date(),
      type: 'ai',
    };
    
    addMessage(cancelMessage);
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
    
    // AI 응답 처리 - 승인 요청 시스템 사용
    try {
      const memoTools = getMemoTools(t);
      
      // 승인 요청을 위한 executeTool 함수
      const executeTool = async (functionName: string, args: any) => {
        // 메모 관련 도구인 경우 승인 요청 생성
        if (['create_memo', 'update_memo', 'delete_memo'].includes(functionName)) {
          // 액션 타입별 preview 생성
          let preview: any = {};
          
          switch (functionName) {
            case 'create_memo':
              preview = {
                content: args.content || '새 메모 내용',
                tags: args.tags || [],
                timestamp: new Date().toISOString(),
                formattedDate: new Date().toLocaleString('ko-KR')
              };
              break;
              
            case 'update_memo':
              // 기존 메모 찾기 (올바른 파라미터 이름 사용)
              try {
                const memosKey = activeRoomId ? `memos_${activeRoomId}` : 'memos';
                const existingMemos = await AsyncStorage.getItem(memosKey);
                const memos = existingMemos ? JSON.parse(existingMemos) : [];
                const existingMemo = memos.find((memo: any) => memo.id === args.memo_id);
                
                preview = {
                  memoId: args.memo_id,
                  originalContent: existingMemo?.content || '메모를 찾을 수 없습니다',
                  newContent: args.new_content || '수정된 내용',
                  timestamp: existingMemo?.timestamp || new Date().toISOString(),
                  formattedDate: existingMemo ? new Date(existingMemo.timestamp).toLocaleString('ko-KR') : new Date().toLocaleString('ko-KR')
                };
              } catch (error) {
                preview = {
                  memoId: args.memo_id,
                  originalContent: '메모를 불러올 수 없습니다',
                  newContent: args.new_content || '수정된 내용',
                  timestamp: new Date().toISOString(),
                  formattedDate: new Date().toLocaleString('ko-KR')
                };
              }
              break;
              
            case 'delete_memo':
              // 삭제할 메모 찾기 (올바른 파라미터 이름 사용)
              try {
                const memosKey = activeRoomId ? `memos_${activeRoomId}` : 'memos';
                const existingMemos = await AsyncStorage.getItem(memosKey);
                const memos = existingMemos ? JSON.parse(existingMemos) : [];
                const existingMemo = memos.find((memo: any) => memo.id === args.memo_id);
                
                preview = {
                  memoId: args.memo_id,
                  content: existingMemo?.content || '메모를 찾을 수 없습니다',
                  timestamp: existingMemo?.timestamp || new Date().toISOString(),
                  formattedDate: existingMemo ? new Date(existingMemo.timestamp).toLocaleString('ko-KR') : new Date().toLocaleString('ko-KR')
                };
              } catch (error) {
                preview = {
                  memoId: args.memo_id,
                  content: '메모를 불러올 수 없습니다',
                  timestamp: new Date().toISOString(),
                  formattedDate: new Date().toLocaleString('ko-KR')
                };
              }
              break;
          }
          
          // 액션별 승인 메시지 생성
          let approvalContent = '';
          switch (functionName) {
            case 'create_memo':
              approvalContent = '메모 생성을 위해 승인을 해주세요.';
              break;
            case 'update_memo':
              approvalContent = '메모 수정을 위해 승인을 해주세요.';
              break;
            case 'delete_memo':
              approvalContent = '메모 삭제를 위해 승인을 해주세요.';
              break;
            default:
              approvalContent = `${functionName} 작업을 실행하시겠습니까?`;
          }
          
          // 승인 요청 메시지 생성
          const approvalMessage: ChatMessage = {
            id: Date.now().toString() + '_approval',
            content: approvalContent,
            timestamp: new Date(),
            type: 'ai',
            pendingAction: {
              actionType: functionName.replace('_memo', '') as 'create' | 'update' | 'delete',
              preview: preview,
              originalToolResult: {
                functionName,
                args,
                success: true,
                message: `${functionName} 실행 준비 완료`
              }
            }
          };
          
          // 승인 요청 메시지 추가
          addMessage(approvalMessage);
          
          // 도구 실행 결과 반환 (실제로는 실행하지 않음)
          return {
            success: true,
            message: '승인 요청이 생성되었습니다.',
            requiresApproval: true
          };
        } else {
          // 다른 도구들은 기존대로 실행
          return await executeMemoTool(functionName, args, activeRoomId, t);
        }
      };
      
      // 현재 메시지 배열에 새로 추가된 사용자 메시지를 포함한 배열 생성
      const messagesForAI = [...chatMessages, newMessage];
      
      console.log('handleChat: Calling AI with messages count:', messagesForAI.length);
      
      const aiResponse = await sendToAI(userMessage, messagesForAI, memoTools, executeTool);
      
      if (aiResponse && !aiResponse.content.includes('승인 요청이 생성되었습니다')) {
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
    return (
      <ChatMessageComponent 
        message={message} 
        onActionApprove={handleActionApprove}
        onActionCancel={handleActionCancel}
      />
    );
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
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: theme.colors.background,
      // 그림자 효과 추가
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      borderBottomWidth: 0,
    },
    backButton: {
      padding: 12,
      marginRight: 12,
      marginLeft: -4,
      borderRadius: 24,
      backgroundColor: 'transparent',
    },
    headerTitleContainer: {
      flex: 1,
    },
    headerTitle: {
      fontSize: getResponsiveFontSize(20),
      fontWeight: '700',
      color: theme.colors.text,
      letterSpacing: -0.5,
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
      backgroundColor: theme.colors.border,
    },
    dateSeparatorText: {
      marginHorizontal: 16,
      fontSize: getResponsiveFontSize(12),
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    processingContainer: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    processingBubble: {
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.surface,
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
      color: theme.colors.textSecondary,
    },
    inputContainer: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.colors.background,
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
      backgroundColor: theme.colors.primary,
    },
    disabledButton: {
      opacity: 0.5,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: getResponsiveFontSize(16),
      fontWeight: '600',
    },
  });

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


export default ChatScreen;