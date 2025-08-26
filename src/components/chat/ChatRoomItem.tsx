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
}

const ChatRoomItem: React.FC<ChatRoomItemProps> = ({ 
  chatRoom, 
  onPress, 
  onLongPress,
  isCurrentRoom = false,
  isEditMode = false,
  onEdit,
  onDelete
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

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString(i18n.language === 'ko' ? 'ko-KR' : 
                                      i18n.language === 'ja' ? 'ja-JP' :
                                      i18n.language === 'zh' ? 'zh-CN' :
                                      i18n.language === 'es' ? 'es-ES' :
                                      i18n.language === 'de' ? 'de-DE' : 'en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (days === 1) {
      return safeT('common.yesterday', '어제');
    } else if (days < 7) {
      return t('common.daysAgo', { days: days.toString() }) || `${days}일 전`;
    } else {
      return date.toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : 
                                      i18n.language === 'ja' ? 'ja-JP' :
                                      i18n.language === 'zh' ? 'zh-CN' :
                                      i18n.language === 'es' ? 'es-ES' :
                                      i18n.language === 'de' ? 'de-DE' : 'en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: isCurrentRoom ? theme.colors.primary + '20' : theme.colors.surface,
      borderRadius: 12,
      marginHorizontal: theme.spacing?.md || 16,
      marginVertical: theme.spacing?.xs || 4,
      padding: theme.spacing?.md || 16,
      borderWidth: isCurrentRoom ? 2 : 1,
      borderColor: isCurrentRoom ? theme.colors.primary : theme.colors.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing?.xs || 4,
    },
    title: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: '600',
      color: isCurrentRoom ? theme.colors.primary : theme.colors.text,
      flex: 1,
      marginRight: theme.spacing?.sm || 8,
    },
    time: {
      fontSize: getResponsiveFontSize(12),
      color: theme.colors.textSecondary,
    },
    lastMessage: {
      fontSize: getResponsiveFontSize(14),
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing?.xs || 4,
      lineHeight: 18,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    counts: {
      flexDirection: 'row',
      gap: theme.spacing?.sm || 8,
    },
    countItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    countText: {
      fontSize: getResponsiveFontSize(12),
      color: theme.colors.textSecondary,
    },
    currentRoomIndicator: {
      fontSize: getResponsiveFontSize(12),
      color: theme.colors.primary,
      fontWeight: '500',
    },
    titleEditMode: {
      opacity: 0.7,
    },
    editActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing?.sm || 12,
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
      style={styles.container}
      onPress={() => onPress(chatRoom.id)}
      onLongPress={isEditMode ? undefined : () => onLongPress(chatRoom.id)}
      activeOpacity={0.7}
      disabled={isEditMode}
    >
      <View style={styles.header}>
        <Text style={[styles.title, isEditMode && styles.titleEditMode]} numberOfLines={1}>
          {chatRoom.title}
        </Text>
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
        ) : (
          <Text style={styles.time}>
            {formatTime(chatRoom.updatedAt)}
          </Text>
        )}
      </View>

      {chatRoom.lastMessage && (
        <Text style={styles.lastMessage} numberOfLines={2}>
          {chatRoom.lastMessage.type === 'record' ? '📝 ' : 
           chatRoom.lastMessage.type === 'ai' ? '🤖 ' : ''}
          {chatRoom.lastMessage.content}
        </Text>
      )}

      <View style={styles.footer}>
        <View style={styles.counts}>
          <View style={styles.countItem}>
            <Text style={styles.countText}>
              💬 {chatRoom.messageCount}
            </Text>
          </View>
          <View style={styles.countItem}>
            <Text style={styles.countText}>
              📝 {chatRoom.memoCount}
            </Text>
          </View>
        </View>
        
        {isCurrentRoom && (
          <Text style={styles.currentRoomIndicator}>
            {safeT('chatRooms.current', '현재')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default ChatRoomItem;