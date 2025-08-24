import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Message } from '../types/message';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const getBubbleStyle = () => {
    switch (message.type) {
      case 'user':
        return [styles.bubble, styles.userBubble];
      case 'ai':
        return [styles.bubble, styles.aiBubble];
      case 'memo':
        return [styles.bubble, styles.memoBubble];
      default:
        return styles.bubble;
    }
  };

  const getTextStyle = () => {
    switch (message.type) {
      case 'user':
        return styles.userText;
      case 'ai':
        return styles.aiText;
      case 'memo':
        return styles.memoText;
      default:
        return styles.defaultText;
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
      message.type === 'user' ? styles.userContainer : styles.otherContainer
    ]}>
      <View style={getBubbleStyle()}>
        <Text style={getTextStyle()}>{message.text}</Text>
        <Text style={styles.timestamp}>
          {formatTime(message.timestamp)}
          {message.isMemory && ' 📝'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 16,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  otherContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 4,
  },
  memoBubble: {
    backgroundColor: '#34C759',
    borderBottomRightRadius: 4,
  },
  userText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
  },
  aiText: {
    color: '#000000',
    fontSize: 16,
    lineHeight: 20,
  },
  memoText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
  },
  defaultText: {
    color: '#000000',
    fontSize: 16,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
    color: 'inherit',
  },
});