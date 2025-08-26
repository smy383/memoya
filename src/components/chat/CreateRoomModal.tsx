import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getResponsiveFontSize } from '../../utils/dimensions';
import { useTranslation } from 'react-i18next';

interface CreateRoomModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateRoom: (title: string) => Promise<void>;
}

const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  visible,
  onClose,
  onCreateRoom,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [roomTitle, setRoomTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (visible) {
      setRoomTitle('');
      setIsCreating(false);
    }
  }, [visible]);

  const handleCreate = async () => {
    const title = roomTitle.trim();
    if (!title) {
      Alert.alert(t('common.error'), t('chatRooms.emptyTitleError'));
      return;
    }

    if (title.length > 50) {
      Alert.alert(t('common.error'), t('chatRooms.titleLengthError'));
      return;
    }

    try {
      setIsCreating(true);
      await onCreateRoom(title);
      onClose();
    } catch (error) {
      Alert.alert(t('common.error'), t('chatRooms.createError'));
    } finally {
      setIsCreating(false);
    }
  };

  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.lg,
      width: '85%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: getResponsiveFontSize(20),
      fontWeight: '600',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
    },
    inputContainer: {
      marginBottom: theme.spacing.lg,
    },
    inputLabel: {
      fontSize: getResponsiveFontSize(16),
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      fontWeight: '500',
    },
    textInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius,
      padding: theme.spacing.md,
      fontSize: getResponsiveFontSize(16),
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
    },
    textInputFocused: {
      borderColor: theme.colors.primary,
    },
    characterCount: {
      fontSize: getResponsiveFontSize(12),
      color: theme.colors.textSecondary,
      textAlign: 'right',
      marginTop: theme.spacing.xs,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    button: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    createButton: {
      backgroundColor: theme.colors.primary,
    },
    createButtonDisabled: {
      backgroundColor: theme.colors.textSecondary,
      opacity: 0.6,
    },
    buttonText: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: '600',
    },
    cancelButtonText: {
      color: theme.colors.text,
    },
    createButtonText: {
      color: '#FFFFFF',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('chatRooms.createNewRoom')}</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('chatRooms.roomName')}</Text>
            <TextInput
              style={styles.textInput}
              value={roomTitle}
              onChangeText={setRoomTitle}
              placeholder={t('chatRooms.roomNamePlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              maxLength={50}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            <Text style={styles.characterCount}>
              {roomTitle.length}/50
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isCreating}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, styles.cancelButtonText]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.button,
                styles.createButton,
                (!roomTitle.trim() || isCreating) && styles.createButtonDisabled,
              ]}
              onPress={handleCreate}
              disabled={!roomTitle.trim() || isCreating}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, styles.createButtonText]}>
                {isCreating ? t('chatRooms.creating') : t('chatRooms.create')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default CreateRoomModal;