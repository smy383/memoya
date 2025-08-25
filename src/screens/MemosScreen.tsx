import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { Memo } from '../types';
import { getResponsiveFontSize, isTablet } from '../utils/dimensions';

const MemosScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filteredMemos, setFilteredMemos] = useState<Memo[]>([]);

  const loadMemos = async () => {
    try {
      const storedMemos = await AsyncStorage.getItem('memos');
      if (storedMemos) {
        const parsedMemos = JSON.parse(storedMemos);
        const memosWithDates = parsedMemos.map((memo: any) => ({
          ...memo,
          timestamp: new Date(memo.timestamp),
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

  const deleteMemo = async (id: string) => {
    try {
      const updatedMemos = memos.filter(memo => memo.id !== id);
      await AsyncStorage.setItem('memos', JSON.stringify(updatedMemos));
      setMemos(updatedMemos);
    } catch (error) {
      console.error('Error deleting memo:', error);
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert(
      '',
      'Delete this memo?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), onPress: () => deleteMemo(id), style: 'destructive' },
      ]
    );
  };

  const renderMemoItem = ({ item }: { item: Memo }) => (
    <TouchableOpacity
      style={styles.memoItem}
      onLongPress={() => confirmDelete(item.id)}
    >
      <Text style={styles.memoContent} numberOfLines={3}>
        {item.content}
      </Text>
      <Text style={styles.memoDate}>
        {formatDate(item.timestamp)}
      </Text>
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
      backgroundColor: theme.colors.surface,
      margin: theme.spacing.sm,
      marginHorizontal: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
    },
    memoContent: {
      fontSize: getResponsiveFontSize(14),
      color: theme.colors.text,
      lineHeight: getResponsiveFontSize(20),
      marginBottom: theme.spacing.sm,
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
    </View>
  );
};

export default MemosScreen;