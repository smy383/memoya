import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Message } from '../types/message';
import { MessageBubble } from '../components/MessageBubble';
import { StorageService } from '../services/storageService';
import { useTheme } from '../contexts/ThemeContext';
import { responsiveFontSize, SPACING, wp } from '../styles/dimensions';

export const MemoScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [memos, setMemos] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMemos, setFilteredMemos] = useState<Message[]>([]);

  useEffect(() => {
    loadMemos();
  }, []);

  useEffect(() => {
    filterMemos();
  }, [memos, searchQuery]);

  const loadMemos = async () => {
    try {
      const messages = await StorageService.getMessages();
      const memoMessages = messages.filter(msg => msg.isMemory);
      setMemos(memoMessages);
    } catch (error) {
      console.error('Error loading memos:', error);
    }
  };

  const filterMemos = () => {
    if (searchQuery.trim() === '') {
      setFilteredMemos(memos);
    } else {
      const filtered = memos.filter(memo =>
        memo.text.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMemos(filtered);
    }
  };

  const renderMemo = ({ item }: { item: Message }) => (
    <MessageBubble message={item} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {t('memo.noMemos')}
      </Text>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    searchContainer: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    searchInput: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      fontSize: responsiveFontSize(16),
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    memosList: {
      flex: 1,
    },
    memosContainer: {
      paddingVertical: SPACING.md,
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
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('memo.searchPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <FlatList
        data={filteredMemos}
        renderItem={renderMemo}
        keyExtractor={(item) => item.id}
        style={styles.memosList}
        contentContainerStyle={styles.memosContainer}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};