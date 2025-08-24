import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Message } from '../types/message';
import { useTheme } from '../contexts/ThemeContext';
import { responsiveFontSize, SPACING, wp } from '../styles/dimensions';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { colors } = useTheme();
  
  const getBubbleStyle = () => {
    const baseStyle = [styles.bubble];
    const shadowStyle = (message.isDeleted || message.isPermanentlyDeleted) ? {
      elevation: 0,
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowColor: 'transparent'
    } : {};
    
    switch (message.type) {
      case 'user':
        return [...baseStyle, { backgroundColor: colors.userBubble }, shadowStyle];
      case 'ai':
        return [...baseStyle, { backgroundColor: colors.aiBubble }, shadowStyle];
      case 'memo':
        return [...baseStyle, { backgroundColor: colors.memoBubble }, shadowStyle];
      default:
        return [...baseStyle, shadowStyle];
    }
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text];
    const deletedStyle = (message.isDeleted || message.isPermanentlyDeleted) ? { textDecorationLine: 'line-through' as const } : {};
    
    switch (message.type) {
      case 'user':
        return [...baseStyle, { color: '#FFFFFF' }, deletedStyle];
      case 'ai':
        return [...baseStyle, { color: colors.text }, deletedStyle];
      case 'memo':
        return [...baseStyle, { color: '#FFFFFF' }, deletedStyle];
      default:
        return [...baseStyle, { color: colors.text }, deletedStyle];
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <View style={[
      styles.container,
      message.type === 'user' ? styles.userContainer : styles.otherContainer,
      { opacity: message.isPermanentlyDeleted ? 0.4 : 1.0 }
    ]}>
      <View style={getBubbleStyle()}>
        <Text style={getTextStyle()}>{message.text}</Text>
        <Text style={styles.timestamp}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.xs,
    marginHorizontal: SPACING.md,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  otherContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: wp(80),
    padding: SPACING.sm + SPACING.xs,
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  text: {
    fontSize: responsiveFontSize(16),
    lineHeight: 20,
  },
  timestamp: {
    fontSize: responsiveFontSize(12),
    marginTop: SPACING.xs,
    opacity: 0.7,
    color: 'inherit',
  },
});