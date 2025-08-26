import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getResponsiveFontSize } from '../../utils/dimensions';

interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  type: 'user' | 'ai' | 'record';
  memoStatus?: 'active' | 'deleted' | 'permanentlyDeleted';
}

interface ChatMessageProps {
  message: ChatMessage;
}

const ChatMessageComponent: React.FC<ChatMessageProps> = ({ message }) => {
  const { theme } = useTheme();
  
  const isUser = message.type === 'user';
  const isRecord = message.type === 'record';
  const isRightAligned = isUser || isRecord;
  const isDeleted = message.memoStatus === 'deleted';
  const isPermanentlyDeleted = message.memoStatus === 'permanentlyDeleted';

  const styles = useMemo(() => StyleSheet.create({
    messageContainer: {
      marginVertical: theme.spacing?.xs || 4,
      paddingHorizontal: theme.spacing?.sm || 8,
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
    aiBubble: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderBottomLeftRadius: 4,
    },
    recordBubble: {
      backgroundColor: '#4CAF50', // 초록색
      borderBottomRightRadius: 4,
    },
    permanentlyDeletedBubble: {
      opacity: 0.4,
    },
    messageText: {
      fontSize: getResponsiveFontSize(16),
      lineHeight: 20,
    },
    userText: {
      color: '#FFFFFF',
    },
    aiText: {
      color: theme.colors.text,
    },
    recordText: {
      color: '#FFFFFF',
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
  }), [theme.colors, theme.spacing]);



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
          {message.timestamp.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </View>
  );
};

export default ChatMessageComponent;
export type { ChatMessage };