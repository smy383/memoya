import React, { useMemo } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { getResponsiveFontSize } from '../../utils/dimensions';

interface ChatInputProps {
  message: string;
  onMessageChange: (text: string) => void;
  onRecord: () => void;
  onChat: () => void;
  isAIProcessing: boolean;
}

const ChatInput: React.FC<ChatInputProps> = React.memo(({
  message,
  onMessageChange,
  onRecord,
  onChat,
  isAIProcessing
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const isDisabled = !message.trim() || isAIProcessing;

  const styles = useMemo(() => StyleSheet.create({
    inputContainer: {
      paddingHorizontal: theme.spacing?.md || 16,
      paddingVertical: theme.spacing?.sm || 8,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    textInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: getResponsiveFontSize(16),
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
      maxHeight: 100,
      marginBottom: theme.spacing?.sm || 8,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: theme.spacing?.sm || 8,
    },
    button: {
      flex: 1,
      borderRadius: 20,
      paddingVertical: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    recordButton: {
      backgroundColor: '#4CAF50', // 초록색
    },
    chatButton: {
      backgroundColor: theme.colors.primary, // 파란색
    },
    disabledButton: {
      backgroundColor: theme.colors.textSecondary,
      opacity: 0.5,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: getResponsiveFontSize(16),
      fontWeight: '600',
    },
  }), [theme.colors, theme.spacing]);

  return (
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.textInput}
        value={message}
        onChangeText={onMessageChange}
        placeholder={t('chat.placeholder')}
        placeholderTextColor={theme.colors.textSecondary}
        multiline
        editable={!isAIProcessing}
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.recordButton,
            isDisabled && styles.disabledButton
          ]}
          onPress={onRecord}
          disabled={isDisabled}
        >
          <Text style={styles.buttonText}>{t('chat.record')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            styles.chatButton,
            isDisabled && styles.disabledButton
          ]}
          onPress={onChat}
          disabled={isDisabled}
        >
          <Text style={styles.buttonText}>{t('chat.chat')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default ChatInput;