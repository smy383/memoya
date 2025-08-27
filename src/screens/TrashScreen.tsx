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
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { Memo } from '../types';
import { getResponsiveFontSize } from '../utils/dimensions';
import { useChatRooms } from '../hooks/useChatRooms';

interface ExtendedMemo extends Memo {
  isFavorite?: boolean;
  title?: string;
}

interface TrashedMemo extends ExtendedMemo {
  deletedAt: Date;
}

const TrashScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { updateRoomMetadata, calculateRoomMetadata, chatRooms } = useChatRooms();
  const [trashedMemos, setTrashedMemos] = useState<TrashedMemo[]>([]);

  // 채팅방 이름 가져오기
  const getRoomName = (roomId?: string) => {
    if (!roomId) return t('memos.categories.legacy');
    const room = chatRooms.find(r => r.id === roomId);
    return room?.title || roomId;
  };

  // 카테고리 이름을 6자로 제한하여 반환
  const getCategoryDisplayName = (memo: TrashedMemo) => {
    const roomName = getRoomName(memo.roomId);
    return roomName.length > 6 ? roomName.substring(0, 6) + '...' : roomName;
  };

  useEffect(() => {
    loadTrashedMemos();
  }, []);

  const loadTrashedMemos = async () => {
    try {
      let allTrashedMemos: TrashedMemo[] = [];

      // 모든 AsyncStorage 키를 가져와서 trashedMemos로 시작하는 키들을 찾기
      const allKeys = await AsyncStorage.getAllKeys();
      const trashedKeys = allKeys.filter(key => key.startsWith('trashedMemos'));

      console.log('TrashScreen: Found trashed memo keys:', trashedKeys);

      // 각 휴지통 키에서 데이터 로드
      for (const key of trashedKeys) {
        const storedTrashedMemos = await AsyncStorage.getItem(key);
        if (storedTrashedMemos) {
          const parsedMemos = JSON.parse(storedTrashedMemos);
          console.log(`TrashScreen: Loaded ${parsedMemos.length} memos from ${key}`);
          const memosWithDates = parsedMemos.map((memo: any) => ({
            ...memo,
            timestamp: new Date(memo.timestamp),
            deletedAt: new Date(memo.deletedAt),
            // roomId 정보 추가 (키에서 추출)
            roomId: key === 'trashedMemos' ? undefined : key.replace('trashedMemos_', ''),
          }));
          allTrashedMemos = allTrashedMemos.concat(memosWithDates);
        }
      }

      // 삭제 시간 순으로 정렬 (최신순)
      allTrashedMemos.sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
      
      console.log('TrashScreen: Total trashed memos loaded:', allTrashedMemos.length);
      setTrashedMemos(allTrashedMemos);
    } catch (error) {
      console.error('Error loading trashed memos:', error);
    }
  };

  const restoreMemo = async (id: string) => {
    try {
      const memoToRestore = trashedMemos.find(memo => memo.id === id);
      if (!memoToRestore) return;

      // 복구할 메모 (deletedAt 필드 제거)
      const { deletedAt, ...restoredMemo } = memoToRestore;
      
      // 채팅방별 메모 키 사용
      const memosKey = restoredMemo.roomId ? `memos_${restoredMemo.roomId}` : 'memos';
      const existingMemos = await AsyncStorage.getItem(memosKey);
      const memos = existingMemos ? JSON.parse(existingMemos) : [];
      
      // 메모 목록에 추가
      memos.unshift(restoredMemo);
      await AsyncStorage.setItem(memosKey, JSON.stringify(memos));

      // 채팅방별 휴지통에서 제거
      const trashedMemosKey = restoredMemo.roomId ? `trashedMemos_${restoredMemo.roomId}` : 'trashedMemos';
      const storedTrashedMemos = await AsyncStorage.getItem(trashedMemosKey);
      if (storedTrashedMemos) {
        const currentTrashedMemos = JSON.parse(storedTrashedMemos);
        const updatedTrashedMemos = currentTrashedMemos.filter((memo: any) => memo.id !== id);
        await AsyncStorage.setItem(trashedMemosKey, JSON.stringify(updatedTrashedMemos));
      }
      
      // 전체 휴지통 목록 다시 로드
      await loadTrashedMemos();

      // 메타데이터 업데이트
      if (restoredMemo.roomId) {
        try {
          const metadata = await calculateRoomMetadata(restoredMemo.roomId);
          await updateRoomMetadata(restoredMemo.roomId, metadata);
        } catch (error) {
          console.error('Error updating room metadata after memo restoration:', error);
        }
      }

      Alert.alert('', t('trash.restoreSuccess'));
    } catch (error) {
      console.error('Error restoring memo:', error);
    }
  };

  const permanentlyDeleteMemo = async (id: string) => {
    try {
      const memoToDelete = trashedMemos.find(memo => memo.id === id);
      if (!memoToDelete) return;

      // 채팅방별 휴지통에서 완전 삭제
      const trashedMemosKey = memoToDelete.roomId ? `trashedMemos_${memoToDelete.roomId}` : 'trashedMemos';
      const storedTrashedMemos = await AsyncStorage.getItem(trashedMemosKey);
      if (storedTrashedMemos) {
        const currentTrashedMemos = JSON.parse(storedTrashedMemos);
        const updatedTrashedMemos = currentTrashedMemos.filter((memo: any) => memo.id !== id);
        await AsyncStorage.setItem(trashedMemosKey, JSON.stringify(updatedTrashedMemos));
      }
      
      // 전체 휴지통 목록 다시 로드
      await loadTrashedMemos();
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
    return date.toLocaleString(i18n.language === 'ko' ? 'ko-KR' : 
                              i18n.language === 'ja' ? 'ja-JP' :
                              i18n.language === 'zh' ? 'zh-CN' :
                              i18n.language === 'es' ? 'es-ES' :
                              i18n.language === 'de' ? 'de-DE' : 'en-US', {
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
        <View style={styles.memoTitleRow}>
          <Text style={styles.memoTitle} numberOfLines={1}>
            {item.title || item.content.substring(0, 10)}
          </Text>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryText}>
              {getCategoryDisplayName(item)}
            </Text>
          </View>
        </View>
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
    memoTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    memoTitle: {
      fontSize: getResponsiveFontSize(16),
      color: theme.colors.textSecondary,
      fontWeight: '500',
      flex: 1,
      marginRight: theme.spacing.xs,
    },
    categoryTag: {
      backgroundColor: theme.colors.textSecondary + '20',
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 2,
      borderRadius: 12,
      minWidth: 40,
    },
    categoryText: {
      fontSize: getResponsiveFontSize(11),
      color: theme.colors.textSecondary,
      fontWeight: '600',
      textAlign: 'center',
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