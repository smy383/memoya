import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { Memo } from '../types';
import { getResponsiveFontSize, isTablet } from '../utils/dimensions';

const ChatScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [message, setMessage] = useState('');

  const handleRecord = async () => {
    if (!message.trim()) return;

    try {
      const newMemo: Memo = {
        id: Date.now().toString(),
        content: message.trim(),
        timestamp: new Date(),
      };

      const existingMemos = await AsyncStorage.getItem('memos');
      const memos = existingMemos ? JSON.parse(existingMemos) : [];
      
      memos.unshift(newMemo);
      await AsyncStorage.setItem('memos', JSON.stringify(memos));
      
      setMessage('');
      Alert.alert('', t('chat.recordSuccess'));
    } catch (error) {
      console.error('Error saving memo:', error);
    }
  };

  const handleChat = () => {
    if (!message.trim()) return;
    Alert.alert('AI Chat', 'AI chat feature coming soon!');
    setMessage('');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      padding: theme.spacing.md,
    },
    inputContainer: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minHeight: isTablet ? 200 : 150,
    },
    textInput: {
      flex: 1,
      fontSize: getResponsiveFontSize(16),
      color: theme.colors.text,
      textAlignVertical: 'top',
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    button: {
      flex: 1,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius,
      padding: theme.spacing.md,
      alignItems: 'center',
    },
    recordButton: {
      backgroundColor: theme.colors.accent,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: getResponsiveFontSize(16),
      fontWeight: '600',
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={theme.colors.textSecondary}
            value={message}
            onChangeText={setMessage}
            multiline
          />
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.recordButton]}
            onPress={handleRecord}
          >
            <Text style={styles.buttonText}>{t('chat.record')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.button}
            onPress={handleChat}
          >
            <Text style={styles.buttonText}>{t('chat.chat')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ChatScreen;