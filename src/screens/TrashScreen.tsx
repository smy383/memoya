import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { Memo } from '../types';
import { getResponsiveFontSize } from '../utils/dimensions';

interface ExtendedMemo extends Memo {
  isFavorite?: boolean;
  title?: string;
}

interface TrashedMemo extends ExtendedMemo {
  deletedAt: Date;
}

const TrashScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [trashedMemos, setTrashedMemos] = useState<TrashedMemo[]>([]);

  useEffect(() => {
    loadTrashedMemos();
  }, []);

  const loadTrashedMemos = async () => {
    try {
      const storedTrashedMemos = await AsyncStorage.getItem('trashedMemos');
      if (storedTrashedMemos) {
        const parsedMemos = JSON.parse(storedTrashedMemos);
        const memosWithDates = parsedMemos.map((memo: any) => ({
          ...memo,
          timestamp: new Date(memo.timestamp),
          deletedAt: new Date(memo.deletedAt),
        }));
        setTrashedMemos(memosWithDates);
      }
    } catch (error) {
      console.error('Error loading trashed memos:', error);
    }
  };

  const restoreMemo = async (id: string) => {
    try {
      const memoToRestore = trashedMemos.find(memo => memo.id === id);
      if (!memoToRestore) return;

      // 기존 메모들 불러오기
      const existingMemos = await AsyncStorage.getItem('memos');
      const memos = existingMemos ? JSON.parse(existingMemos) : [];
      
      // 복구할 메모 (deletedAt 필드 제거)
      const { deletedAt, ...restoredMemo } = memoToRestore;
      
      // 메모 목록에 추가
      memos.unshift(restoredMemo);
      await AsyncStorage.setItem('memos', JSON.stringify(memos));

      // 휴지통에서 제거
      const updatedTrashedMemos = trashedMemos.filter(memo => memo.id !== id);
      await AsyncStorage.setItem('trashedMemos', JSON.stringify(updatedTrashedMemos));
      setTrashedMemos(updatedTrashedMemos);

      Alert.alert('', t('trash.restoreSuccess'));
    } catch (error) {
      console.error('Error restoring memo:', error);
    }
  };

  const permanentlyDeleteMemo = async (id: string) => {
    try {
      const updatedTrashedMemos = trashedMemos.filter(memo => memo.id !== id);
      await AsyncStorage.setItem('trashedMemos', JSON.stringify(updatedTrashedMemos));
      setTrashedMemos(updatedTrashedMemos);
    } catch (error) {
      console.error('Error permanently deleting memo:', error);
    }
  };

  const confirmRestore = (id: string) => {
    Alert.alert(
      '',
      t('trash.restoreConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.restore'), onPress: () => restoreMemo(id) },
      ]
    );
  };

  const confirmPermanentDelete = (id: string) => {
    Alert.alert(
      '',
      t('trash.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('trash.permanentDelete'), onPress: () => permanentlyDeleteMemo(id), style: 'destructive' },
      ]
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTrashedItem = ({ item }: { item: TrashedMemo }) => (
    <View style={styles.memoItem}>
      <View style={styles.memoMainContent}>
        <Text style={styles.memoTitle} numberOfLines={1}>
          {item.title || item.content.substring(0, 10)}
        </Text>
        <Text style={styles.memoDate}>
          삭제일: {formatDate(item.deletedAt)}
        </Text>
      </View>
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => confirmRestore(item.id)}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
        >
          <Icon name="refresh-outline" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => confirmPermanentDelete(item.id)}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
        >
          <Icon name="trash-outline" size={18} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: getResponsiveFontSize(20),
      fontWeight: '600',
      color: theme.colors.text,
    },
    memosList: {
      flex: 1,
    },
    memoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    memoMainContent: {
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    memoTitle: {
      fontSize: getResponsiveFontSize(16),
      color: theme.colors.textSecondary,
      fontWeight: '500',
      marginBottom: theme.spacing.xs,
    },
    memoDate: {
      fontSize: getResponsiveFontSize(12),
      color: theme.colors.textSecondary,
    },
    actionButtonsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    actionButton: {
      padding: theme.spacing.xs,
      borderRadius: 4,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    emptyIcon: {
      marginBottom: theme.spacing.md,
    },
    emptyText: {
      fontSize: getResponsiveFontSize(16),
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('trash.title')}</Text>
        <View style={{ width: 24 }} />
      </View>
      
      {trashedMemos.length > 0 ? (
        <FlatList
          style={styles.memosList}
          data={trashedMemos}
          renderItem={renderTrashedItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Icon 
            name="trash-outline" 
            size={64} 
            color={theme.colors.textSecondary} 
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyText}>
            {t('trash.empty')}
          </Text>
        </View>
      )}
    </View>
  );
};

export default TrashScreen;