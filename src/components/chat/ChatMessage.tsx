import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { getResponsiveFontSize } from '../../utils/dimensions';
import { useTranslation } from 'react-i18next';
import SourceMemosModal from './SourceMemosModal';
import MemoActionModal from './MemoActionModal';

interface SourceMemo {
  id: string;
  content: string;
  timestamp: Date;
  formattedDate: string;
  relevance?: number; // 관련도 점수 (0-1)
}

interface MemoActionData {
  actionType: 'create' | 'update' | 'delete';
  preview: any;
  originalToolResult?: any;
}

interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  type: 'user' | 'ai' | 'record';
  memoStatus?: 'active' | 'deleted' | 'permanentlyDeleted';
  sourceMemos?: SourceMemo[]; // AI 답변의 소스가 된 메모들
  pendingAction?: MemoActionData; // 승인 대기 중인 액션
}

interface ChatMessageProps {
  message: ChatMessage;
  onActionApprove?: (messageId: string, actionData: MemoActionData) => void;
  onActionCancel?: (messageId: string) => void;
}

const ChatMessageComponent: React.FC<ChatMessageProps> = ({ 
  message, 
  onActionApprove, 
  onActionCancel 
}) => {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  
  const isUser = message.type === 'user';
  const isRecord = message.type === 'record';
  const isAI = message.type === 'ai';
  const isRightAligned = isUser || isRecord;
  const isDeleted = message.memoStatus === 'deleted';
  const isPermanentlyDeleted = message.memoStatus === 'permanentlyDeleted';
  const hasSourceMemos = isAI && message.sourceMemos && message.sourceMemos.length > 0;
  const hasPendingAction = isAI && message.pendingAction;

  const styles = useMemo(() => StyleSheet.create({
    messageContainer: {
      marginVertical: theme.spacing?.xs || 4,
      paddingHorizontal: theme.spacing?.sm || 8,
    },
    userMessage: {
      alignItems: 'flex-end',
    },
    aiMessage: {
      alignItems: 'flex-start',
    },
    messageBubble: {
      maxWidth: '80%',
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 2,
    },
    userBubble: {
      backgroundColor: theme.colors.primary,
      borderBottomRightRadius: 4,
    },
    aiBubble: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderBottomLeftRadius: 4,
    },
    recordBubble: {
      backgroundColor: '#4CAF50', // 초록색
      borderBottomRightRadius: 4,
    },
    permanentlyDeletedBubble: {
      opacity: 0.4,
    },
    messageText: {
      fontSize: getResponsiveFontSize(16),
      lineHeight: 20,
    },
    userText: {
      color: '#FFFFFF',
    },
    aiText: {
      color: theme.colors.text,
    },
    recordText: {
      color: '#FFFFFF',
    },
    deletedText: {
      textDecorationLine: 'line-through',
      textDecorationStyle: 'solid',
    },
    permanentlyDeletedText: {
      textDecorationLine: 'line-through',
      textDecorationStyle: 'solid',
      opacity: 0.6,
    },
    messageTime: {
      fontSize: getResponsiveFontSize(11),
      marginTop: 2,
    },
    userTime: {
      color: 'rgba(255, 255, 255, 0.7)',
    },
    recordTime: {
      color: 'rgba(255, 255, 255, 0.7)',
    },
    aiTime: {
      color: theme.colors.textSecondary,
    },
    sourceMemosButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: 'rgba(33, 150, 243, 0.1)',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(33, 150, 243, 0.3)',
    },
    sourceMemosButtonText: {
      fontSize: getResponsiveFontSize(12),
      color: '#2196F3',
      marginLeft: 4,
      fontWeight: '500',
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: 'rgba(255, 152, 0, 0.1)',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255, 152, 0, 0.3)',
    },
    actionButtonText: {
      fontSize: getResponsiveFontSize(12),
      color: '#FF9800',
      marginLeft: 4,
      fontWeight: '500',
    },
  }), [theme.colors, theme.spacing]);



  return (
    <View style={[styles.messageContainer, isRightAligned ? styles.userMessage : styles.aiMessage]}>
      <View style={[
        styles.messageBubble,
        isRecord ? styles.recordBubble : (isUser ? styles.userBubble : styles.aiBubble),
        isPermanentlyDeleted && styles.permanentlyDeletedBubble
      ]}>
        <Text style={[
          styles.messageText,
          isRecord ? styles.recordText : (isUser ? styles.userText : styles.aiText),
          isDeleted && styles.deletedText,
          isPermanentlyDeleted && styles.permanentlyDeletedText
        ]}>
          {message.content}
        </Text>
        
        {hasSourceMemos && (
          <TouchableOpacity 
            style={styles.sourceMemosButton}
            onPress={() => setShowSourceModal(true)}
            activeOpacity={0.7}
          >
            <Icon name="document-text-outline" size={14} color="#2196F3" />
            <Text style={styles.sourceMemosButtonText}>
              {t('chat.sourceMemos', { count: message.sourceMemos!.length })}
            </Text>
          </TouchableOpacity>
        )}
        
        {hasPendingAction && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setShowActionModal(true)}
            activeOpacity={0.7}
          >
            <Icon name="checkmark-circle-outline" size={14} color="#FF9800" />
            <Text style={styles.actionButtonText}>
              {t('memoAction.approvalRequired')}
            </Text>
          </TouchableOpacity>
        )}
        
        <Text style={[
          styles.messageTime,
          isRecord ? styles.recordTime : (isUser ? styles.userTime : styles.aiTime)
        ]}>
          {message.timestamp.toLocaleTimeString(i18n.language === 'ko' ? 'ko-KR' : 
                                                    i18n.language === 'ja' ? 'ja-JP' :
                                                    i18n.language === 'zh' ? 'zh-CN' :
                                                    i18n.language === 'es' ? 'es-ES' :
                                                    i18n.language === 'de' ? 'de-DE' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
      
      {hasSourceMemos && (
        <SourceMemosModal
          visible={showSourceModal}
          sourceMemos={message.sourceMemos!}
          onClose={() => setShowSourceModal(false)}
        />
      )}
      
      {hasPendingAction && (
        <MemoActionModal
          visible={showActionModal}
          actionData={message.pendingAction!}
          onApprove={() => {
            setShowActionModal(false);
            onActionApprove?.(message.id, message.pendingAction!);
          }}
          onCancel={() => {
            setShowActionModal(false);
            onActionCancel?.(message.id);
          }}
        />
      )}
    </View>
  );
};

export default ChatMessageComponent;
export type { ChatMessage, SourceMemo, MemoActionData };