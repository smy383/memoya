# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MemoApp is a React Native CLI-based mobile application designed as an on-device chat-style memo app. The app operates entirely offline with local storage, except for AI chat features which will use external APIs.

## Development Commands

### Building and Running
```bash
# Start Metro bundler (required before running app)
npm start

# Run on Android (starts emulator if needed)
npm run android

# Run on iOS (requires CocoaPods setup)
npm run ios

# Clean rebuild (if experiencing cache issues)
npm start -- --reset-cache

# Lint code
npm run lint

# Run tests
npm run test
```

### Troubleshooting Common Issues
- **Metro port conflicts**: Kill existing processes with `lsof -ti:8081 | xargs kill -9`
- **Module resolution errors**: Delete `node_modules` and `package-lock.json`, then `npm install`
- **Android build issues**: Ensure emulator is running and vector icons are configured

### Android Development Focus
The project is Android-focused with vector icons configured in `android/app/build.gradle`. The app uses:
- React Native 0.81.0
- TypeScript with strict typing
- Node.js >=18 requirement

## Architecture Overview

### Core Structure
- **On-device first**: All user data stored locally using AsyncStorage
- **No backend dependency**: Operates completely offline except for AI features
- **Multi-language support**: 6 languages (Korean, English, Japanese, Chinese, Spanish, German) with device locale detection
- **Responsive design**: Supports both phone and tablet layouts

### Key Architectural Patterns

**Context-based State Management**: 
- `ThemeContext` manages dark/light mode with AsyncStorage persistence
- i18n initialization handles language preference with fallbacks

**Navigation Structure**:
- Bottom tab navigation with three main screens: Chat, Memos, Settings
- React Navigation v6 with TypeScript type safety via `RootTabParamList`

**Data Flow**:
- Memos stored in AsyncStorage as JSON array
- Theme preferences persisted to AsyncStorage
- Language settings saved with react-native-localize integration
- All data operations are async with error handling

### Screen Responsibilities

**ChatScreen**: Primary interface with text input and dual-action buttons (Record/Chat)
- "Record" saves to local memos immediately
- "Chat" reserved for future AI API integration

**MemosScreen**: Displays local memos with search and delete functionality
- Real-time search filtering
- Date/time sorting with Korean locale formatting
- Long-press to delete with confirmation

**SettingsScreen**: Manages app-level preferences
- Theme toggle with immediate visual feedback
- Language switching with AsyncStorage persistence
- App version display

### Styling System

**Theme Architecture**:
- Centralized theme objects in `utils/theme.ts` (light/dark variants)
- Responsive utilities in `utils/dimensions.ts` for tablet/phone adaptations
- Color tokens and spacing system for consistency

**Responsive Design**:
- `isTablet` detection based on screen width (>=768px)
- `getResponsiveFontSize()` scales typography
- Dynamic layout adjustments throughout components

### Data Persistence Strategy

All app data uses AsyncStorage with these keys:
- `memos`: JSON array of memo objects
- `trashedMemos`: JSON array of deleted memo objects with deletedAt timestamp
- `chatMessages`: JSON array of chat conversation history
- `isDarkMode`: Boolean theme preference
- `selectedLanguage`: String language code

Memo objects structure:
```typescript
interface Memo {
  id: string;
  content: string;
  timestamp: Date;
}

interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  type: 'user' | 'ai' | 'record';
  memoStatus?: 'active' | 'deleted' | 'permanentlyDeleted';
}
```

### Internationalization

**CRITICAL RULE**: All user-facing text MUST support all 6 languages. NO hardcoded text allowed.

**Supported Languages**:
- Korean (ko) - 한국어
- English (en) - English  
- Japanese (ja) - 日本語
- Chinese (zh) - 中文
- Spanish (es) - Español
- German (de) - Deutsch

