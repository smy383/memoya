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

interface MemoActionPreview {
  actionType: 'create' | 'update' | 'delete';
  preview: {
    memoId?: string;
    content?: string;
    originalContent?: string;
    newContent?: string;
    tags?: string[];
    timestamp?: string;
    formattedDate?: string;
  };
}

interface MemoActionModalProps {
  visible: boolean;
  actionData: MemoActionPreview | null;
  onApprove: () => void;
  onCancel: () => void;
}

const MemoActionModal: React.FC<MemoActionModalProps> = ({
  visible,
  actionData,
  onApprove,
  onCancel,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  if (!actionData) return null;

  const getActionIcon = () => {
    switch (actionData.actionType) {
      case 'create': return 'add-circle';
      case 'update': return 'create';
      case 'delete': return 'trash';
      default: return 'document';
    }
  };

  const getActionColor = () => {
    switch (actionData.actionType) {
      case 'create': return '#4CAF50';
      case 'update': return '#2196F3';
      case 'delete': return '#F44336';
      default: return '#666';
    }
  };

  const getActionTitle = () => {
    switch (actionData.actionType) {
      case 'create': return t('memoAction.createTitle');
      case 'update': return t('memoAction.updateTitle');
      case 'delete': return t('memoAction.deleteTitle');
      default: return '';
    }
  };

  const renderCreatePreview = () => (
    <View style={styles.previewContainer}>
      <Text style={styles.previewLabel}>{t('memoAction.newContent')}</Text>
      <View style={styles.contentBox}>
        <Text style={styles.contentText}>{actionData.preview.content}</Text>
      </View>
      {actionData.preview.tags && actionData.preview.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          <Text style={styles.previewLabel}>{t('memoAction.tags')}</Text>
          <View style={styles.tagsWrapper}>
            {actionData.preview.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const renderUpdatePreview = () => (
    <View style={styles.previewContainer}>
      <Text style={styles.previewLabel}>{t('memoAction.originalContent')}</Text>
      <View style={[styles.contentBox, styles.originalContent]}>
        <Text style={styles.contentText}>{actionData.preview.originalContent}</Text>
      </View>
      
      <Icon name="arrow-down" size={20} color="#666" style={styles.arrowIcon} />
      
      <Text style={styles.previewLabel}>{t('memoAction.newContent')}</Text>
      <View style={[styles.contentBox, styles.newContent]}>
        <Text style={styles.contentText}>{actionData.preview.newContent}</Text>
      </View>
    </View>
  );

  const renderDeletePreview = () => (
    <View style={styles.previewContainer}>
      <Text style={styles.previewLabel}>{t('memoAction.contentToDelete')}</Text>
      <View style={[styles.contentBox, styles.deleteContent]}>
        <Text style={styles.contentText}>{actionData.preview.content}</Text>
      </View>
      <Text style={styles.dateText}>
        {t('memoAction.createdAt')}: {actionData.preview.formattedDate}
      </Text>
    </View>
  );

  const renderPreview = () => {
    switch (actionData.actionType) {
      case 'create': return renderCreatePreview();
      case 'update': return renderUpdatePreview();
      case 'delete': return renderDeletePreview();
      default: return null;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={[styles.header, { backgroundColor: getActionColor() }]}>
            <Icon name={getActionIcon()} size={24} color="#FFFFFF" />
            <Text style={styles.title}>{getActionTitle()}</Text>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <Icon name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={true}
            bounces={true}
            contentContainerStyle={styles.scrollContent}
          >
            {renderPreview()}
          </ScrollView>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={onCancel}
            >
              <Icon name="close-circle" size={20} color="#666" />
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.approveButton, { backgroundColor: getActionColor() }]} 
              onPress={onApprove}
            >
              <Icon name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.approveButtonText}>
                {actionData.actionType === 'create' && t('memoAction.create')}
                {actionData.actionType === 'update' && t('memoAction.update')}
                {actionData.actionType === 'delete' && t('memoAction.delete')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    paddingHorizontal: 12,
  },
  modalContainer: {
    width: '100%',
    maxWidth: screenWidth > 600 ? 600 : '100%',
    minHeight: screenHeight * 0.6,
    maxHeight: screenHeight * 0.9,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  title: {
    flex: 1,
    fontSize: getResponsiveFontSize(20),
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    minHeight: 300,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexGrow: 1,
  },
  previewContainer: {
    marginBottom: 24,
  },
  previewLabel: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  contentBox: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 20,
    minHeight: 80,
  },
  originalContent: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FFB74D',
  },
  newContent: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  deleteContent: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  contentText: {
    fontSize: getResponsiveFontSize(15),
    lineHeight: 24,
    color: '#333',
    textAlign: 'left',
  },
  arrowIcon: {
    alignSelf: 'center',
    marginVertical: 8,
  },
  tagsContainer: {
    marginTop: 8,
  },
  tagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  tagText: {
    fontSize: getResponsiveFontSize(12),
    color: '#1976D2',
    fontWeight: '500',
  },
  dateText: {
    fontSize: getResponsiveFontSize(12),
    color: '#666',
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 16,
    backgroundColor: '#FAFAFA',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    minHeight: 56,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  approveButton: {
    // backgroundColor will be set dynamically
  },
  cancelButtonText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: '#666',
  },
  approveButtonText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default MemoActionModal;