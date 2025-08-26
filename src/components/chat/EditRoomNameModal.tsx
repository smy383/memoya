import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { getResponsiveFontSize } from '../../utils/dimensions';
import { ChatRoom } from '../../types';

interface EditRoomNameModalProps {
  visible: boolean;
  chatRoom: ChatRoom | null;
  onClose: () => void;
  onSave: (roomId: string, newTitle: string) => Promise<void>;
}

const EditRoomNameModal: React.FC<EditRoomNameModalProps> = ({
  visible,
  chatRoom,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [roomTitle, setRoomTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // i18n이 아직 로드되지 않은 경우 기본값 사용
  const safeT = (key: string, defaultValue?: string) => {
    try {
      return t(key) || defaultValue || key;
    } catch (error) {
      return defaultValue || key;
    }
  };

  useEffect(() => {
    if (visible && chatRoom) {
      setRoomTitle(chatRoom.title);
    }
  }, [visible, chatRoom]);

  const handleSave = async () => {
    const trimmedTitle = roomTitle.trim();
    
    if (!trimmedTitle) {
      Alert.alert(
        safeT('common.error', '오류'),
        safeT('chatRooms.emptyTitleError', '채팅방 이름을 입력해주세요.')
      );
      return;
    }

    if (!chatRoom) return;

    if (trimmedTitle === chatRoom.title) {
      onClose();
      return;
    }

    try {
      setIsLoading(true);
      await onSave(chatRoom.id, trimmedTitle);
      onClose();
    } catch (error) {
      Alert.alert(
        safeT('common.error', '오류'),
        safeT('chatRooms.editError', '채팅방 이름 변경 중 오류가 발생했습니다.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing?.lg || 24,
    },
    modal: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius,
      width: '100%',
      maxWidth: 400,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing?.lg || 24,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: getResponsiveFontSize(20),
      fontWeight: '600',
      color: theme.colors.text,
    },
    closeButton: {
      padding: theme.spacing?.xs || 4,
      opacity: isLoading ? 0.5 : 1,
    },
    content: {
      padding: theme.spacing?.lg || 24,
    },
    label: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: theme.spacing?.sm || 8,
    },
    textInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius,
      paddingHorizontal: theme.spacing?.md || 16,
      paddingVertical: theme.spacing?.sm || 12,
      fontSize: getResponsiveFontSize(16),
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
      marginBottom: theme.spacing?.lg || 24,
    },
    textInputFocused: {
      borderColor: theme.colors.primary,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: theme.spacing?.sm || 12,
    },
    button: {
      flex: 1,
      paddingVertical: theme.spacing?.sm || 12,
      paddingHorizontal: theme.spacing?.md || 16,
      borderRadius: theme.borderRadius,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
    },
    saveButtonDisabled: {
      backgroundColor: theme.colors.textSecondary,
      opacity: 0.6,
    },
    buttonText: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: '500',
    },
    cancelButtonText: {
      color: theme.colors.text,
    },
    saveButtonText: {
      color: '#FFFFFF',
    },
  }), [theme, isLoading]);

  if (!chatRoom) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {safeT('chatRooms.editTitle', '채팅방 이름 편집')}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Icon
                name="close-outline"
                size={24}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.label}>
              {safeT('chatRooms.roomName', '채팅방 이름')}
            </Text>
            <TextInput
              style={styles.textInput}
              value={roomTitle}
              onChangeText={setRoomTitle}
              placeholder={safeT('chatRooms.roomNamePlaceholder', '채팅방 이름을 입력하세요')}
              placeholderTextColor={theme.colors.textSecondary}
              maxLength={50}
              editable={!isLoading}
              selectTextOnFocus
              autoFocus
            />

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>
                  {safeT('common.cancel', '취소')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.saveButton,
                  (isLoading || !roomTitle.trim()) && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={isLoading || !roomTitle.trim()}
                activeOpacity={0.7}
              >
                <Text style={[styles.buttonText, styles.saveButtonText]}>
                  {isLoading 
                    ? safeT('common.saving', '저장 중...') 
                    : safeT('common.save', '저장')
                  }
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default EditRoomNameModal;