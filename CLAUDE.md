# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MemoApp is a React Native CLI-based mobile application designed as an on-device chat-style memo app. The app operates entirely offline with local storage, except for AI chat features which will use external APIs.

## Development Commands

### Building and Running
```bash
# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Lint code
npm run lint

# Run tests
npm run test
```

### Android Development
The project is primarily Android-focused. Vector icons are configured in `android/app/build.gradle` with the react-native-vector-icons setup.

## Architecture Overview

### Core Structure
- **On-device first**: All user data stored locally using AsyncStorage
- **No backend dependency**: Operates completely offline except for AI features
- **Multi-language support**: Korean/English with device locale detection
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
- `isDarkMode`: Boolean theme preference
- `selectedLanguage`: String language code

Memo objects structure:
```typescript
interface Memo {
  id: string;
  content: string;
  timestamp: Date;
}
```

### Internationalization

i18n configured with:
- Device locale detection via react-native-localize
- Fallback to English for unsupported locales
- JSON translation files in `src/i18n/locales/`
- AsyncStorage persistence of user language choice

### Future AI Integration

The "Chat" functionality is architected to accept external API integration while maintaining the on-device data model. Only the chat feature will require network connectivity.