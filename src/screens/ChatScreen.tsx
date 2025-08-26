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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
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
  memoStatus?: 'active' | 'deleted' | 'permanentlyDeleted';
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
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadChatMessages();
  }, []);

  useFocusEffect(
    useCallback(() => {
      // 화면이 포커스될 때마다 메모 상태 업데이트
      const updateMemoStatus = async () => {
        const updatedMessages = await Promise.all(
          chatMessages.map(async (msg) => ({
            ...msg,
            memoStatus: msg.type === 'record' ? await getMemoStatus(msg.id) : msg.memoStatus,
          }))
        );
        setChatMessages(updatedMessages);
      };
      
      if (chatMessages.length > 0) {
        updateMemoStatus();
      }
    }, [chatMessages.length])
  );

  useEffect(() => {
    groupMessagesByDate();
  }, [chatMessages]);

  useEffect(() => {
    // 새 메시지가 추가되면 하단으로 스크롤
    if (chatListData.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatListData.length]);

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
        // timestamp를 Date 객체로 변환하고 메모 상태 업데이트
        const messagesWithStatus = await Promise.all(
          parsedMessages.map(async (msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
            memoStatus: msg.type === 'record' ? await getMemoStatus(msg.id) : undefined,
          }))
        );
        setChatMessages(messagesWithStatus);
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  };

  const getMemoStatus = async (memoId: string): Promise<'active' | 'deleted' | 'permanentlyDeleted'> => {
    try {
      // 활성 메모에서 확인
      const activeMemos = await AsyncStorage.getItem('memos');
      if (activeMemos) {
        const memos = JSON.parse(activeMemos);
        if (memos.find((memo: any) => memo.id === memoId)) {
          return 'active';
        }
      }

      // 휴지통에서 확인
      const trashedMemos = await AsyncStorage.getItem('trashedMemos');
      if (trashedMemos) {
        const trashed = JSON.parse(trashedMemos);
        if (trashed.find((memo: any) => memo.id === memoId)) {
          return 'deleted';
        }
      }

      // 둘 다 없으면 영구 삭제됨
      return 'permanentlyDeleted';
    } catch (error) {
      console.error('Error checking memo status:', error);
      return 'active'; // 오류시 기본값
    }
  };

  const getMemoTools = () => {
    return [
      {
        name: "search_memos",
        description: "사용자의 메모를 다양한 조건으로 검색합니다. 날짜별, 키워드별, 기간별 검색이 가능합니다.",
        parameters: {
          type: "object",
          properties: {
            keyword: {
              type: "string",
              description: "검색할 키워드 (선택사항). 메모 내용에서 해당 키워드를 포함한 메모를 찾습니다."
            },
            date_from: {
              type: "string", 
              description: "검색 시작 날짜 (YYYY-MM-DD 형식, 선택사항)"
            },
            date_to: {
              type: "string",
              description: "검색 종료 날짜 (YYYY-MM-DD 형식, 선택사항)"
            },
            month: {
              type: "string",
              description: "특정 월 검색 (YYYY-MM 형식, 선택사항). 예: '2025-08'"
            },
            limit: {
              type: "number",
              description: "반환할 최대 메모 개수 (기본값: 10)"
            }
          }
        }
      },
      {
        name: "get_memo_stats",
        description: "사용자의 메모 통계 정보를 가져옵니다. 전체 메모 개수, 날짜별 분포 등의 정보를 제공합니다.",
        parameters: {
          type: "object",
          properties: {
            type: {
              type: "string",
              description: "통계 유형 (total_count, monthly_distribution, recent_activity 중 하나)",
              enum: ["total_count", "monthly_distribution", "recent_activity"]
            }
          },
          required: ["type"]
        }
      }
    ];
  };

  const generateSystemPrompt = (): string => {
    return `당신은 사용자의 메모를 관리하는 전문 메모 관리 어시스턴트입니다.

## 역할과 책임
- 사용자가 기록한 메모의 분석, 정리, 검색, 요약을 담당합니다
- 메모 간의 연관성을 파악하고 유용한 인사이트를 제공합니다
- 메모를 바탕으로 일정 관리, 할 일 정리, 아이디어 발전을 도와줍니다
- 메모 내용을 기반으로 한 질문 답변과 조언을 제공합니다

## 언어 대응 원칙
- 사용자가 질문한 언어와 동일한 언어로 답변합니다
- 한국어로 질문하면 한국어로, 영어로 질문하면 영어로, 일본어로 질문하면 일본어로 답변
- 중국어, 스페인어, 독일어 등 다른 언어로 질문해도 해당 언어로 답변
- 언어를 감지하여 자연스럽고 정확한 해당 언어로 응답

## 도구 사용 방법 (중요!)
- 사용자가 메모에 대한 질문을 하면 MUST 반드시 적절한 도구를 사용해야 합니다
- search_memos: 키워드 검색, 날짜별 검색, 월별 검색 시 필수 사용
- get_memo_stats: 메모 개수, 통계, 분포 질문 시 필수 사용
- 도구 없이는 메모 데이터에 접근할 수 없으므로 추측하거나 임의 답변을 하지 마세요
- 예시: "메모가 몇개?" → get_memo_stats 도구 사용, "8월 메모" → search_memos 도구 사용

## 제한사항
- 메모와 직접적으로 관련되지 않은 일반적인 질문이나 업무는 수행하지 않습니다
- 메모 관리, 정리, 분석 외의 전문 분야(의학, 법률, 투자 등)에 대한 조언은 제공하지 않습니다
- 사용자의 메모 데이터를 기반으로 한 도움만 제공합니다

메모와 관련된 질문이나 요청에 대해서만 도움을 드리겠습니다. 메모 외의 주제에 대한 질문을 받으면 정중하게 메모 관리 범위 내에서만 도움을 드릴 수 있다고 안내하겠습니다.`;
  };

  const executeMemoTool = async (functionName: string, args: any) => {
    try {
      switch (functionName) {
        case 'search_memos':
          return await searchMemos(args);
        case 'get_memo_stats':
          return await getMemoStats(args);
        default:
          return {
            success: false,
            message: `알 수 없는 도구: ${functionName}`
          };
      }
    } catch (error) {
      console.error(`Error executing tool ${functionName}:`, error);
      return {
        success: false,
        message: `도구 실행 중 오류가 발생했습니다: ${error}`
      };
    }
  };

  const searchMemos = async (args: any) => {
    try {
      const activeMemos = await AsyncStorage.getItem('memos');
      const memos = activeMemos ? JSON.parse(activeMemos) : [];
      
      let filteredMemos = memos;
      
      // 키워드 필터링
      if (args.keyword) {
        filteredMemos = filteredMemos.filter((memo: any) =>
          memo.content.toLowerCase().includes(args.keyword.toLowerCase())
        );
      }
      
      // 날짜 필터링
      if (args.date_from || args.date_to || args.month) {
        filteredMemos = filteredMemos.filter((memo: any) => {
          const memoDate = new Date(memo.timestamp);
          
          if (args.month) {
            const monthStr = memoDate.toISOString().substring(0, 7); // YYYY-MM
            return monthStr === args.month;
          }
          
          if (args.date_from) {
            const fromDate = new Date(args.date_from);
            if (memoDate < fromDate) return false;
          }
          
          if (args.date_to) {
            const toDate = new Date(args.date_to + 'T23:59:59');
            if (memoDate > toDate) return false;
          }
          
          return true;
        });
      }
      
      // 개수 제한
      const limit = args.limit || 10;
      filteredMemos = filteredMemos.slice(0, limit);
      
      return {
        success: true,
        data: filteredMemos.map((memo: any) => ({
          id: memo.id,
          content: memo.content,
          timestamp: memo.timestamp,
          formattedDate: new Date(memo.timestamp).toLocaleString('ko-KR')
        })),
        message: `${filteredMemos.length}개의 메모를 찾았습니다.`
      };
    } catch (error) {
      return {
        success: false,
        message: '메모 검색 중 오류가 발생했습니다.'
      };
    }
  };

  const getMemoStats = async (args: any) => {
    try {
      const activeMemos = await AsyncStorage.getItem('memos');
      const memos = activeMemos ? JSON.parse(activeMemos) : [];
      
      switch (args.type) {
        case 'total_count':
          return {
            success: true,
            data: {
              totalCount: memos.length,
              message: `총 ${memos.length}개의 메모가 있습니다.`
            }
          };
          
        case 'monthly_distribution':
          const monthlyStats = memos.reduce((acc: any, memo: any) => {
            const month = new Date(memo.timestamp).toISOString().substring(0, 7);
            acc[month] = (acc[month] || 0) + 1;
            return acc;
          }, {});
          
          return {
            success: true,
            data: {
              monthlyDistribution: monthlyStats,
              message: '월별 메모 분포를 조회했습니다.'
            }
          };
          
        case 'recent_activity':
          const recentMemos = memos
            .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 5);
            
          return {
            success: true,
            data: {
              recentMemos: recentMemos.map((memo: any) => ({
                id: memo.id,
                content: memo.content.substring(0, 50) + (memo.content.length > 50 ? '...' : ''),
                timestamp: memo.timestamp,
                formattedDate: new Date(memo.timestamp).toLocaleString('ko-KR')
              })),
              message: `최근 ${recentMemos.length}개의 메모입니다.`
            }
          };
          
        default:
          return {
            success: false,
            message: '지원하지 않는 통계 유형입니다.'
          };
      }
    } catch (error) {
      return {
        success: false,
        message: '메모 통계 조회 중 오류가 발생했습니다.'
      };
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
      memoStatus: 'active',
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
      
      // 메모 저장 완료 후 메시지 상태 확인 및 업데이트
      const finalUpdatedMessages = updatedMessages.map(msg =>
        msg.id === newMessage.id ? { ...msg, memoStatus: 'active' as const } : msg
      );
      setChatMessages(finalUpdatedMessages);
      await saveChatMessages(finalUpdatedMessages);
      
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

      // 시스템 프롬프트 생성
      const systemPrompt = generateSystemPrompt();

      // 대화 히스토리 구성 (AI와 사용자 메시지만 포함, 최근 10개로 제한)
      const conversationHistory = currentMessages
        .filter(msg => msg.type === 'user' || msg.type === 'ai')
        .slice(-10)
        .map(msg => ({
          parts: [{ text: msg.content }],
          role: msg.type === 'user' ? 'user' : 'model'
        }));

      // 매번 시스템 프롬프트를 첫 번째 메시지로 포함
      const contents = [
        { parts: [{ text: systemPrompt }], role: 'user' },
        { parts: [{ text: '메모 관리 어시스턴트로 준비되었습니다. 메모와 관련해서 무엇을 도와드릴까요?' }], role: 'model' },
        ...conversationHistory,
        { parts: [{ text: userMessage }], role: 'user' }
      ];

      // Function calling 지원을 위한 tools 추가
      const tools = [{
        functionDeclarations: getMemoTools()
      }];
      

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: contents,
          tools: tools,
          toolConfig: {
            functionCallingConfig: {
              mode: "ANY"
            }
          }
        })
      });

      const data = await response.json();
      
      
      if (response.ok && data.candidates && data.candidates[0]?.content?.parts) {
        const parts = data.candidates[0].content.parts;
        
        // Function call이 있는지 확인
        const functionCall = parts.find((part: any) => part.functionCall);
        
        if (functionCall) {
          // Function call 실행
          const toolResult = await executeMemoTool(
            functionCall.functionCall.name,
            functionCall.functionCall.args
          );
          
          // Function call 결과를 다시 AI에게 전송하여 최종 답변 생성
          const followUpContents = [
            ...contents,
            {
              parts: [{
                functionCall: {
                  name: functionCall.functionCall.name,
                  args: functionCall.functionCall.args
                }
              }],
              role: 'model'
            },
            {
              parts: [{
                functionResponse: {
                  name: functionCall.functionCall.name,
                  response: toolResult
                }
              }],
              role: 'function'
            }
          ];
          
          const followUpResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: followUpContents,
              tools: tools
            })
          });
          
          const followUpData = await followUpResponse.json();
          
          if (followUpResponse.ok && followUpData.candidates && followUpData.candidates[0]?.content?.parts?.[0]?.text) {
            const aiResponse: ChatMessage = {
              id: Date.now().toString() + '_ai',
              content: followUpData.candidates[0].content.parts[0].text,
              timestamp: new Date(),
              type: 'ai',
            };

            const updatedMessagesWithAI = [...currentMessages, aiResponse];
            setChatMessages(updatedMessagesWithAI);
            await saveChatMessages(updatedMessagesWithAI);
          } else {
            throw new Error(followUpData.error?.message || t('api.error'));
          }
        } else if (parts[0]?.text) {
          // 일반적인 텍스트 응답
          const aiResponse: ChatMessage = {
            id: Date.now().toString() + '_ai',
            content: parts[0].text,
            timestamp: new Date(),
            type: 'ai',
          };

          const updatedMessagesWithAI = [...currentMessages, aiResponse];
          setChatMessages(updatedMessagesWithAI);
          await saveChatMessages(updatedMessagesWithAI);
        }
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
    const isDeleted = message.memoStatus === 'deleted';
    const isPermanentlyDeleted = message.memoStatus === 'permanentlyDeleted';
    
    return (
      <View style={[styles.messageContainer, isRightAligned ? styles.userMessage : styles.aiMessage]}>
        <View style={[
          styles.messageBubble, 
          isRecord ? styles.recordBubble : (isUser ? styles.userBubble : styles.aiBubble),
          isPermanentlyDeleted && styles.permanentlyDeletedBubble
        ]}>
          <Text style={[
            styles.messageText, 
            isRecord ? styles.recordText : (isUser ? styles.userText : styles.aiText),
            isDeleted && styles.deletedText,
            isPermanentlyDeleted && styles.permanentlyDeletedText
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
    permanentlyDeletedBubble: {
      opacity: 0.4,
    },
    deletedText: {
      textDecorationLine: 'line-through',
      textDecorationStyle: 'solid',
    },
    permanentlyDeletedText: {
      textDecorationLine: 'line-through',
      textDecorationStyle: 'solid',
      opacity: 0.6,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          ref={flatListRef}
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