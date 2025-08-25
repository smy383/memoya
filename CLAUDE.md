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