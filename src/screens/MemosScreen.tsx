import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Clipboard } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { Memo } from '../types';
import { getResponsiveFontSize } from '../utils/dimensions';
import { useChatRooms } from '../hooks/useChatRooms';

interface ExtendedMemo extends Omit<Memo, 'roomId'> {
  isFavorite?: boolean;
  title?: string;
  roomId?: string; // 어느 채팅방에 속하는지 (레거시 메모는 undefined 가능)
}

interface TrashedMemo extends ExtendedMemo {
  deletedAt: Date;
}

const MemosScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { chatRooms, updateRoomMetadata, calculateRoomMetadata } = useChatRooms();
  const [memos, setMemos] = useState<ExtendedMemo[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filteredMemos, setFilteredMemos] = useState<ExtendedMemo[]>([]);
  const [selectedMemo, setSelectedMemo] = useState<ExtendedMemo | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const loadMemos = async () => {
    try {
      console.log('MemosScreen: Loading memos from chatRooms:', chatRooms.map(r => r.id));
      let allMemos: ExtendedMemo[] = [];

      // 모든 채팅방의 메모를 로드
      for (const room of chatRooms) {
        const roomMemosKey = `memos_${room.id}`;
        console.log('MemosScreen: Checking memos for room:', room.id, 'with key:', roomMemosKey);
        const storedMemos = await AsyncStorage.getItem(roomMemosKey);
        if (storedMemos) {
          const parsedMemos = JSON.parse(storedMemos);
          console.log('MemosScreen: Found', parsedMemos.length, 'memos for room:', room.id);
          const memosWithDates = parsedMemos.map((memo: any) => ({
            ...memo,
            timestamp: new Date(memo.timestamp),
            isFavorite: memo.isFavorite || false,
            title: memo.title || memo.content.substring(0, 10),
            roomId: room.id,
          }));
          allMemos = allMemos.concat(memosWithDates);
        } else {
          console.log('MemosScreen: No memos found for room:', room.id);
        }
      }

      // 추가로 모든 AsyncStorage 키를 확인해서 누락된 채팅방 메모가 있는지 체크
      const allKeys = await AsyncStorage.getAllKeys();
      const memoKeys = allKeys.filter(key => key.startsWith('memos_') && !chatRooms.some(room => key === `memos_${room.id}`));
      console.log('MemosScreen: Found additional memo keys not in chatRooms:', memoKeys);

      for (const key of memoKeys) {
        const storedMemos = await AsyncStorage.getItem(key);
        if (storedMemos) {
          const parsedMemos = JSON.parse(storedMemos);
          const roomId = key.replace('memos_', '');
          console.log('MemosScreen: Found', parsedMemos.length, 'memos for missing room:', roomId);
          const memosWithDates = parsedMemos.map((memo: any) => ({
            ...memo,
            timestamp: new Date(memo.timestamp),
            isFavorite: memo.isFavorite || false,
            title: memo.title || memo.content.substring(0, 10),
            roomId: roomId,
          }));
          allMemos = allMemos.concat(memosWithDates);
        }
      }

      // 레거시 메모도 로드 (기존 'memos' 키)
      const legacyMemos = await AsyncStorage.getItem('memos');
      if (legacyMemos) {
        const parsedLegacyMemos = JSON.parse(legacyMemos);
        const legacyMemosWithDates = parsedLegacyMemos.map((memo: any) => ({
          ...memo,
          timestamp: new Date(memo.timestamp),
          isFavorite: memo.isFavorite || false,
          title: memo.title || memo.content.substring(0, 10),
          roomId: undefined, // 레거시 메모
        }));
        allMemos = allMemos.concat(legacyMemosWithDates);
      }

      // 시간순으로 정렬 (최신순)
      allMemos.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      console.log('MemosScreen: Total memos loaded:', allMemos.length);
      setMemos(allMemos);
      setFilteredMemos(allMemos);
    } catch (error) {
      console.error('Error loading memos:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      console.log('MemosScreen: Screen focused, loading memos');
      loadMemos();
    }, []) // 의존성 제거하여 항상 새로고침
  );

  useEffect(() => {
    if (searchText.trim()) {
      const filtered = memos.filter(memo =>
        memo.content.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredMemos(filtered);
    } else {
      setFilteredMemos(memos);
    }
  }, [searchText, memos]);

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

  const moveToTrash = async (id: string) => {
    try {
      const memoToDelete = memos.find(memo => memo.id === id);
      if (!memoToDelete) return;

      // 휴지통으로 이동
      const trashedMemo: TrashedMemo = {
        ...memoToDelete,
        deletedAt: new Date(),
      };

      // 채팅방별 휴지통 키 결정
      const trashedMemosKey = memoToDelete.roomId ? `trashedMemos_${memoToDelete.roomId}` : 'trashedMemos';
      const existingTrashedMemos = await AsyncStorage.getItem(trashedMemosKey);
      const trashedMemos = existingTrashedMemos ? JSON.parse(existingTrashedMemos) : [];

      // 휴지통에 추가
      trashedMemos.unshift(trashedMemo);
      await AsyncStorage.setItem(trashedMemosKey, JSON.stringify(trashedMemos));

      // 원본 메모 목록에서 제거
      const memosKey = memoToDelete.roomId ? `memos_${memoToDelete.roomId}` : 'memos';
      const existingMemos = await AsyncStorage.getItem(memosKey);
      if (existingMemos) {
        const currentMemos = JSON.parse(existingMemos);
        const updatedMemos = currentMemos.filter((memo: any) => memo.id !== id);
        await AsyncStorage.setItem(memosKey, JSON.stringify(updatedMemos));
      }

      // UI 상태 업데이트
      const updatedDisplayMemos = memos.filter(memo => memo.id !== id);
      setMemos(updatedDisplayMemos);
      setFilteredMemos(updatedDisplayMemos.filter(memo =>
        !searchText.trim() ||
        memo.content.toLowerCase().includes(searchText.toLowerCase()) ||
        (memo.title && memo.title.toLowerCase().includes(searchText.toLowerCase()))
      ));

      // 메타데이터 업데이트
      if (memoToDelete.roomId) {
        try {
          const metadata = await calculateRoomMetadata(memoToDelete.roomId);
          await updateRoomMetadata(memoToDelete.roomId, metadata);
        } catch (error) {
          console.error('Error updating room metadata after memo deletion:', error);
        }
      }
    } catch (error) {
      console.error('Error moving memo to trash:', error);
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert(
      '',
      'Move this memo to trash?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), onPress: () => moveToTrash(id), style: 'destructive' },
      ]
    );
  };

  const toggleFavorite = async (id: string) => {
    try {
      const memoToUpdate = memos.find(memo => memo.id === id);
      if (!memoToUpdate) return;

      // 메모 상태 업데이트
      const updatedDisplayMemos = memos.map(memo =>
        memo.id === id ? { ...memo, isFavorite: !memo.isFavorite } : memo
      );
      setMemos(updatedDisplayMemos);
      setFilteredMemos(updatedDisplayMemos.filter(memo =>
        !searchText.trim() ||
        memo.content.toLowerCase().includes(searchText.toLowerCase()) ||
        (memo.title && memo.title.toLowerCase().includes(searchText.toLowerCase()))
      ));

      // 저장소 업데이트
      const memosKey = memoToUpdate.roomId ? `memos_${memoToUpdate.roomId}` : 'memos';
      const existingMemos = await AsyncStorage.getItem(memosKey);
      if (existingMemos) {
        const currentMemos = JSON.parse(existingMemos);
        const updatedStorageMemos = currentMemos.map((memo: any) =>
          memo.id === id ? { ...memo, isFavorite: !memoToUpdate.isFavorite } : memo
        );
        await AsyncStorage.setItem(memosKey, JSON.stringify(updatedStorageMemos));
      }
    } catch (error) {
      console.error('Error updating favorite:', error);
    }
  };

  const copyToClipboard = async (content: string) => {
    try {
      await Clipboard.setString(content);
      Alert.alert('', 'Copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const openMemoModal = (memo: ExtendedMemo) => {
    console.log('MemosScreen: Opening memo modal for memo:', memo.id);
    setSelectedMemo(memo);
    setEditTitle(memo.title || memo.content.substring(0, 10));
    setEditContent(memo.content);
    setIsModalVisible(true);
    console.log('MemosScreen: Modal visibility set to true');
  };

  const closeMemoModal = () => {
    setIsModalVisible(false);
    setSelectedMemo(null);
    setEditTitle('');
    setEditContent('');
  };

  const saveMemo = async () => {
    if (!selectedMemo || !editContent.trim()) return;

    try {
      // UI 상태 업데이트
      const updatedDisplayMemos = memos.map(memo =>
        memo.id === selectedMemo.id
          ? { ...memo, title: editTitle.trim() || editContent.substring(0, 10), content: editContent.trim() }
          : memo
      );
      setMemos(updatedDisplayMemos);
      setFilteredMemos(updatedDisplayMemos.filter(memo =>
        !searchText.trim() ||
        memo.content.toLowerCase().includes(searchText.toLowerCase()) ||
        (memo.title && memo.title.toLowerCase().includes(searchText.toLowerCase()))
      ));

      // 저장소 업데이트
      const memosKey = selectedMemo.roomId ? `memos_${selectedMemo.roomId}` : 'memos';
      const existingMemos = await AsyncStorage.getItem(memosKey);
      if (existingMemos) {
        const currentMemos = JSON.parse(existingMemos);
        const updatedStorageMemos = currentMemos.map((memo: any) =>
          memo.id === selectedMemo.id
            ? { ...memo, title: editTitle.trim() || editContent.substring(0, 10), content: editContent.trim() }
            : memo
        );
        await AsyncStorage.setItem(memosKey, JSON.stringify(updatedStorageMemos));
      }

      closeMemoModal();
    } catch (error) {
      console.error('Error saving memo:', error);
    }
  };

  const renderMemoItem = ({ item }: { item: ExtendedMemo }) => (
    <View style={styles.memoItem}>
      <TouchableOpacity
        style={styles.memoMainContent}
        onPress={() => {
          console.log('MemosScreen: Memo item pressed:', item.id);
          openMemoModal(item);
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.memoTitle} numberOfLines={1}>
          {item.title || item.content.substring(0, 10)}
        </Text>
        <Text style={styles.memoDate}>
          {formatDate(item.timestamp)}
        </Text>
      </TouchableOpacity>
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => toggleFavorite(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon
            name={item.isFavorite ? "heart" : "heart-outline"}
            size={18}
            color={item.isFavorite ? "#FF6B6B" : theme.colors.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => copyToClipboard(item.content)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="copy-outline" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => confirmDelete(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="trash-outline" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    searchContainer: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
    },
    searchInput: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius,
      padding: theme.spacing.sm,
      fontSize: getResponsiveFontSize(16),
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
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
      color: theme.colors.text,
      fontWeight: '500',
      marginBottom: theme.spacing.xs,
    },
    memoDate: {
      fontSize: getResponsiveFontSize(12),
      color: theme.colors.textSecondary,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    emptyText: {
      fontSize: getResponsiveFontSize(16),
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    actionButtonsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    actionButton: {
      padding: theme.spacing.xs,
      borderRadius: 4,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'transparent',
    },
    modalContent: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: theme.spacing.sm,
      maxHeight: '80%',
      minHeight: '60%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: getResponsiveFontSize(18),
      fontWeight: '600',
      color: theme.colors.text,
    },
    modalBody: {
      flex: 1,
      padding: theme.spacing.md,
    },
    titleInput: {
      fontSize: getResponsiveFontSize(18),
      fontWeight: '600',
      color: theme.colors.text,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingVertical: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    contentInput: {
      flex: 1,
      fontSize: getResponsiveFontSize(16),
      color: theme.colors.text,
      textAlignVertical: 'top',
      lineHeight: getResponsiveFontSize(24),
    },
    modalButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    modalButtonText: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('memos.searchPlaceholder')}
          placeholderTextColor={theme.colors.textSecondary}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {filteredMemos.length > 0 ? (
        <FlatList
          style={styles.memosList}
          data={filteredMemos}
          renderItem={renderMemoItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchText ? 'No matching memos found' : t('memos.empty')}
          </Text>
        </View>
      )}

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeMemoModal}
      >
        <View style={styles.modalContainer}>
          <KeyboardAvoidingView
            style={styles.modalContent}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={closeMemoModal}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.textSecondary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{t('modal.memoTitle')}</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={saveMemo}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.primary }]}>
                  {t('common.save')}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <TextInput
                style={styles.titleInput}
                placeholder={t('modal.titlePlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
                value={editTitle}
                onChangeText={setEditTitle}
              />
              <TextInput
                style={styles.contentInput}
                placeholder={t('modal.contentPlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
                value={editContent}
                onChangeText={setEditContent}
                multiline
                textAlignVertical="top"
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

export default MemosScreen;