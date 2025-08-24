import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';

interface ChatInputProps {
  onSendMessage: (text: string, isMemory: boolean) => Promise<void>;
  loading?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, loading = false }) => {
  const [text, setText] = useState('');

  const handleSend = async (isMemory: boolean) => {
    if (text.trim() === '') {
      Alert.alert('알림', '메시지를 입력해주세요.');
      return;
    }

    try {
      await onSendMessage(text.trim(), isMemory);
      setText('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('오류', '메시지 전송에 실패했습니다.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={setText}
          placeholder="메시지를 입력하세요..."
          multiline
          maxLength={1000}
          editable={!loading}
        />
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.memoButton]}
          onPress={() => handleSend(true)}
          disabled={loading}
        >
          <Text style={styles.buttonText}>기록</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.chatButton]}
          onPress={() => handleSend(false)}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '전송중...' : '채팅'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  inputContainer: {
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  memoButton: {
    backgroundColor: '#34C759',
  },
  chatButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});