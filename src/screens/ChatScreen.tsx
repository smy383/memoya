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
import ChatMessageComponent, { ChatMessage } from '../components/chat/ChatMessage';
import { getResponsiveFontSize, isTablet } from '../utils/dimensions';
import { API_CONFIG } from '../config/api';

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
  const [message, setMessage] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiProcessingStatus, setAiProcessingStatus] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // 현재 채팅방 정보 가져오기 - route params 우선 사용
  const routeRoomId = (route.params as any)?.roomId;
  const currentRoom = getCurrentRoom();
  const activeRoomId = routeRoomId || currentRoom?.id;
  
  console.log('ChatScreen: Route roomId:', routeRoomId);
  console.log('ChatScreen: Current room:', currentRoom?.id, currentRoom?.title);
  console.log('ChatScreen: Active room ID:', activeRoomId);
  
  // 메타데이터 업데이트 콜백
  const handleMetadataUpdate = useCallback(async (roomId: string) => {
    console.log('ChatScreen: Updating metadata for room:', roomId);
    try {
      const metadata = await calculateRoomMetadata(roomId);
      await updateRoomMetadata(roomId, metadata);
      console.log('ChatScreen: Metadata updated successfully:', metadata);
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
      },
      {
        name: "generate_summary",
        description: "사용자의 메모들을 요약합니다. 특정 기간이나 키워드로 필터링된 메모들의 핵심 내용을 추출하여 간결한 요약을 생성합니다.",
        parameters: {
          type: "object",
          properties: {
            date_from: {
              type: "string",
              description: "요약할 메모의 시작 날짜 (YYYY-MM-DD, 선택사항)"
            },
            date_to: {
              type: "string", 
              description: "요약할 메모의 종료 날짜 (YYYY-MM-DD, 선택사항)"
            },
            month: {
              type: "string",
              description: "특정 월 요약 (YYYY-MM 형식, 선택사항). 예: '2025-08'"
            },
            keyword: {
              type: "string",
              description: "특정 키워드와 관련된 메모만 요약 (선택사항)"
            },
            summary_length: {
              type: "string",
              description: "요약 길이 설정",
              enum: ["brief", "detailed", "comprehensive"]
            }
          }
        }
      },
      {
        name: "extract_tasks",
        description: "사용자의 메모에서 할일이나 작업 항목을 추출합니다. '해야 할 일', '하기', 'TODO' 등의 패턴을 인식하여 액션 아이템을 찾아냅니다.",
        parameters: {
          type: "object",
          properties: {
            date_from: {
              type: "string",
              description: "작업을 추출할 메모의 시작 날짜 (YYYY-MM-DD, 선택사항)"
            },
            date_to: {
              type: "string",
              description: "작업을 추출할 메모의 종료 날짜 (YYYY-MM-DD, 선택사항)"
            },
            keyword: {
              type: "string",
              description: "특정 키워드와 관련된 작업만 추출 (선택사항)"
            }
          }
        }
      }
    ];
  };

  const getProcessingMessage = (functionName: string, step: 'analyzing' | 'executing' | 'generating'): string => {
    const messages = {
      search_memos: {
        analyzing: t('ai.analyzing') || 'AI가 요청을 분석중입니다...',
        executing: t('ai.searchingMemos') || '메모를 검색하고 있습니다...',
        generating: t('ai.generatingResponse') || '답변을 생성하고 있습니다...'
      },
      get_memo_stats: {
        analyzing: t('ai.analyzing') || 'AI가 요청을 분석중입니다...',
        executing: t('ai.analyzingStats') || '메모 통계를 분석중입니다...',
        generating: t('ai.generatingResponse') || '답변을 생성하고 있습니다...'
      },
      generate_summary: {
        analyzing: t('ai.analyzing') || 'AI가 요청을 분석중입니다...',
        executing: t('ai.generatingSummary') || '메모 요약을 생성하고 있습니다...',
        generating: t('ai.generatingResponse') || '답변을 생성하고 있습니다...'
      },
      extract_tasks: {
        analyzing: t('ai.analyzing') || 'AI가 요청을 분석중입니다...',
        executing: t('ai.extractingTasks') || '할일 항목을 추출하고 있습니다...',
        generating: t('ai.generatingResponse') || '답변을 생성하고 있습니다...'
      }
    };

    return messages[functionName as keyof typeof messages]?.[step] || 
           (step === 'analyzing' ? 'AI가 요청을 분석중입니다...' : 
            step === 'executing' ? '작업을 처리중입니다...' : 
            '답변을 생성하고 있습니다...');
  };

  const detectLanguage = (text: string): string => {
    // 한국어 감지 (한글 문자가 포함되어 있으면)
    if (/[가-힣]/.test(text)) return 'ko';
    // 일본어 감지 (히라가나, 가타카나가 포함되어 있으면)
    if (/[ひらがなカタカナ]/.test(text)) return 'ja';
    // 중국어 감지 (중국어 간체/번체 문자가 포함되어 있으면)
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
    // 스페인어 감지 (스페인어 특수문자가 포함되어 있으면)
    if (/[ñáéíóúü¿¡]/.test(text.toLowerCase())) return 'es';
    // 독일어 감지 (독일어 특수문자가 포함되어 있으면)
    if (/[äöüß]/.test(text.toLowerCase())) return 'de';
    // 기본값은 영어
    return 'en';
  };

  const generateSystemPrompt = (userMessage: string): string => {
    const detectedLang = detectLanguage(userMessage);
    
    const prompts = {
      ko: `당신은 친근하고 도움이 되는 메모 어시스턴트입니다. 
- 사용자의 메모에 대한 질문에 답하기 위해 정보가 필요할 때만 제공된 도구를 사용하세요
- 일반적인 대화, 인사말, 메모와 관련 없는 질문에는 도구 없이 자연스럽게 응답하세요
- 답변은 한국어로 간결하고 도움이 되도록 작성하세요`,
      
      en: `You are a friendly and helpful memo assistant.
- Use the provided tools only when you need information about the user's memos to answer a question
- For general conversations, greetings, or questions not related to memos, respond naturally without using tools
- Provide concise and helpful responses in English`,
      
      ja: `あなたは親しみやすく役立つメモアシスタントです。
- ユーザーのメモに関する質問に答えるために情報が必要な場合のみ、提供されたツールを使用してください
- 一般的な会話、挨拶、メモに関係のない質問には、ツールを使わずに自然に応答してください
- 日本語で簡潔で役立つ回答を提供してください`,
      
      zh: `您是一个友好且有用的备忘录助手。
- 只有在需要用户备忘录信息来回答问题时才使用提供的工具
- 对于一般对话、问候或与备忘录无关的问题，请在不使用工具的情况下自然回应
- 请用中文提供简洁有用的回答`,
      
      es: `Eres un asistente de notas amigable y útil.
- Usa las herramientas proporcionadas solo cuando necesites información sobre las notas del usuario para responder una pregunta
- Para conversaciones generales, saludos o preguntas no relacionadas con notas, responde naturalmente sin usar herramientas
- Proporciona respuestas concisas y útiles en español`,
      
      de: `Sie sind ein freundlicher und hilfreicher Notiz-Assistent.
- Verwenden Sie die bereitgestellten Tools nur, wenn Sie Informationen über die Notizen des Benutzers benötigen, um eine Frage zu beantworten
- Für allgemeine Gespräche, Begrüßungen oder Fragen, die nicht mit Notizen zusammenhängen, antworten Sie natürlich ohne Tools
- Geben Sie prägnante und hilfreiche Antworten auf Deutsch`
    };
    
    return prompts[detectedLang as keyof typeof prompts] || prompts.en;
  };

  const executeMemoTool = async (functionName: string, args: any) => {
    try {
      switch (functionName) {
        case 'search_memos':
          return await searchMemos(args);
        case 'get_memo_stats':
          return await getMemoStats(args);
        case 'generate_summary':
          return await generateSummary(args);
        case 'extract_tasks':
          return await extractTasks(args);
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
      const memosKey = currentRoom ? `memos_${currentRoom.id}` : 'memos';
      const activeMemos = await AsyncStorage.getItem(memosKey);
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

  const generateSummary = async (args: any) => {
    try {
      // 메모 로드 및 필터링 (search_memos와 유사한 로직)
      const memosKey = currentRoom ? `memos_${currentRoom.id}` : 'memos';
      const activeMemos = await AsyncStorage.getItem(memosKey);
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
      
      if (filteredMemos.length === 0) {
        return {
          success: true,
          data: {
            totalMemos: 0,
            summary: '지정된 조건에 해당하는 메모가 없습니다.',
            keyTopics: [],
            timeRange: getTimeRangeText(args)
          },
          message: '조건에 맞는 메모가 없어 요약을 생성할 수 없습니다.'
        };
      }
      
      // 요약 데이터 생성
      const keyTopics = extractKeyTopics(filteredMemos);
      const summary = createSummaryText(filteredMemos, args.summary_length || 'brief');
      
      return {
        success: true,
        data: {
          totalMemos: filteredMemos.length,
          summary: summary,
          keyTopics: keyTopics,
          timeRange: getTimeRangeText(args),
          memos: filteredMemos.slice(0, 5).map((memo: any) => ({
            content: memo.content.substring(0, 100) + (memo.content.length > 100 ? '...' : ''),
            date: new Date(memo.timestamp).toLocaleString('ko-KR', { 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit' 
            })
          }))
        },
        message: `${filteredMemos.length}개 메모의 요약을 생성했습니다.`
      };
    } catch (error) {
      return {
        success: false,
        message: '요약 생성 중 오류가 발생했습니다.'
      };
    }
  };

  const extractKeyTopics = (memos: any[]): string[] => {
    const allText = memos.map(memo => memo.content).join(' ').toLowerCase();
    const words = allText.match(/\b[가-힣]{2,}|[a-zA-Z]{3,}\b/g) || [];
    
    // 단어 빈도 계산
    const wordCount: { [key: string]: number } = {};
    words.forEach(word => {
      if (word.length > 2) { // 2글자 이상만
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });
    
    // 빈도 순으로 정렬하고 상위 5개 반환
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  };

  const createSummaryText = (memos: any[], length: string): string => {
    const totalMemos = memos.length;
    const dateRange = {
      oldest: new Date(Math.min(...memos.map(m => new Date(m.timestamp).getTime()))),
      newest: new Date(Math.max(...memos.map(m => new Date(m.timestamp).getTime())))
    };
    
    let summary = `총 ${totalMemos}개의 메모가 있습니다. `;
    
    if (totalMemos > 1) {
      const daysDiff = Math.ceil((dateRange.newest.getTime() - dateRange.oldest.getTime()) / (1000 * 60 * 60 * 24));
      summary += `${dateRange.oldest.toLocaleDateString('ko-KR')}부터 ${dateRange.newest.toLocaleDateString('ko-KR')}까지 ${daysDiff}일 동안 작성되었습니다. `;
    }
    
    if (length === 'detailed' || length === 'comprehensive') {
      // 최근 몇 개 메모의 핵심 내용 포함
      const recentMemos = memos.slice(0, Math.min(3, totalMemos));
      summary += '\n\n주요 내용:\n';
      recentMemos.forEach((memo, index) => {
        const preview = memo.content.substring(0, 50) + (memo.content.length > 50 ? '...' : '');
        summary += `${index + 1}. ${preview}\n`;
      });
    }
    
    return summary;
  };

  const getTimeRangeText = (args: any): string => {
    if (args.month) return `${args.month}월`;
    if (args.date_from && args.date_to) return `${args.date_from} ~ ${args.date_to}`;
    if (args.date_from) return `${args.date_from} 이후`;
    if (args.date_to) return `${args.date_to} 이전`;
    return '전체 기간';
  };

  const extractTasks = async (args: any) => {
    try {
      // 메모 로드 및 필터링
      const memosKey = currentRoom ? `memos_${currentRoom.id}` : 'memos';
      const activeMemos = await AsyncStorage.getItem(memosKey);
      const memos = activeMemos ? JSON.parse(activeMemos) : [];
      
      let filteredMemos = memos;
      
      // 키워드 필터링
      if (args.keyword) {
        filteredMemos = filteredMemos.filter((memo: any) =>
          memo.content.toLowerCase().includes(args.keyword.toLowerCase())
        );
      }
      
      // 날짜 필터링
      if (args.date_from || args.date_to) {
        filteredMemos = filteredMemos.filter((memo: any) => {
          const memoDate = new Date(memo.timestamp);
          
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
      
      // 작업 항목 추출
      const tasks: any[] = [];
      
      filteredMemos.forEach((memo: any) => {
        const extractedTasks = findTasksInText(memo.content);
        extractedTasks.forEach(task => {
          tasks.push({
            task: task,
            source: memo.content.substring(0, 50) + (memo.content.length > 50 ? '...' : ''),
            date: new Date(memo.timestamp).toLocaleDateString('ko-KR'),
            memoId: memo.id
          });
        });
      });
      
      return {
        success: true,
        data: {
          tasks: tasks,
          totalTasks: tasks.length,
          totalMemos: filteredMemos.length,
          timeRange: getTimeRangeText(args)
        },
        message: `${filteredMemos.length}개 메모에서 ${tasks.length}개의 작업을 발견했습니다.`
      };
    } catch (error) {
      return {
        success: false,
        message: '작업 추출 중 오류가 발생했습니다.'
      };
    }
  };

  const findTasksInText = (text: string): string[] => {
    const tasks: string[] = [];
    
    // 할일 패턴들
    const patterns = [
      /(.{0,20})(해야\s*(?:할|하는)\s*(?:일|것|거))(.{0,30})/gi,
      /(.{0,20})(\w+하기)(.{0,30})/gi,
      /(todo\s*:?\s*)(.+?)(?=\n|$)/gi,
      /(.{0,20})(해봐야겠다|해야겠다|하자)(.{0,20})/gi,
      /([※-]\s*)(.+?)(?=\n|$)/gi,
      /(\d+\.\s*)(.+?)(?=\n|$)/gi,
    ];
    
    patterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        let task = '';
        if (match[2] && match[2].trim()) {
          // 패턴에 맞는 부분 추출
          task = match[0].trim();
        }
        
        if (task && task.length > 3 && task.length < 100) {
          // 중복 제거 및 정리
          const cleanTask = task
            .replace(/^\d+\.\s*/, '') // 숫자 제거
            .replace(/^[※-]\s*/, '') // 기호 제거
            .replace(/^todo\s*:?\s*/gi, '') // TODO 제거
            .trim();
          
          if (cleanTask && !tasks.some(existing => existing.includes(cleanTask) || cleanTask.includes(existing))) {
            tasks.push(cleanTask);
          }
        }
      }
    });
    
    return tasks.slice(0, 10); // 최대 10개까지
  };

  const getMemoStats = async (args: any) => {
    try {
      const memosKey = currentRoom ? `memos_${currentRoom.id}` : 'memos';
      const activeMemos = await AsyncStorage.getItem(memosKey);
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



  const handleRecord = async () => {
    if (!message.trim()) return;

    console.log('handleRecord: Starting record process');
    console.log('Current room:', currentRoom?.id);

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: message.trim(),
      timestamp: new Date(),
      type: 'record',
      memoStatus: 'active',
    };

    console.log('handleRecord: Created new message:', newMessage);

    // useChat 훅의 addMessage 사용
    const updatedMessages = addMessage(newMessage);
    console.log('handleRecord: Added message, total messages:', updatedMessages.length);

    try {
      const newMemo: Memo = {
        id: newMessage.id,
        content: newMessage.content,
        timestamp: newMessage.timestamp,
      };

      const memosKey = currentRoom ? `memos_${currentRoom.id}` : 'memos';
      console.log('handleRecord: Saving memo with key:', memosKey);
      
      const existingMemos = await AsyncStorage.getItem(memosKey);
      const memos = existingMemos ? JSON.parse(existingMemos) : [];
      
      memos.unshift(newMemo);
      await AsyncStorage.setItem(memosKey, JSON.stringify(memos));
      
      console.log('handleRecord: Memo saved successfully');
      
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

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: message.trim(),
      timestamp: new Date(),
      type: 'user',
    };

    // useChat 훅의 addMessage 사용
    const updatedMessages = addMessage(newMessage);
    
    setMessage('');
    
    // AI 응답 처리
    await sendToGemini(message.trim(), updatedMessages);
  };

  const sendToGemini = async (userMessage: string, currentMessages: ChatMessage[]) => {
    try {
      // AI 처리 시작
      setIsAIProcessing(true);
      setAiProcessingStatus(getProcessingMessage('', 'analyzing'));

      // API 설정에서 키와 모델명 가져오기
      const apiKey = API_CONFIG.GEMINI_API_KEY;
      const model = API_CONFIG.GEMINI_MODEL;

      // 시스템 프롬프트 생성 (사용자 메시지 언어에 맞춰)
      const systemPrompt = generateSystemPrompt(userMessage);

      // 대화 히스토리 구성 (AI와 사용자 메시지만 포함, 최근 10개로 제한)
      const conversationHistory = currentMessages
        .filter(msg => msg.type === 'user' || msg.type === 'ai')
        .slice(-10)
        .map(msg => ({
          parts: [{ text: msg.content }],
          role: msg.type === 'user' ? 'user' : 'model'
        }));

      // 대화 연속성을 위해 히스토리 포함
      const contents = [
        { parts: [{ text: systemPrompt }], role: 'user' },
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
      
      // 디버깅을 위한 응답 로깅
      console.log('Gemini API Response:', JSON.stringify(data, null, 2));
      
      if (response.ok && data.candidates && data.candidates[0]?.content?.parts) {
        const parts = data.candidates[0].content.parts;
        
        // Function call이 있는지 확인
        const functionCall = parts.find((part: any) => part.functionCall);
        
        if (functionCall) {
          // 도구 실행 상태 표시
          setAiProcessingStatus(getProcessingMessage(functionCall.functionCall.name, 'executing'));
          
          // Function call 실행
          const toolResult = await executeMemoTool(
            functionCall.functionCall.name,
            functionCall.functionCall.args
          );
          
          // 답변 생성 상태 표시
          setAiProcessingStatus(getProcessingMessage(functionCall.functionCall.name, 'generating'));
          
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

            addMessage(aiResponse);
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

          addMessage(aiResponse);
        }
      } else {
        throw new Error(data.error?.message || t('api.error'));
      }
    } catch (error) {
      console.error('Gemini API error:', error);
      Alert.alert(t('api.aiError'), t('api.error'));
    } finally {
      // AI 처리 완료
      setIsAIProcessing(false);
      setAiProcessingStatus('');
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
      <Text style={styles.headerTitle}>
        {currentRoom?.title || '채팅'}
      </Text>
      <View style={styles.headerPlaceholder} />
    </View>
  );

  const styles = StyleSheet.create({
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
      paddingHorizontal: theme.spacing.sm,
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

    processingContainer: {
      marginVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      alignItems: 'flex-start',
    },
    processingBubble: {
      maxWidth: '80%',
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderBottomLeftRadius: 4,
    },
    processingContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    processingText: {
      fontSize: getResponsiveFontSize(14),
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
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
          ListFooterComponent={isAIProcessing ? renderProcessingIndicator : null}
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