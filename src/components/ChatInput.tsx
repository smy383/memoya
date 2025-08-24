import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { responsiveFontSize, SPACING, wp } from '../styles/dimensions';

interface ChatInputProps {
  onSendMessage: (text: string, isMemory: boolean) => Promise<void>;
  loading?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, loading = false }) => {
  const [text, setText] = useState('');
  const { t } = useTranslation();
  const { colors } = useTheme();

  const handleSend = async (isMemory: boolean) => {
    if (text.trim() === '') {
      Alert.alert(t('chat.errorTitle'), t('chat.emptyMessage'));
      return;
    }

    try {
      await onSendMessage(text.trim(), isMemory);
      setText('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert(t('chat.errorTitle'), t('chat.errorSending'));
    }
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    inputContainer: {
      marginBottom: SPACING.sm,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: 20,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      fontSize: responsiveFontSize(16),
      maxHeight: 100,
      textAlignVertical: 'top',
      backgroundColor: colors.backgroundSecondary,
      color: colors.text,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    button: {
      flex: 1,
      paddingVertical: SPACING.sm,
      borderRadius: 20,
      alignItems: 'center',
      marginHorizontal: SPACING.xs,
    },
    memoButton: {
      backgroundColor: colors.secondary,
    },
    chatButton: {
      backgroundColor: colors.primary,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: responsiveFontSize(16),
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={setText}
          placeholder={t('chat.inputPlaceholder')}
          placeholderTextColor={colors.textSecondary}
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
          <Text style={styles.buttonText}>{t('chat.recordButton')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.chatButton]}
          onPress={() => handleSend(false)}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? t('chat.sending') : t('chat.chatButton')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