**Implementation Requirements**:
- ALL new features must include translations for all 6 languages
- NO hardcoded strings - use `t('translation.key')` exclusively
- Translation files must be updated simultaneously: `ko.json`, `en.json`, `ja.json`, `zh.json`, `es.json`, `de.json`
- Language switching follows circular pattern: ko → en → ja → zh → es → de → ko
- Device locale detection supports all 6 languages with English fallback

**i18n Configuration**:
- Device locale detection via react-native-localize
- Fallback to English for unsupported locales
- JSON translation files in `src/i18n/locales/`
- AsyncStorage persistence of user language choice

### AI Integration Architecture

**Memo Management Assistant**:
- Specialized AI assistant focused exclusively on memo management tasks
- Conversation continuity with last 10 message history for contextual responses
- Dynamic system prompt includes real-time user memo data for current context
- Automatic language detection and response matching (supports all 6 languages)
- Strict role boundaries: rejects non-memo-related requests

**Chat Message Types**:
- `'user'`: User chat messages (included in conversation history)
- `'ai'`: AI assistant responses (included in conversation history)  
- `'record'`: Memo records (excluded from AI conversation context)

**Key Implementation Rules**:
- Record messages are NOT included in AI conversation history
- AI assistant uses Function Calling to access memo data autonomously
- System prompt includes tool usage instructions for AI decision-making
- Chat conversation maintains separation from memo recording functionality
- Real-time processing status indicators show AI tool usage progress

## AI Tool Development Framework

**CRITICAL: Follow this exact framework when adding new AI tools for the memo management system.**

### Tool Definition Standard

Every new tool must follow this exact structure in `getMemoTools()`:

```javascript
{
  name: "tool_name",  // snake_case, descriptive action name
  description: "Clear description of what the tool does and when AI should use it",
  parameters: {
    type: "object",
    properties: {
      parameter_name: {
        type: "string|number|boolean",
        description: "Clear description of this parameter's purpose",
        enum: ["option1", "option2"]  // If applicable
      }
    },
    required: ["required_param1", "required_param2"]  // Optional
  }
}
```

### Tool Implementation Steps

**Step 1: Add Tool Definition**
Add new tool object to `getMemoTools()` array following the standard above.

**Step 2: Implement Tool Function**
Create corresponding function in the format `toolName()` with these requirements:
- Must be async function
- Must return standardized response object:
```javascript
{
  success: boolean,
  data: any,           // Tool-specific data
  message: string      // User-friendly status message
}
```

**Step 3: Add Tool Executor Case**
Add new case to `executeMemoTool()` switch statement:
```javascript
case 'new_tool_name':
  return await newToolName(args);
```

**Step 4: Add Processing Status Messages**
Add tool-specific status messages to `getProcessingMessage()`:
```javascript
new_tool_name: {
  analyzing: 'AI가 요청을 분석중입니다...',
  executing: 'Custom executing message for this tool...',
  generating: '답변을 생성하고 있습니다...'
}
```

**Step 5: Error Handling**
All tools must include comprehensive error handling:
```javascript
try {
  // Tool logic here
  return { success: true, data: result, message: "Success message" };
} catch (error) {
  return { success: false, message: "User-friendly error message" };
}
```

### Tool Categories and Examples

**Search Tools**: `search_memos`, `find_related_memos`
- Purpose: Data retrieval and filtering
- Parameters: keywords, dates, categories, limits

**Analysis Tools**: `analyze_sentiment`, `extract_keywords`, `find_patterns`  
- Purpose: Content analysis and insights
- Parameters: analysis types, date ranges, filters

**Generation Tools**: `generate_summary`, `create_report`, `suggest_actions`
- Purpose: Creating new content based on existing memos
- Parameters: format types, length limits, focus areas

**Statistics Tools**: `get_memo_stats`, `track_activity`, `measure_productivity`
- Purpose: Quantitative analysis and metrics
- Parameters: time periods, metric types, comparison modes

### AI Integration Requirements

**System Prompt Instructions**: Each tool must be documented in the system prompt with:
- Clear usage instructions for AI
- Example scenarios when to use the tool
- Parameter guidance for optimal results

