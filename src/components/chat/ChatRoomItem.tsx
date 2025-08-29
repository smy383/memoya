import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { getResponsiveFontSize } from '../../utils/dimensions';
import { ChatRoom } from '../../types';

interface ChatRoomItemProps {
  chatRoom: ChatRoom;
  onPress: (roomId: string) => void;
  onLongPress: (roomId: string) => void;
  isCurrentRoom?: boolean;
  isEditMode?: boolean;
  onEdit?: (roomId: string) => void;
  onDelete?: (roomId: string) => void;
  onToggleFavorite?: (roomId: string) => void;
}

const ChatRoomItem: React.FC<ChatRoomItemProps> = ({ 
  chatRoom, 
  onPress, 
  onLongPress,
  isCurrentRoom = false,
  isEditMode = false,
  onEdit,
  onDelete,
  onToggleFavorite
}) => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();

  // i18n이 아직 로드되지 않은 경우 기본값 사용
  const safeT = (key: string, defaultValue?: string) => {
    try {
      return t(key) || defaultValue || key;
    } catch (error) {
      return defaultValue || key;
    }
  };


  const styles = useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: isCurrentRoom ? theme.colors.primary + '15' : '#E5E5E7',
      borderRadius: 12,
      marginHorizontal: 16,
      marginVertical: 6,
      padding: 18,
      // 선택되지 않은 채팅방만 그림자 적용
      shadowColor: isCurrentRoom ? 'transparent' : '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: isCurrentRoom ? 0 : 0.05,
      shadowRadius: isCurrentRoom ? 0 : 6,
      elevation: isCurrentRoom ? 0 : 2,
      borderWidth: 0,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 12,
    },
    title: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: getResponsiveFontSize(14),
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    titleEditMode: {
      opacity: 0.7,
    },
    editActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    favoriteButton: {
      position: 'absolute',
      top: 8,
      right: 8,
      padding: 8,
      borderRadius: 20,
    },
    actionButton: {
      padding: theme.spacing?.xs || 8,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    editActionButton: {
      backgroundColor: `${theme.colors.primary}15`,
    },
    deleteActionButton: {
      backgroundColor: '#ff475715',
    },
  }), [theme, isCurrentRoom]);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: isCurrentRoom ? theme.colors.primary + '15' : '#E5E5E7' }]}
      onPress={() => onPress(chatRoom.id)}
      onLongPress={isEditMode ? undefined : () => onLongPress(chatRoom.id)}
      activeOpacity={0.7}
      disabled={isEditMode}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, isEditMode && styles.titleEditMode]} numberOfLines={1}>
              {chatRoom.title}
            </Text>
            <Text style={styles.subtitle}>
              {chatRoom.messageCount}개 메시지, {chatRoom.memoCount}개 메모
            </Text>
          </View>
        </View>
        {isEditMode ? (
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editActionButton]}
              onPress={() => onEdit?.(chatRoom.id)}
              activeOpacity={0.7}
            >
              <Icon name="pencil" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteActionButton]}
              onPress={() => onDelete?.(chatRoom.id)}
              activeOpacity={0.7}
            >
              <Icon name="trash" size={16} color="#ff4757" />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* 즐겨찾기 버튼 */}
      {!isEditMode && (
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => onToggleFavorite?.(chatRoom.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon 
            name={chatRoom.isFavorite ? "star" : "star-outline"} 
            size={18} 
            color={chatRoom.isFavorite ? "#FFD700" : theme.colors.textSecondary} 
          />
        </TouchableOpacity>
      )}
      
      {/* 현재 방 표시 */}
      {isCurrentRoom && !isEditMode && (
        <View style={{ 
          position: 'absolute', 
          top: 8, 
          right: 50, 
          backgroundColor: theme.colors.primary,
          borderRadius: 6,
          paddingHorizontal: 8,
          paddingVertical: 2
        }}>
          <Text style={{
            fontSize: getResponsiveFontSize(10),
            color: '#FFFFFF',
            fontWeight: '600'
          }}>
            {safeT('chatRooms.current', '현재')}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default ChatRoomItem;