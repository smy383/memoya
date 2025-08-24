import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Message } from '../types/message';
import { StorageServiceV2 } from '../services/storageServiceV2';
import { useTheme } from '../contexts/ThemeContext';
import { responsiveFontSize, SPACING, wp } from '../styles/dimensions';

interface MemoItemProps {
  memo: Message;
  onToggleFavorite: (memoId: string) => void;
  onDelete: (memoId: string) => void;
  onEdit: (memoId: string) => void;
}

const MemoItem: React.FC<MemoItemProps> = ({ memo, onToggleFavorite, onDelete, onEdit }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
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
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
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
    favoriteButton: {
      padding: SPACING.xs,
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
        </View>
        <TouchableOpacity
          style={itemStyles.favoriteButton}
          onPress={() => onToggleFavorite(memo.id)}
        >
          <Icon
            name={memo.isFavorite ? 'heart' : 'heart-outline'}
            size={responsiveFontSize(20)}
            color={memo.isFavorite ? colors.error : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
      
      <View style={itemStyles.content}>
        <Text style={itemStyles.preview}>{preview}</Text>
      </View>

      <View style={itemStyles.actions}>
        <TouchableOpacity
          style={itemStyles.actionButton}
          onPress={() => onEdit(memo.id)}
        >
          <Icon name="create-outline" size={responsiveFontSize(16)} color={colors.text} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[itemStyles.actionButton, itemStyles.deleteButton]}
          onPress={() => onDelete(memo.id)}
        >
          <Icon name="trash-outline" size={responsiveFontSize(16)} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const MemoScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [memos, setMemos] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMemos, setFilteredMemos] = useState<Message[]>([]);

  useEffect(() => {
    loadMemos();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadMemos();
    }, [])
  );

  useEffect(() => {
    filterMemos();
  }, [memos, searchQuery]);

  const loadMemos = async () => {
    try {
      // Load all messages from recent months (last 12 months for memos)
      const messages = await StorageServiceV2.getMessagesWithPagination(12);
      const memoMessages = messages.filter(msg => msg.isMemory && !msg.isDeleted);
      // Sort by favorites first, then by date (newest first)
      memoMessages.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
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

  const handleToggleFavorite = async (memoId: string) => {
    try {
      const memo = memos.find(m => m.id === memoId);
      if (memo) {
        await StorageServiceV2.updateMessage(memoId, {
          isFavorite: !memo.isFavorite
        });
        loadMemos();
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleDelete = (memoId: string) => {
    Alert.alert(
      t('memo.delete'),
      t('memo.deleteConfirm'),
      [
        {
          text: t('memo.cancel'),
          style: 'cancel',
        },
        {
          text: t('memo.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageServiceV2.deleteMessage(memoId);
              loadMemos();
            } catch (error) {
              console.error('Error deleting memo:', error);
            }
          },
        },
      ]
    );
  };

  const handleEdit = (memoId: string) => {
    // TODO: Implement edit functionality
    Alert.alert(t('memo.edit'), 'Edit functionality coming soon');
  };

  const renderMemo = ({ item }: { item: Message }) => (
    <MemoItem 
      memo={item}
      onToggleFavorite={handleToggleFavorite}
      onDelete={handleDelete}
      onEdit={handleEdit}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon 
        name="document-text-outline" 
        size={responsiveFontSize(64)} 
        color={colors.textTertiary} 
      />
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