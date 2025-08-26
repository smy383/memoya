import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { API_CONFIG } from '../config/api';
import { ChatMessage } from '../components/chat/ChatMessage';

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
  }, [detectLanguage]);

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

      const apiKey = API_CONFIG.GEMINI_API_KEY;
      const model = API_CONFIG.GEMINI_MODEL;
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

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
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
          
          const followUpResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: followUpContents,
              tools: tools
            })
          });
          
          const followUpData = await followUpResponse.json();
          
          if (followUpResponse.ok && followUpData.candidates && followUpData.candidates[0]?.content?.parts?.[0]?.text) {
            return {
              id: Date.now().toString() + '_ai',
              content: followUpData.candidates[0].content.parts[0].text,
              timestamp: new Date(),
              type: 'ai',
            };
          } else {
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