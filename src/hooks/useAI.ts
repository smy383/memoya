import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { API_CONFIG } from '../config/api';
import { ChatMessage, SourceMemo } from '../components/chat/ChatMessage';

export const useAI = () => {
  const { t } = useTranslation();
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiProcessingStatus, setAiProcessingStatus] = useState('');

  const detectLanguage = useCallback((text: string): string => {
    if (/[가-힣]/.test(text)) return 'ko';
    if (/[ひらがなカタカナ]/.test(text)) return 'ja';
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
    if (/[ñáéíóúü¿¡]/.test(text.toLowerCase())) return 'es';
    if (/[äöüß]/.test(text.toLowerCase())) return 'de';
    return 'en';
  }, []);

  const generateSystemPrompt = useCallback((userMessage: string): string => {
    const detectedLang = detectLanguage(userMessage);
    
    const prompts = {
      ko: `당신은 사용자의 개인 메모 도우미입니다. 

## 🚨 최우선 규칙 - 반드시 따라야 함

**도구 실행 결과를 받았을 때:**
1. **결과의 'data' 필드를 반드시 확인하고 활용하세요**
2. **메모 내용(content)을 찾았다면 반드시 그 내용을 답변에 포함시키세요**
3. **절대 "메모를 찾을 수 없습니다" 또는 "내용을 알 수 없습니다"라고 하지 마세요 (데이터가 있는 경우)**

## 🎯 도구 결과 활용 템플릿

### search_memos 결과를 받았을 때:
- data 배열에 메모가 있다면:
  "N개의 메모를 찾았습니다:
   1. [날짜]: [메모 내용 전체 또는 요약]
   2. [날짜]: [메모 내용 전체 또는 요약]
   ..."
- data가 빈 배열이면:
  "검색 조건에 맞는 메모가 없습니다."

### get_memo_stats 결과를 받았을 때:
- totalCount가 있다면:
  "총 N개의 메모가 저장되어 있습니다."
- recentMemos가 있다면:
  "최근 메모들: [각 메모 내용 표시]"

### generate_summary 결과를 받았을 때:
- summary와 memos가 있다면:
  "[요약 내용]
   
   주요 메모들:
   - [메모 1 내용]
   - [메모 2 내용]"

### extract_tasks 결과를 받았을 때:
- tasks 배열이 있다면:
  "N개의 작업을 발견했습니다:
   ✓ [작업 1]
   ✓ [작업 2]
   (출처: [메모 내용 일부])"

## 도구 사용 규칙

### ✅ 도구를 사용해야 하는 경우:
- 사용자가 구체적인 정보를 요청할 때
  예: "프로젝트 관련 메모 찾아줘", "회의 내용 검색해줘", "할 일 목록 보여줘"
- 메모 통계나 요약을 요청할 때
  예: "이번 달 메모 몇 개야?", "최근 메모 요약해줘", "할 일 정리해줘"
- **메모 확인, 조회, 내용 보기 요청 시 (반드시 도구 사용)**
  예: "메모 확인해줘", "어떤 내용인지 봐줘", "메모 내용 보여줘", "무슨 메모 있어?"
  → search_memos나 get_memo_stats 도구로 실제 메모 데이터 가져와야 함
- 과거 기록된 정보가 필요한 질문일 때
  예: "지난주에 뭐했지?", "그때 결정사항이 뭐였지?"
- 메모 생성 요청 시
  예: "새 메모 만들어줘", "이것을 메모해줘"
- 메모 수정/삭제 요청 시 (반드시 먼저 검색 후 진행)
  예: "자전거 메모 수정해줘" → 먼저 search_memos로 "자전거" 검색 → 결과에서 ID 확인 → update_memo 실행

### ❌ 절대 도구를 사용하지 말아야 하는 경우:
- **인사말**: "안녕하세요", "안녕", "잘가", "또 봐"
- **감사 표현**: "고마워", "감사합니다", "고맙습니다"
- **확인/동의**: "알겠어", "네", "좋아", "맞아", "그래"
- **일상 대화**: "오늘 날씨 어때?", "기분이 좋아", "피곤해"
- **단순 질문**: "몇 시야?", "오늘 뭐해?", "어떻게 지내?"
- **감정 표현**: "기뻐", "슬퍼", "화나", "답답해"

## 응답 방식
1. **먼저 사용자 메시지의 의도를 파악하세요**
2. **메모 정보가 실제로 필요한지 판단하세요**
3. **메모 관련 질문이면 반드시 도구부터 사용하세요 (추측하지 말고 실제 데이터 확인)**
4. **도구 실행 결과의 data 필드를 반드시 확인하고 메모 내용을 답변에 포함시키세요**
5. **불필요한 경우에만 자연스럽게 대화하세요**

## 🔴 금지 사항:
- 도구 결과에 메모가 있는데 "정보가 부족합니다"라고 하지 마세요
- 도구 결과에 메모가 있는데 "메모를 찾을 수 없습니다"라고 하지 마세요
- 도구 결과에 content가 있는데 "내용을 알 수 없습니다"라고 하지 마세요
- 단순히 "N개의 메모를 찾았습니다"만 답하지 마세요 - 반드시 내용도 표시하세요

## 메모 수정/삭제 시 중요한 절차:
1. **반드시 먼저 search_memos로 관련 메모를 검색하세요**
2. **검색 결과에서 정확한 메모 ID와 내용을 확인하세요**
3. **사용자에게 어떤 메모를 수정/삭제할지 내용과 함께 보여주고 확인받으세요**
4. **확인 후 update_memo 또는 delete_memo를 실행하세요**

**기억하세요: 도구 실행 결과의 data 필드에 있는 모든 메모 내용을 활용해서 구체적이고 유용한 답변을 제공해야 합니다.**`,
      
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
  }, [detectLanguage]);

  const validateAndEnhanceAIResponse = useCallback((aiResponse: string, toolResult: any, functionName: string): string => {
    // 도구 결과가 있는 경우 응답 품질 검증
    if (!toolResult || !toolResult.success || !toolResult.data) {
      return aiResponse;
    }

    // 문제가 있는 응답 패턴 감지
    const problematicPatterns = [
      /메모를 찾을 수 없습니다/i,
      /내용을 알 수 없습니다/i,
      /정보가 부족합니다/i,
      /데이터가 없습니다/i,
      /찾은 메모가 없습니다/i
    ];

    const hasProblematicResponse = problematicPatterns.some(pattern => pattern.test(aiResponse));

    // 실제로는 메모가 있는데 문제가 있는 응답인 경우
    if (hasProblematicResponse && toolResult.data) {
      console.warn('⚠️ AI가 부적절한 응답을 했습니다. 응답을 개선합니다:', aiResponse);
      
      // 도구별로 적절한 fallback 응답 생성
      switch (functionName) {
        case 'search_memos':
          if (Array.isArray(toolResult.data) && toolResult.data.length > 0) {
            return toolResult.message || `${toolResult.data.length}개의 메모를 찾았습니다.\n\n${toolResult.data.map((memo: any, index: number) => 
              `${index + 1}. [${new Date(memo.timestamp).toLocaleString('ko-KR')}]\n${memo.content}`
            ).join('\n\n')}`;
          }
          break;
          
        case 'get_memo_stats':
          return toolResult.message || toolResult.data.message || '메모 통계를 조회했습니다.';
          
        case 'generate_summary':
          return toolResult.message || '메모 요약을 생성했습니다.';
          
        case 'extract_tasks':
          return toolResult.message || '작업 추출을 완료했습니다.';
      }
    }

    // 응답이 너무 짧고 일반적인 경우 (도구 결과가 있는데)
    if (aiResponse.length < 50 && toolResult.data && toolResult.message) {
      console.warn('⚠️ AI 응답이 너무 짧습니다. message로 보완합니다.');
      return toolResult.message;
    }

    return aiResponse;
  }, []);

  const extractSourceMemos = useCallback((toolResult: any): SourceMemo[] => {
    if (!toolResult || !toolResult.success || !toolResult.data) {
      return [];
    }

    // search_memos 결과에서 소스 메모 추출
    if (toolResult.data && Array.isArray(toolResult.data)) {
      return toolResult.data.map((memo: any) => ({
        id: memo.id,
        content: memo.content,
        timestamp: new Date(memo.timestamp),
        formattedDate: memo.formattedDate || new Date(memo.timestamp).toLocaleString('ko-KR'),
        relevance: 1.0, // 기본 관련도
      }));
    }

    // generate_summary 결과에서 소스 메모 추출
    if (toolResult.data.memos && Array.isArray(toolResult.data.memos)) {
      return toolResult.data.memos.map((memo: any, index: number) => ({
        id: `summary_${index}`,
        content: memo.content,
        timestamp: new Date(),
        formattedDate: memo.date,
        relevance: 0.8, // 요약에서는 약간 낮은 관련도
      }));
    }

    // extract_tasks 결과에서 소스 메모 추출
    if (toolResult.data.tasks && Array.isArray(toolResult.data.tasks)) {
      const uniqueMemos = new Map();
      toolResult.data.tasks.forEach((task: any) => {
        if (task.memoId && task.source) {
          uniqueMemos.set(task.memoId, {
            id: task.memoId,
            content: task.source,
            timestamp: new Date(),
            formattedDate: task.date,
            relevance: 0.9,
          });
        }
      });
      return Array.from(uniqueMemos.values());
    }

    return [];
  }, []);

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

  const sendToAI = async (
    userMessage: string, 
    currentMessages: ChatMessage[], 
    memoTools: any[], 
    executeMemoTool: (functionName: string, args: any) => Promise<any>
  ): Promise<ChatMessage | null> => {
    try {
      setIsAIProcessing(true);
      setAiProcessingStatus(getProcessingMessage('', 'analyzing'));

      const systemPrompt = generateSystemPrompt(userMessage);

      const conversationHistory = currentMessages
        .filter(msg => msg.type === 'user' || msg.type === 'ai')
        .slice(-10)
        .map(msg => ({
          parts: [{ text: msg.content }],
          role: msg.type === 'user' ? 'user' : 'model'
        }));

      const contents = [
        { parts: [{ text: systemPrompt }], role: 'user' },
        ...conversationHistory,
        { parts: [{ text: userMessage }], role: 'user' }
      ];

      const tools = [{ functionDeclarations: memoTools }];

      // 프록시 서버 또는 직접 API 호출 선택
      const apiUrl = API_CONFIG.USE_PROXY 
        ? `${API_CONFIG.PROXY_SERVER_URL}/api/gemini`
        : `https://generativelanguage.googleapis.com/v1beta/models/${API_CONFIG.GEMINI_MODEL}:generateContent?key=${API_CONFIG.GEMINI_API_KEY}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: contents,
          tools: tools,
          toolConfig: { functionCallingConfig: { mode: "ANY" } }
        })
      });

      const data = await response.json();
      
      if (response.ok && data.candidates && data.candidates[0]?.content?.parts) {
        const parts = data.candidates[0].content.parts;
        const functionCall = parts.find((part: any) => part.functionCall);
        
        if (functionCall) {
          setAiProcessingStatus(getProcessingMessage(functionCall.functionCall.name, 'executing'));
          
          const toolResult = await executeMemoTool(
            functionCall.functionCall.name,
            functionCall.functionCall.args
          );
          
          // 상세 디버깅 로그
          console.log('🔧 Tool Execution Details:');
          console.log('- Function:', functionCall.functionCall.name);
          console.log('- Args:', JSON.stringify(functionCall.functionCall.args, null, 2));
          console.log('- Result Success:', toolResult.success);
          console.log('- Result Data Length:', Array.isArray(toolResult.data) ? toolResult.data.length : 'Not Array');
          console.log('- Result Message Length:', toolResult.message ? toolResult.message.length : 0);
          console.log('- Full Tool Result:', JSON.stringify(toolResult, null, 2));
          
          setAiProcessingStatus(getProcessingMessage(functionCall.functionCall.name, 'generating'));
          
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
          
          const followUpResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: followUpContents,
              tools: tools
            })
          });
          
          const followUpData = await followUpResponse.json();
          
          if (followUpResponse.ok && followUpData.candidates && followUpData.candidates[0]?.content?.parts?.[0]?.text) {
            // 소스 메모 추출
            const sourceMemos = extractSourceMemos(toolResult);
            let aiResponseContent = followUpData.candidates[0].content.parts[0].text;
            
            // AI 원본 응답 로깅
            console.log('🤖 AI Original Response:');
            console.log('- Length:', aiResponseContent.length);
            console.log('- Content Preview:', aiResponseContent.substring(0, 200) + (aiResponseContent.length > 200 ? '...' : ''));
            
            // AI 응답 검증 및 개선
            const originalResponse = aiResponseContent;
            aiResponseContent = validateAndEnhanceAIResponse(aiResponseContent, toolResult, functionCall.functionCall.name);
            
            if (originalResponse !== aiResponseContent) {
              console.log('✅ AI Response Enhanced:');
              console.log('- New Length:', aiResponseContent.length);
              console.log('- Enhanced Preview:', aiResponseContent.substring(0, 200) + (aiResponseContent.length > 200 ? '...' : ''));
            }
            
            console.log('📊 Source Memos Count:', sourceMemos.length);
            
            return {
              id: Date.now().toString() + '_ai',
              content: aiResponseContent,
              timestamp: new Date(),
              type: 'ai',
              sourceMemos: sourceMemos,
            };
          } else {
            console.error('❌ Follow-up API Response Error:', followUpData);
            throw new Error(followUpData.error?.message || t('api.error'));
          }
        } else if (parts[0]?.text) {
          return {
            id: Date.now().toString() + '_ai',
            content: parts[0].text,
            timestamp: new Date(),
            type: 'ai',
          };
        }
      } else {
        throw new Error(data.error?.message || t('api.error'));
      }
    } catch (error) {
      console.error('AI API error:', error);
      Alert.alert(t('api.aiError'), t('api.error'));
      return null;
    } finally {
      setIsAIProcessing(false);
      setAiProcessingStatus('');
    }
  };

  return {
    isAIProcessing,
    aiProcessingStatus,
    sendToAI,
  };
};