**Function Calling Configuration**: All tools automatically available via:
- `toolConfig.functionCallingConfig.mode: "ANY"`
- Proper tool declarations in API calls
- Standardized response handling

### Testing and Validation

Before adding any new tool:
1. Test tool function independently with sample data
2. Verify AI can invoke tool correctly via natural language
3. Confirm processing status messages display properly
4. Validate error handling with invalid inputs
5. Test tool integration with existing conversation flow

### Tool Naming Conventions

- Use descriptive action verbs: `search`, `analyze`, `generate`, `extract`
- Follow snake_case format: `search_memos`, `analyze_sentiment`
- Be specific about the domain: `memo_` prefix when applicable
- Avoid generic names: use `search_memos` not `search`

### Complete Example: Adding `generate_summary` Tool

**Step-by-step implementation example for adding a memo summarization tool:**

**Step 1: Add to getMemoTools()**
```javascript
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
}
```

**Step 2: Implement generateSummary function**
```javascript
const generateSummary = async (args: any) => {
  try {
    // 메모 로드 및 필터링 (search_memos와 유사한 로직)
    const activeMemos = await AsyncStorage.getItem('memos');
    const memos = activeMemos ? JSON.parse(activeMemos) : [];
    
    let filteredMemos = memos;
    
    // 필터링 로직 적용...
    if (args.keyword) { /* 키워드 필터링 */ }
    if (args.date_from || args.date_to) { /* 날짜 필터링 */ }
    
    // 요약 생성 로직
    const summaryData = {
      totalMemos: filteredMemos.length,
      keyTopics: extractKeyTopics(filteredMemos),
      summary: createSummaryText(filteredMemos, args.summary_length),
      timeRange: args.date_from && args.date_to ? 
        `${args.date_from} ~ ${args.date_to}` : '전체 기간'
    };
    
    return {
      success: true,
      data: summaryData,
      message: `${filteredMemos.length}개 메모의 요약을 생성했습니다.`
    };
  } catch (error) {
    return {
      success: false,
      message: '요약 생성 중 오류가 발생했습니다.'
    };
  }
};
```

**Step 3: Add to executeMemoTool**
```javascript
case 'generate_summary':
  return await generateSummary(args);
```

**Step 4: Add status messages**
```javascript
generate_summary: {
  analyzing: 'AI가 요청을 분석중입니다...',
  executing: '메모 요약을 생성하고 있습니다...',
  generating: '답변을 생성하고 있습니다...'
}
```

**Step 5: Update system prompt**
```javascript
- generate_summary: 메모 요약 생성, 기간별 또는 키워드별 필터링 가능
```

**Usage Examples:**
- "이번 달 메모들 요약해줘" → `generate_summary({ date_from: "2025-08-01", date_to: "2025-08-31" })`
- "프로젝트 관련 메모 간단히 요약해줘" → `generate_summary({ keyword: "프로젝트", summary_length: "brief" })`

## Development Notes

### Key Dependencies
- **@react-navigation/bottom-tabs**: Tab-based navigation system
- **@react-native-async-storage/async-storage**: Local data persistence
- **react-i18next + react-native-localize**: Internationalization with device detection
- **react-native-vector-icons**: Icon system (Ionicons configured)
- **react-native-safe-area-context**: Safe area handling for modern devices

### Critical Development Patterns
- **AsyncStorage Operations**: All data operations use try/catch with error logging
- **Theme Context Usage**: Components access theme via `useTheme()` hook, styles defined within component functions
- **Translation Keys**: Follow semantic naming (e.g., `chat.placeholder`, `settings.darkMode`)
- **Responsive Design**: Use `isTablet` boolean and `getResponsiveFontSize()` for adaptive layouts

### Testing and Debugging
- JavaScript logs available in React Native DevTools (type `j` in Metro terminal)
- Use Android-first development approach
- Hot reload enabled by default for rapid development