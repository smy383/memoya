import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { getResponsiveFontSize } from '../../utils/dimensions';

interface SourceMemo {
  id: string;
  content: string;
  timestamp: Date;
  formattedDate: string;
  relevance?: number;
}

interface SourceMemosModalProps {
  visible: boolean;
  sourceMemos: SourceMemo[];
  onClose: () => void;
}

const SourceMemosModal: React.FC<SourceMemosModalProps> = ({
  visible,
  sourceMemos,
  onClose,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const renderMemoItem = (memo: SourceMemo, index: number) => (
    <View key={memo.id} style={styles.memoItem}>
      <View style={styles.memoHeader}>
        <Text style={styles.memoIndex}>#{index + 1}</Text>
        <Text style={styles.memoDate}>{memo.formattedDate}</Text>
        {memo.relevance && (
          <View style={styles.relevanceBadge}>
            <Text style={styles.relevanceText}>
              {Math.round(memo.relevance * 100)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.memoContent}>{memo.content}</Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity 
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              {t('chat.sourceMemosTitle', { count: sourceMemos.length })}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={true}
            bounces={true}
            contentContainerStyle={styles.scrollContent}
          >
            {sourceMemos.map((memo, index) => renderMemoItem(memo, index))}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  modalContainer: {
    width: '100%',
    height: screenHeight * 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#F8F9FA',
  },
  title: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  memoItem: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    minHeight: 80,
  },
  memoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  memoIndex: {
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
    color: '#2196F3',
    marginRight: 8,
  },
  memoDate: {
    fontSize: getResponsiveFontSize(12),
    color: '#666',
    flex: 1,
  },
  relevanceBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  relevanceText: {
    fontSize: getResponsiveFontSize(10),
    color: '#1976D2',
    fontWeight: '500',
  },
  memoContent: {
    fontSize: getResponsiveFontSize(14),
    lineHeight: 22,
    color: '#333',
    textAlign: 'left',
  },
  scrollContent: {
    paddingBottom: 20,
  },
});

export default SourceMemosModal;