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
import { useSubscription } from '../contexts/SubscriptionContext';
import { Memo } from '../types';
import { getResponsiveFontSize } from '../utils/dimensions';
import { useChatRooms } from '../hooks/useChatRooms';
import BannerAdComponent from '../components/ads/BannerAdComponent';

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
  const { isPremium } = useSubscription();
  const { chatRooms, updateRoomMetadata, calculateRoomMetadata } = useChatRooms();
  const [memos, setMemos] = useState<ExtendedMemo[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filteredMemos, setFilteredMemos] = useState<ExtendedMemo[]>([]);
  const [selectedMemo, setSelectedMemo] = useState<ExtendedMemo | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // 카테고리별 메모 개수 계산
  const getCategoryStats = () => {
    const stats: { [key: string]: number } = { all: memos.length };
    
    memos.forEach(memo => {
      if (memo.roomId) {
        stats[memo.roomId] = (stats[memo.roomId] || 0) + 1;
      } else {
        stats['legacy'] = (stats['legacy'] || 0) + 1;
      }
    });
    
    return stats;
  };

  // 채팅방 이름 가져오기
  const getRoomName = (roomId: string) => {
    const room = chatRooms.find(r => r.id === roomId);
    return room?.title || roomId;
  };

  // 카테고리 이름을 6자로 제한하여 반환
  const getCategoryDisplayName = (memo: ExtendedMemo) => {
    if (!memo.roomId) {
      return t('memos.categories.legacy');
    }
    const roomName = getRoomName(memo.roomId);
    return roomName.length > 6 ? roomName.substring(0, 6) + '...' : roomName;
  };

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
    }, [chatRooms]) // chatRooms가 변경되면 메모 다시 로드
  );

  // chatRooms 변경 시에도 메모 다시 로드
  useEffect(() => {
    console.log('MemosScreen: chatRooms changed, reloading memos');
    loadMemos();
  }, [chatRooms]);

  useEffect(() => {
    let filtered = memos;
    
    // 카테고리 필터 적용
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'legacy') {
        filtered = filtered.filter(memo => !memo.roomId);
      } else {
        filtered = filtered.filter(memo => memo.roomId === selectedCategory);
      }
    }
    
    // 검색 필터 적용
    if (searchText.trim()) {
      filtered = filtered.filter(memo =>
        memo.content.toLowerCase().includes(searchText.toLowerCase()) ||
        (memo.title && memo.title.toLowerCase().includes(searchText.toLowerCase()))
      );
    }
    
    setFilteredMemos(filtered);
  }, [searchText, memos, selectedCategory]);

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

  // 메모 목록과 광고를 혼합한 데이터 생성
  const mixedMemoData = React.useMemo(() => {
    if (isPremium) {
      return filteredMemos.map(memo => ({ type: 'memo', data: memo }));
    }

    const result: Array<{ type: 'memo' | 'ad'; data?: ExtendedMemo; adIndex?: number }> = [];
    filteredMemos.forEach((memo, index) => {
      result.push({ type: 'memo', data: memo });
      // 8개마다 광고 삽입 (인덱스 7, 15, 23, ... 다음에)
      if ((index + 1) % 8 === 0 && index < filteredMemos.length - 1) {
        result.push({ type: 'ad', adIndex: Math.floor(index / 8) });
      }
    });
    return result;
  }, [filteredMemos, isPremium]);

  const renderItem = ({ item }: { item: { type: 'memo' | 'ad'; data?: ExtendedMemo; adIndex?: number } }) => {
    if (item.type === 'ad') {
      return <BannerAdComponent screenName="memos" />;
    }
    
    if (item.data) {
      return renderMemoItem({ item: item.data });
    }
    
    return null;
  };

  const renderMemoItem = ({ item }: { item: ExtendedMemo }) => (
    <TouchableOpacity
      style={styles.memoItem}
      onPress={() => {
        console.log('MemosScreen: Memo item pressed:', item.id);
        openMemoModal(item);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.memoContent}>
        <View style={styles.memoHeader}>
          <Text style={styles.memoText} numberOfLines={2}>
            {item.content}
          </Text>
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => toggleFavorite(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon
                name={item.isFavorite ? "heart" : "heart-outline"}
                size={16}
                color={item.isFavorite ? "#FF6B6B" : theme.colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => copyToClipboard(item.content)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="copy-outline" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => confirmDelete(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="trash-outline" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.memoFooter}>
          {item.roomId && (
            <View style={styles.roomTag}>
              <Text style={styles.roomText} numberOfLines={1}>
                {getCategoryDisplayName(item)}
              </Text>
            </View>
          )}
          <Text style={styles.memoDate}>
            {formatDate(item.timestamp)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
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
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      marginHorizontal: 16,
      marginVertical: 4,
      padding: 12,
      // 참고 디자인의 깔끔한 그림자
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
      borderWidth: 1,
      borderColor: theme.colors.border + '30',
    },
    memoContent: {
      flex: 1,
    },
    memoHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 6,
    },
    memoText: {
      fontSize: getResponsiveFontSize(15),
      color: theme.colors.text,
      fontWeight: '400',
      flex: 1,
      lineHeight: 20,
      marginRight: 8,
    },
    memoFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 6,
    },
    roomTag: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      maxWidth: 100,
    },
    roomText: {
      fontSize: getResponsiveFontSize(10),
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    memoDate: {
      fontSize: getResponsiveFontSize(11),
      color: theme.colors.textSecondary,
      fontWeight: '400',
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
      gap: 4,
      marginLeft: 8,
    },
    actionButton: {
      padding: 4,
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
    categoryFilters: {
      marginTop: theme.spacing.sm,
    },
    categoryFiltersContent: {
      paddingHorizontal: theme.spacing.xs,
    },
    categoryButton: {
      backgroundColor: theme.colors.background,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: 20,
      marginHorizontal: theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    categoryButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    categoryButtonText: {
      fontSize: getResponsiveFontSize(14),
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    categoryButtonTextActive: {
      color: theme.colors.background,
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
        
        {/* 카테고리 필터 버튼들 */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilters}
          contentContainerStyle={styles.categoryFiltersContent}
        >
          {(() => {
            const stats = getCategoryStats();
            const categories = [
              { id: 'all', name: t('memos.categories.all'), count: stats.all },
              ...chatRooms.map(room => ({
                id: room.id,
                name: room.title,
                count: stats[room.id] || 0
              })).filter(cat => cat.count > 0),
              ...(stats.legacy ? [{ id: 'legacy', name: t('memos.categories.legacy'), count: stats.legacy }] : [])
            ];
            
            return categories.map(category => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.id && styles.categoryButtonActive
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Text style={[
                  styles.categoryButtonText,
                  selectedCategory === category.id && styles.categoryButtonTextActive
                ]}>
                  {category.name} ({category.count})
                </Text>
              </TouchableOpacity>
            ));
          })()}
        </ScrollView>
      </View>

      {/* 프리미엄이 아닌 경우에만 배너 광고 표시 */}
      {!isPremium && <BannerAdComponent screenName="memos" />}

      {filteredMemos.length > 0 ? (
        <FlatList
          style={styles.memosList}
          data={mixedMemoData}
          renderItem={renderItem}
          keyExtractor={(item, index) => 
            item.type === 'ad' 
              ? `ad-${item.adIndex || index}` 
              : item.data?.id || `item-${index}`
          }
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