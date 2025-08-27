import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { getResponsiveFontSize } from '../utils/dimensions';
import { getDownloadBackupFiles } from '../services/backupService';

interface BackupFilePickerProps {
  visible: boolean;
  onClose: () => void;
  onFileSelect: (filePath: string) => void;
}

interface BackupFileInfo {
  path: string;
  name: string;
  date: string;
}

const BackupFilePicker: React.FC<BackupFilePickerProps> = ({
  visible,
  onClose,
  onFileSelect,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [backupFiles, setBackupFiles] = useState<BackupFileInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadBackupFiles();
    }
  }, [visible]);

  const loadBackupFiles = async () => {
    try {
      setLoading(true);
      const files = await getDownloadBackupFiles();
      
      const fileInfos: BackupFileInfo[] = files.map(filePath => {
        const fileName = filePath.split('/').pop() || '';
        // memoya-backup-2025-08-27_19-30-15.json 형식에서 날짜 추출
        const dateMatch = fileName.match(/memoya-backup-(.+)\.json/);
        const dateStr = dateMatch ? dateMatch[1].replace(/_/g, ' ').replace(/-/g, ':') : '';
        
        return {
          path: filePath,
          name: fileName,
          date: dateStr || '알 수 없음',
        };
      });
      
      setBackupFiles(fileInfos);
    } catch (error) {
      console.error('Error loading backup files:', error);
      Alert.alert(t('common.error'), '백업 파일 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (filePath: string) => {
    onFileSelect(filePath);
    onClose();
  };

  const renderFileItem = ({ item }: { item: BackupFileInfo }) => (
    <TouchableOpacity
      style={[styles.fileItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      onPress={() => handleFileSelect(item.path)}
    >
      <View style={styles.fileIcon}>
        <Icon name="document-text-outline" size={24} color={theme.colors.primary} />
      </View>
      <View style={styles.fileInfo}>
        <Text style={[styles.fileName, { color: theme.colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.fileDate, { color: theme.colors.textSecondary }]}>
          {item.date}
        </Text>
      </View>
      <Icon name="chevron-forward-outline" size={20} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: theme.spacing.lg,
      width: '90%',
      maxHeight: '70%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: getResponsiveFontSize(18),
      fontWeight: '600',
      color: theme.colors.text,
    },
    closeButton: {
      padding: theme.spacing.xs,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.xl,
    },
    emptyText: {
      fontSize: getResponsiveFontSize(16),
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: theme.spacing.sm,
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.xl,
    },
    fileItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: theme.spacing.sm,
    },
    fileIcon: {
      marginRight: theme.spacing.md,
    },
    fileInfo: {
      flex: 1,
    },
    fileName: {
      fontSize: getResponsiveFontSize(14),
      fontWeight: '500',
      marginBottom: 2,
    },
    fileDate: {
      fontSize: getResponsiveFontSize(12),
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>백업 파일 선택</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Icon name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.emptyText, { marginTop: theme.spacing.sm }]}>
                백업 파일을 검색하고 있습니다...
              </Text>
            </View>
          ) : backupFiles.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="folder-open-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={styles.emptyText}>
                Downloads 폴더에 백업 파일이 없습니다.{'\n'}
                먼저 백업을 내보내기 해주세요.
              </Text>
            </View>
          ) : (
            <FlatList
              data={backupFiles}
              keyExtractor={(item) => item.path}
              renderItem={renderFileItem}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

export default BackupFilePicker;