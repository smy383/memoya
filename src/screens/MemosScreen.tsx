import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Clipboard,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { Memo } from '../types';
import { getResponsiveFontSize, isTablet } from '../utils/dimensions';

interface ExtendedMemo extends Memo {
  isFavorite?: boolean;
  title?: string;
}

interface TrashedMemo extends ExtendedMemo {
  deletedAt: Date;
}

const MemosScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [memos, setMemos] = useState<ExtendedMemo[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filteredMemos, setFilteredMemos] = useState<ExtendedMemo[]>([]);
  const [selectedMemo, setSelectedMemo] = useState<ExtendedMemo | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const loadMemos = async () => {
    try {
      const storedMemos = await AsyncStorage.getItem('memos');
      if (storedMemos) {
        const parsedMemos = JSON.parse(storedMemos);
        const memosWithDates = parsedMemos.map((memo: any) => ({
          ...memo,
          timestamp: new Date(memo.timestamp),
          isFavorite: memo.isFavorite || false,
          title: memo.title || memo.content.substring(0, 10),
        }));
        setMemos(memosWithDates);
        setFilteredMemos(memosWithDates);
      }
    } catch (error) {
      console.error('Error loading memos:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMemos();
    }, [])
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
    return date.toLocaleString('ko-KR', {
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

      // 기존 휴지통 메모들 불러오기
      const existingTrashedMemos = await AsyncStorage.getItem('trashedMemos');
      const trashedMemos = existingTrashedMemos ? JSON.parse(existingTrashedMemos) : [];
      
      // 휴지통에 추가
      trashedMemos.unshift(trashedMemo);
      await AsyncStorage.setItem('trashedMemos', JSON.stringify(trashedMemos));

      // 메모 목록에서 제거
      const updatedMemos = memos.filter(memo => memo.id !== id);
      await AsyncStorage.setItem('memos', JSON.stringify(updatedMemos));
      setMemos(updatedMemos);
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
      const updatedMemos = memos.map(memo =>
        memo.id === id ? { ...memo, isFavorite: !memo.isFavorite } : memo
      );
      await AsyncStorage.setItem('memos', JSON.stringify(updatedMemos));
      setMemos(updatedMemos);
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
    setSelectedMemo(memo);
    setEditTitle(memo.title || memo.content.substring(0, 10));
    setEditContent(memo.content);
    setIsModalVisible(true);
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
      const updatedMemos = memos.map(memo =>
        memo.id === selectedMemo.id 
          ? { ...memo, title: editTitle.trim() || editContent.substring(0, 10), content: editContent.trim() }
          : memo
      );
      await AsyncStorage.setItem('memos', JSON.stringify(updatedMemos));
      setMemos(updatedMemos);
      closeMemoModal();
    } catch (error) {
      console.error('Error saving memo:', error);
    }
  };

  const renderMemoItem = ({ item }: { item: ExtendedMemo }) => (
    <View style={styles.memoItem}>
      <TouchableOpacity 
        style={styles.memoMainContent}
        onPress={() => openMemoModal(item)}
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
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
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
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
        >
          <Icon name="copy-outline" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => confirmDelete(item.id)}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
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
                  취소
                </Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>메모</Text>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={saveMemo}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.primary }]}>
                  저장
                </Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <TextInput
                style={styles.titleInput}
                placeholder="제목을 입력하세요"
                placeholderTextColor={theme.colors.textSecondary}
                value={editTitle}
                onChangeText={setEditTitle}
              />
              <TextInput
                style={styles.contentInput}
                placeholder="내용을 입력하세요"
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