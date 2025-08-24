import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Message } from '../types/message';
import { StorageService } from '../services/storageService';
import { useTheme } from '../contexts/ThemeContext';
import { responsiveFontSize, SPACING } from '../styles/dimensions';

interface TrashItemProps {
  memo: Message;
  onRestore: (memoId: string) => void;
  onPermanentDelete: (memoId: string) => void;
  isPermanentlyDeleting?: boolean;
}

const TrashItem: React.FC<TrashItemProps> = ({ memo, onRestore, onPermanentDelete, isPermanentlyDeleting = false }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const formatDateTime = (date: Date | undefined) => {
    if (!date) return '';
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTitleAndPreview = (text: string) => {
    const lines = text.split('\n');
    const title = lines[0].length > 30 ? lines[0].substring(0, 30) + '...' : lines[0];
    const preview = text.length > 100 ? text.substring(0, 100) + '...' : text;
    return { title, preview };
  };

  const { title, preview } = getTitleAndPreview(memo.text);

  const itemStyles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      marginHorizontal: SPACING.md,
      marginVertical: SPACING.xs / 2,
      borderRadius: 8,
      padding: SPACING.sm,
      borderWidth: 1,
      borderColor: colors.borderLight,
      shadowColor: isPermanentlyDeleting ? 'transparent' : colors.text,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isPermanentlyDeleting ? 0 : 0.05,
      shadowRadius: isPermanentlyDeleting ? 0 : 2,
      elevation: isPermanentlyDeleting ? 0 : 1,
      opacity: isPermanentlyDeleting ? 0.1 : 0.7,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: SPACING.xs,
    },
    titleContainer: {
      flex: 1,
      marginRight: SPACING.sm,
    },
    title: {
      fontSize: responsiveFontSize(16),
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    dateTime: {
      fontSize: responsiveFontSize(12),
      color: colors.textSecondary,
    },
    deletedDate: {
      fontSize: responsiveFontSize(11),
      color: colors.error,
      fontStyle: 'italic',
    },
    content: {
      marginBottom: SPACING.xs,
    },
    preview: {
      fontSize: responsiveFontSize(13),
      color: colors.textSecondary,
      lineHeight: 18,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: SPACING.xs,
    },
    actionButton: {
      padding: SPACING.xs,
      borderRadius: 8,
      backgroundColor: colors.backgroundSecondary,
    },
    restoreButton: {
      backgroundColor: colors.primary + '20',
    },
    deleteButton: {
      backgroundColor: colors.error + '20',
    },
  });

  return (
    <View style={itemStyles.container}>
      <View style={itemStyles.header}>
        <View style={itemStyles.titleContainer}>
          <Text style={itemStyles.title}>{title}</Text>
          <Text style={itemStyles.dateTime}>{formatDateTime(memo.timestamp)}</Text>
          {memo.deletedAt && (
            <Text style={itemStyles.deletedDate}>
              {t('trash.deletedAt')} {formatDateTime(memo.deletedAt)}
            </Text>
          )}
        </View>
      </View>
      
      <View style={itemStyles.content}>
        <Text style={itemStyles.preview}>{preview}</Text>
      </View>

      <View style={itemStyles.actions}>
        <TouchableOpacity
          style={[itemStyles.actionButton, itemStyles.restoreButton]}
          onPress={() => onRestore(memo.id)}
        >
          <Icon name="refresh" size={responsiveFontSize(16)} color={colors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[itemStyles.actionButton, itemStyles.deleteButton]}
          onPress={() => onPermanentDelete(memo.id)}
        >
          <Icon name="trash" size={responsiveFontSize(16)} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const TrashScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [deletedMemos, setDeletedMemos] = useState<Message[]>([]);
  const [permanentlyDeleting, setPermanentlyDeleting] = useState<string[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      loadDeletedMemos();
    }, [])
  );

  const loadDeletedMemos = async () => {
    try {
      const deleted = await StorageService.getDeletedMessages();
      const deletedMemos = deleted
        .filter(msg => msg.isMemory)
        .sort((a, b) => {
          if (!a.deletedAt || !b.deletedAt) return 0;
          const dateA = a.deletedAt instanceof Date ? a.deletedAt : new Date(a.deletedAt);
          const dateB = b.deletedAt instanceof Date ? b.deletedAt : new Date(b.deletedAt);
          return dateB.getTime() - dateA.getTime();
        });
      setDeletedMemos(deletedMemos);
    } catch (error) {
      console.error('Error loading deleted memos:', error);
    }
  };

  const handleRestore = async (memoId: string) => {
    Alert.alert(
      t('trash.restore'),
      t('trash.restoreConfirm'),
      [
        {
          text: t('trash.cancel'),
          style: 'cancel',
        },
        {
          text: t('trash.restore'),
          onPress: async () => {
            try {
              await StorageService.restoreMessage(memoId);
              loadDeletedMemos();
              Alert.alert(t('trash.restored'), t('trash.restoredMessage'));
            } catch (error) {
              console.error('Error restoring memo:', error);
              Alert.alert(t('trash.error'), t('trash.restoreError'));
            }
          },
        },
      ]
    );
  };

  const handlePermanentDelete = (memoId: string) => {
    Alert.alert(
      t('trash.permanentDelete'),
      t('trash.permanentDeleteConfirm'),
      [
        {
          text: t('trash.cancel'),
          style: 'cancel',
        },
        {
          text: t('trash.permanentDelete'),
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. 먼저 삭제 중 상태로 만들어서 투명하게 보이기
              setPermanentlyDeleting(prev => [...prev, memoId]);
              
              // 2. 2초 후 실제로 삭제 실행
              setTimeout(async () => {
                try {
                  await StorageService.permanentlyDeleteMessage(memoId);
                  setPermanentlyDeleting(prev => prev.filter(id => id !== memoId));
                  loadDeletedMemos();
                } catch (deleteError) {
                  console.error('Error during permanent deletion:', deleteError);
                  setPermanentlyDeleting(prev => prev.filter(id => id !== memoId));
                }
              }, 2000);
            } catch (error) {
              console.error('Error permanently deleting memo:', error);
              setPermanentlyDeleting(prev => prev.filter(id => id !== memoId));
            }
          },
        },
      ]
    );
  };

  const handleEmptyTrash = () => {
    if (deletedMemos.length === 0) return;

    Alert.alert(
      t('trash.emptyTrash'),
      t('trash.emptyTrashConfirm'),
      [
        {
          text: t('trash.cancel'),
          style: 'cancel',
        },
        {
          text: t('trash.emptyTrash'),
          style: 'destructive',
          onPress: async () => {
            try {
              for (const memo of deletedMemos) {
                await StorageService.permanentlyDeleteMessage(memo.id);
              }
              loadDeletedMemos();
              Alert.alert(t('trash.trashEmptied'), t('trash.trashEmptiedMessage'));
            } catch (error) {
              console.error('Error emptying trash:', error);
            }
          },
        },
      ]
    );
  };

  const renderTrashItem = ({ item }: { item: Message }) => (
    <TrashItem 
      memo={item}
      onRestore={handleRestore}
      onPermanentDelete={handlePermanentDelete}
      isPermanentlyDeleting={permanentlyDeleting.includes(item.id)}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon 
        name="trash-outline" 
        size={responsiveFontSize(64)} 
        color={colors.textTertiary} 
      />
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {t('trash.emptyTrash')}
      </Text>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    headerTitle: {
      fontSize: responsiveFontSize(18),
      fontWeight: '600',
      color: colors.text,
    },
    emptyTrashButton: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: 8,
      backgroundColor: colors.error + '20',
    },
    emptyTrashButtonText: {
      fontSize: responsiveFontSize(14),
      fontWeight: '600',
      color: colors.error,
    },
    memosList: {
      flex: 1,
    },
    memosContainer: {
      paddingVertical: SPACING.sm,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: SPACING.xl,
    },
    emptyText: {
      fontSize: responsiveFontSize(16),
      textAlign: 'center',
      marginTop: SPACING.md,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('trash.title')}</Text>
        {deletedMemos.length > 0 && (
          <TouchableOpacity
            style={styles.emptyTrashButton}
            onPress={handleEmptyTrash}
          >
            <Text style={styles.emptyTrashButtonText}>
              {t('trash.emptyTrash')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={deletedMemos}
        renderItem={renderTrashItem}
        keyExtractor={(item) => item.id}
        style={styles.memosList}
        contentContainerStyle={styles.memosContainer}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};