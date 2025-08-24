# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Memoya is a React Native TypeScript app that provides an AI-powered chat-based memo service. The app operates primarily on-device with only AI API calls to Google Gemini for chat functionality. All user data is stored locally using AsyncStorage.

## Development Commands

### Basic Commands
```bash
# Start Metro bundler
npm start

# Build and run on Android
npm run android

# Build and run on iOS (requires CocoaPods setup)
bundle install                 # First time only
bundle exec pod install        # After native deps changes
npm run ios

# Lint code
npm run lint

# Run tests
npm test
```

### Development Workflow
- Metro runs in background on port 8081
- Hot reload is enabled by default
- Force reload: R+R (Android) or R (iOS Simulator)
- Access dev menu: Ctrl+M (Android) or Cmd+M (iOS)

## Architecture Overview

### Core Architecture Principles
1. **On-device First**: All data stored locally except AI API calls
2. **Internationalization**: All text must be localized (Korean/English)
3. **Responsive Design**: Support phones (320-414px) and tablets (768-1024px)
4. **Theme System**: Light/Dark mode with system detection
5. **TypeScript**: Strict typing throughout

### Key Components Structure

**Navigation**: Bottom tab navigation with 3 main screens
- Chat: AI conversation + memo recording
- Memo: View and search saved memos
- Settings: Theme, language, app info

**Context Providers**:
- `ThemeProvider`: Manages light/dark mode and color schemes
- i18n integration: Automatic language detection with manual override

**Data Flow**:
- Messages stored via `StorageService` (AsyncStorage wrapper)
- AI responses via `GeminiService` (Google Generative AI)
- All operations maintain separation between memos and chat

### Design System

**Responsive Utilities** (`src/styles/dimensions.ts`):
- `wp(percentage)`: Width-based responsive sizing
- `hp(percentage)`: Height-based responsive sizing
- `responsiveFontSize(size)`: Adaptive font scaling
- `SPACING`: Consistent spacing system

**Color System** (`src/styles/colors.ts`):
- `LIGHT_COLORS` / `DARK_COLORS`: Complete theme definitions
- `getColors(scheme, systemScheme)`: Dynamic color resolution
- Automatic system theme detection

**Typography & Icons**:
- Vector icons via react-native-vector-icons (Ionicons)
- Responsive font sizing across device types

### API Integration

**Google Gemini Setup**:
- API key required in `src/screens/ChatScreen.tsx:20`
- Uses `gemini-pro` model for chat responses
- Context-aware conversations with message history

## Development Rules

### Code Organization
```
src/
├── components/      # Reusable UI components
├── contexts/        # React contexts (Theme)
├── locales/         # i18n translations (ko.json, en.json)
├── navigation/      # Navigation setup
├── screens/         # Main app screens
├── services/        # Business logic (Storage, AI)
├── styles/          # Design system
└── types/           # TypeScript definitions
```

### Critical Development Guidelines

**Styling Requirements**:
- Use theme-aware colors via `useTheme()` hook
- Apply responsive dimensions using utility functions
- Define styles within component functions to access theme context
- Never hardcode colors or dimensions

**Internationalization**:
- All user-facing text via `useTranslation()` hook
- Add new strings to both `ko.json` and `en.json`
- Use semantic keys (e.g., `chat.inputPlaceholder`)

**State Management**:
- Local component state for UI interactions
- AsyncStorage for persistent data
- Theme context for global theme state
- No external state management (Redux/Zustand)

**Message Types**:
- `user`: User input for AI chat
- `ai`: AI responses
- `memo`: User content marked for memorization
- All messages have `isMemory` boolean flag

### Testing & Quality

The project uses standard React Native testing setup with Jest. Always ensure new features maintain the established patterns for responsive design, theming, and internationalization.

### Critical Integration Points

**Google Gemini API**:
- Requires valid API key configuration
- Error handling for API failures
- Context management for conversation flow

**AsyncStorage**:
- JSON serialization for complex data
- Error handling for storage operations  
- Date deserialization on retrieval

**Vector Icons**:
- Auto-linked via React Native CLI
- Ionicons as primary icon set
- Responsive sizing via design system