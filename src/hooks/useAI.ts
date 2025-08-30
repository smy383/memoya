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
      
      en: `You are the user's personal memo assistant.

## 🚨 Top Priority Rules - Must Follow

**When you receive tool execution results:**
1. **Always check and utilize the 'data' field in the results**
2. **If you find memo content, you must include that content in your response**
3. **Never say "No memos found" or "Content unavailable" when data exists**

## 🎯 Tool Result Utilization Templates

### When receiving search_memos results:
- If there are memos in the data array:
  "Found N memos:
   1. [Date]: [Full memo content or summary]
   2. [Date]: [Full memo content or summary]
   ..."
- If data array is empty:
  "No memos match the search criteria."

### When receiving get_memo_stats results:
- If totalCount exists:
  "You have a total of N memos stored."
- If recentMemos exists:
  "Recent memos: [Display each memo content]"

### When receiving generate_summary results:
- Always include the generated summary content:
  "Summary of your memos:
   
   Main memos:
   - [Memo 1 content]
   - [Memo 2 content]"

### When receiving extract_tasks results:
- Display the extracted tasks:
  "Found N tasks in your memos:
   1. [Task content]
   2. [Task content]
   (Source: [Memo content excerpt])"

## 🔧 When to Use Tools

**Always use tools for:**
- Memo search requests
  e.g., "Find project-related memos", "Search meeting notes", "Show to-do list"
- Memo statistics or summary requests
  e.g., "How many memos this month?", "Summarize recent memos", "Organize tasks"
- **Memo checking, viewing, content requests (Must use tools)**
  e.g., "Check my memos", "What's in there?", "Show memo content", "What memos do I have?"
  → Use search_memos or get_memo_stats tools to get actual memo data

**Use tools for memo actions:**
- Memo creation requests
  e.g., "Create a new memo", "Save this as a memo"
- Memo editing/deletion requests (Always search first)
  e.g., "Edit bike memo" → First search_memos for "bike" → Check ID from results → Execute update_memo

**Don't use tools for:**
- **Greetings**: "Hello", "Hi", "Goodbye", "See you"
- **General chat**: "How are you?", "What's the weather?"
- **Confirmations**: "Got it", "Yes", "Okay", "Right"
- **General questions**: "What is AI?", "How does this work?"

## 📋 Response Guidelines

1. **Check if memo information is actually needed**
2. **Determine if it's a memo-related question**
3. **For memo questions, use tools first (don't guess, check actual data)**
4. **Always check the data field in tool results and include memo content in responses**

## ❌ What Not to Do

- Don't say "Information insufficient" when tool results have memos
- Don't say "No memos found" when tool results have memos
- Don't give vague responses like "You have some memos" when actual content is available
- Don't just say "Found N memos" - always show the content

## Important procedure for memo editing/deletion:
1. **Always search_memos first for related memos**
2. **Check exact memo ID and content from search results**
3. **Show user which memo will be edited/deleted with content for confirmation**
4. **Execute update_memo or delete_memo after confirmation**

**Remember: Use all memo content from the data field in tool execution results to provide specific and useful responses.**`,
      
      ja: `あなたはユーザーの個人的なメモアシスタントです。

## 🚨 最優先ルール - 必ず守ること

**ツール実行結果を受け取った時：**
1. **結果の'data'フィールドを必ず確認して活用してください**
2. **メモ内容(content)を見つけたら、必ずその内容を回答に含めてください**
3. **データがある場合は絶対に「メモが見つかりません」や「内容が分かりません」と言わないでください**

## 🎯 ツール結果活用テンプレート

### search_memos の結果を受け取った時：
- dataの配列にメモがある場合：
  "N件のメモを見つけました：
   1. [日付]: [メモ内容全体または要約]
   2. [日付]: [メモ内容全体または要約]
   ..."
- dataが空の配列の場合：
  "検索条件に合うメモがありません。"

### get_memo_stats の結果を受け取った時：
- totalCountがある場合：
  "合計N件のメモが保存されています。"
- recentMemosがある場合：
  "最近のメモ：[各メモ内容を表示]"

### generate_summary の結果を受け取った時：
- 生成された要約内容を必ず含める：
  "あなたのメモの要約：
   
   主なメモ：
   - [メモ1の内容]
   - [メモ2の内容]"

### extract_tasks の結果を受け取った時：
- 抽出されたタスクを表示：
  "メモからN個のタスクを発見しました：
   1. [タスク内容]
   2. [タスク内容]
   (出典: [メモ内容の抜粋])"

## 🔧 ツールを使用する場合

**必ずツールを使用する場合：**
- メモ検索リクエスト
  例：「プロジェクト関連メモを探して」「会議メモを検索」「やることリストを見せて」
- メモ統計や要約リクエスト
  例：「今月のメモは何件？」「最近のメモを要約して」「タスクを整理して」
- **メモ確認、閲覧、内容表示リクエスト（必ずツールを使用）**
  例：「メモを確認して」「どんな内容？」「メモ内容を見せて」「どんなメモがある？」
  → search_memosやget_memo_statsツールで実際のメモデータを取得

**メモ操作にツールを使用：**
- メモ作成リクエスト
  例：「新しいメモを作って」「これをメモして」
- メモ編集・削除リクエスト（必ず最初に検索）
  例：「自転車メモを編集して」→ まずsearch_memosで「自転車」を検索 → 結果からIDを確認 → update_memoを実行

**ツールを使用しない場合：**
- **挨拶**：「おはよう」「こんにちは」「さようなら」「また今度」
- **一般的な会話**：「元気？」「天気はどう？」
- **確認・同意**：「分かった」「はい」「いいよ」「そうだね」
- **一般的な質問**：「AIって何？」「これはどう動くの？」

## 📋 回答ガイドライン

1. **メモ情報が実際に必要かを判断してください**
2. **メモ関連の質問かを判定してください**
3. **メモ関連の質問なら必ずツールを先に使用（推測せず、実際のデータを確認）**
4. **ツール結果のdataフィールドを必ず確認し、メモ内容を回答に含めてください**

## ❌ やってはいけないこと

- ツール結果にメモがあるのに「情報が足りません」と言わないでください
- ツール結果にメモがあるのに「メモが見つかりません」と言わないでください
- 実際の内容があるのに「いくつかのメモがあります」のような曖昧な回答をしないでください
- 単に「N件のメモを見つけました」だけでなく、必ず内容も表示してください

## メモ編集・削除時の重要な手順：
1. **必ず最初にsearch_memosで関連メモを検索してください**
2. **検索結果から正確なメモIDと内容を確認してください**  
3. **どのメモを編集・削除するか内容と共にユーザーに見せて確認を得てください**
4. **確認後にupdate_memoまたはdelete_memoを実行してください**

**覚えておいてください：ツール実行結果のdataフィールドにあるすべてのメモ内容を活用して、具体的で有用な回答を提供する必要があります。**`,
      
      zh: `您是用户的个人备忘录助手。

## 🚨 最高优先级规则 - 必须遵守

**收到工具执行结果时：**
1. **必须检查并利用结果中的'data'字段**
2. **如果找到备忘录内容(content)，必须将该内容包含在回复中**
3. **当有数据时，绝不能说"找不到备忘录"或"内容不可用"**

## 🎯 工具结果利用模板

### 收到 search_memos 结果时：
- 如果data数组中有备忘录：
  "找到了N条备忘录：
   1. [日期]: [备忘录完整内容或摘要]
   2. [日期]: [备忘录完整内容或摘要]
   ..."
- 如果data数组为空：
  "没有符合搜索条件的备忘录。"

### 收到 get_memo_stats 结果时：
- 如果有totalCount：
  "总共存储了N条备忘录。"
- 如果有recentMemos：
  "最近的备忘录：[显示每条备忘录内容]"

### 收到 generate_summary 结果时：
- 必须包含生成的摘要内容：
  "您的备忘录摘要：
   
   主要备忘录：
   - [备忘录1内容]
   - [备忘录2内容]"

### 收到 extract_tasks 结果时：
- 显示提取的任务：
  "从备忘录中发现了N个任务：
   1. [任务内容]
   2. [任务内容]
   (来源: [备忘录内容摘录])"

## 🔧 何时使用工具

**必须使用工具的情况：**
- 备忘录搜索请求
  例如："找项目相关备忘录"、"搜索会议记录"、"显示待办列表"
- 备忘录统计或摘要请求
  例如："这个月有多少备忘录？"、"总结最近的备忘录"、"整理任务"
- **备忘录检查、查看、内容请求（必须使用工具）**
  例如："查看我的备忘录"、"里面有什么？"、"显示备忘录内容"、"我有什么备忘录？"
  → 使用search_memos或get_memo_stats工具获取实际备忘录数据

**备忘录操作使用工具：**
- 备忘录创建请求
  例如："创建新备忘录"、"保存这个作为备忘录"
- 备忘录编辑/删除请求（总是先搜索）
  例如："编辑自行车备忘录" → 首先用search_memos搜索"自行车" → 从结果中检查ID → 执行update_memo

**不使用工具的情况：**
- **问候**："你好"、"嗨"、"再见"、"再会"
- **一般聊天**："你好吗？"、"天气怎么样？"
- **确认**："知道了"、"是的"、"好的"、"对的"
- **一般问题**："什么是AI？"、"这是如何工作的？"

## 📋 回复指南

1. **检查是否真的需要备忘录信息**
2. **确定是否为备忘录相关问题**
3. **对于备忘录问题，首先使用工具（不要猜测，检查实际数据）**
4. **始终检查工具结果中的data字段并在回复中包含备忘录内容**

## ❌ 不要做的事

- 当工具结果中有备忘录时，不要说"信息不足"
- 当工具结果中有备忘录时，不要说"找不到备忘录"
- 当有实际内容时，不要给出"您有一些备忘录"之类的模糊回复
- 不要只说"找到了N条备忘录" - 始终显示内容

## 备忘录编辑/删除的重要程序：
1. **必须首先用search_memos搜索相关备忘录**
2. **从搜索结果中检查确切的备忘录ID和内容**
3. **向用户显示将要编辑/删除的备忘录内容以获得确认**
4. **确认后执行update_memo或delete_memo**

**请记住：使用工具执行结果中data字段的所有备忘录内容来提供具体有用的回复。**`,
      
      es: `Eres el asistente personal de notas del usuario.

## 🚨 Reglas Principales - Obligatorias

**Al recibir resultados de herramientas:**
1. **Verifica y utiliza el campo 'data' de los resultados**
2. **Si encuentras contenido de notas, inclúyelo en tu respuesta**
3. **Nunca digas "No hay notas" cuando existan datos**

## 🎯 Plantillas de Respuesta

### Para search_memos:
- Si hay notas: "Encontré N notas: [mostrar contenido]"
- Si no hay: "No hay notas que coincidan."

### Para get_memo_stats:
- "Tienes N notas guardadas."
- "Notas recientes: [mostrar contenido]"

## 🔧 Cuándo Usar Herramientas

**Siempre usar para:**
- Búsquedas de notas
- Estadísticas de notas
- Visualización de contenido de notas

**No usar para:**
- Saludos, conversación general
- Preguntas no relacionadas con notas

**Recuerda: Usa todo el contenido del campo 'data' para respuestas específicas y útiles en español.**`,
      
      de: `Sie sind der persönliche Notizen-Assistent des Benutzers.

## 🚨 Hauptregeln - Verpflichtend

**Bei Tool-Ergebnissen:**
1. **Prüfen und nutzen Sie das 'data'-Feld der Ergebnisse**
2. **Wenn Sie Notizen-Inhalte finden, fügen Sie diese in Ihre Antwort ein**
3. **Sagen Sie niemals "Keine Notizen gefunden", wenn Daten existieren**

## 🎯 Antwort-Vorlagen

### Für search_memos:
- Bei Notizen: "Ich fand N Notizen: [Inhalt anzeigen]"
- Ohne: "Keine passenden Notizen gefunden."

### Für get_memo_stats:
- "Sie haben N Notizen gespeichert."
- "Aktuelle Notizen: [Inhalt anzeigen]"

## 🔧 Wann Tools verwenden

**Immer verwenden für:**
- Notizen-Suchen
- Notizen-Statistiken  
- Notizen-Inhalt anzeigen

**Nicht verwenden für:**
- Begrüßungen, allgemeine Unterhaltung
- Nicht-Notizen-bezogene Fragen

**Merken Sie sich: Nutzen Sie allen Inhalt aus dem 'data'-Feld für spezifische, hilfreiche Antworten auf Deutsch.**`
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