import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { RootStackParamList } from '../types';
import { getResponsiveFontSize, isTablet } from '../utils/dimensions';
import LanguageSelector from '../components/LanguageSelector';
import BannerAdComponent from '../components/ads/BannerAdComponent';
import { createBackup, getBackupInfo, restoreFromInternalBackup, exportBackupToFile, pickAndRestoreBackupFile } from '../services/backupService';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const SettingsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme, isDark, toggleTheme } = useTheme();
  const { isPremium, subscriptionType, subscriptionEndDate, subscribeToPremium, cancelSubscription } = useSubscription();
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const [isLanguageSelectorVisible, setIsLanguageSelectorVisible] = useState(false);
  const [isBackupCreating, setIsBackupCreating] = useState(false);
  const [isBackupRestoring, setIsBackupRestoring] = useState(false);
  const [backupInfo, setBackupInfo] = useState<{exists: boolean; timestamp?: string; dataCount?: number; chatRoomsCount?: number; memosCount?: number} | null>(null);

  // i18n이 아직 로드되지 않은 경우 기본값 사용
  const safeT = (key: string, defaultValue?: string) => {
    try {
      return t(key) || defaultValue || key;
    } catch (error) {
      return defaultValue || key;
    }
  };


  const openTrash = () => {
    navigation.navigate('Trash');
  };

  const openLanguageSelector = () => {
    setIsLanguageSelectorVisible(true);
  };

  const closeLanguageSelector = () => {
    setIsLanguageSelectorVisible(false);
  };


  // 백업 정보 로드
  const loadBackupInfo = async () => {
    try {
      const info = await getBackupInfo();
      setBackupInfo(info);
    } catch (error) {
      console.error('Error loading backup info:', error);
    }
  };

  // 컴포넌트 마운트 시 백업 정보 로드
  React.useEffect(() => {
    loadBackupInfo();
  }, []);

  const handleCreateBackup = async () => {
    try {
      setIsBackupCreating(true);
      await createBackup();
      await loadBackupInfo(); // 백업 정보 새로고침
      Alert.alert(t('common.success'), t('settings.dataManagement.backupSuccess'));
    } catch (error) {
      console.error('Error creating backup:', error);
      Alert.alert(t('common.error'), t('settings.dataManagement.backupError'));
    } finally {
      setIsBackupCreating(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!backupInfo?.exists) {
      Alert.alert(t('common.error'), t('settings.dataManagement.noInternalBackup'));
      return;
    }

    Alert.alert(
      t('settings.dataManagement.restoreTitle'),
      t('settings.dataManagement.internalRestoreMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              setIsBackupRestoring(true);
              await restoreFromInternalBackup();
              
              Alert.alert(
                t('common.success'),
                t('settings.dataManagement.restoreSuccess'),
                [{ text: t('common.confirm') }]
              );
            } catch (error) {
              console.error('Error restoring backup:', error);
              Alert.alert(t('common.error'), t('settings.dataManagement.restoreError'));
            } finally {
              setIsBackupRestoring(false);
            }
          }
        }
      ]
    );
  };

  const handleExportBackup = async () => {
    if (!backupInfo?.exists) {
      Alert.alert(t('common.error'), t('settings.dataManagement.noInternalBackup'));
      return;
    }

    try {
      const fileName = await exportBackupToFile();
      Alert.alert(
        t('common.success'), 
        `백업 파일이 공유되었습니다.\n파일명: ${fileName}\n\n원하는 앱이나 위치에 저장할 수 있습니다.`
      );
    } catch (error) {
      console.error('Error exporting backup:', error);
      Alert.alert(t('common.error'), t('settings.dataManagement.exportError'));
    }
  };

  const handleImportBackup = () => {
    Alert.alert(
      'JSON 백업 파일 가져오기',
      '어떤 방식으로 백업을 가져오시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '파일 선택',
          onPress: handleFilePickerImport
        },
        {
          text: '텍스트 입력',
          onPress: handleTextImport
        }
      ]
    );
  };

  const handleFilePickerImport = async () => {
    try {
      setIsBackupRestoring(true);
      await pickAndRestoreBackupFile();
      await loadBackupInfo();
      
      Alert.alert(
        '복구 완료',
        '백업 파일이 성공적으로 복구되었습니다.\n앱을 재시작해주세요.',
        [{ text: '확인' }]
      );
    } catch (error) {
      console.error('Error importing backup from file:', error);
      Alert.alert('오류', error.message || '백업 파일 복구 중 오류가 발생했습니다.');
    } finally {
      setIsBackupRestoring(false);
    }
  };

  const handleTextImport = () => {
    Alert.prompt(
      '백업 텍스트 입력',
      '백업 파일의 JSON 내용을 붙여넣어 주세요:',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '복구',
          style: 'destructive',
          onPress: (backupText) => {
            if (!backupText || backupText.trim() === '') {
              Alert.alert('오류', '백업 데이터가 입력되지 않았습니다.');
              return;
            }
            handleBackupTextImport(backupText.trim());
          }
        }
      ],
      'plain-text'
    );
  };

  const handleBackupTextImport = async (backupText: string) => {
    Alert.alert(
      '백업 데이터에서 복구',
      `입력한 백업 데이터에서 복구하시겠습니까?\n\n현재 모든 데이터가 삭제되고 백업 데이터로 대체됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '복구',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsBackupRestoring(true);
              
              // 백업 텍스트에서 복구
              const { restoreFromBackupText } = await import('../services/backupService');
              await restoreFromBackupText(backupText);
              
              await loadBackupInfo(); // 백업 정보 새로고침
              
              Alert.alert(
                '복구 완료',
                '백업 데이터가 성공적으로 복구되었습니다.\n앱을 재시작해주세요.',
                [{ text: '확인' }]
              );
            } catch (error) {
              console.error('Error importing backup from text:', error);
              Alert.alert('오류', error.message || '백업 데이터 복구 중 오류가 발생했습니다.');
            } finally {
              setIsBackupRestoring(false);
            }
          }
        }
      ]
    );
  };



  const resetAllData = () => {
    Alert.alert(
      t('settings.dataManagement.resetAllTitle'),
      t('settings.dataManagement.resetAllMessage'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('settings.dataManagement.resetAllConfirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              // 백업 데이터 먼저 보존
              const backupData = await AsyncStorage.getItem('internal_backup_data');
              
              // 모든 데이터 삭제
              await AsyncStorage.clear();
              
              // 백업 데이터 복원
              if (backupData) {
                await AsyncStorage.setItem('internal_backup_data', backupData);
              }
              
              Alert.alert(
                t('settings.dataManagement.resetComplete'),
                t('settings.dataManagement.resetCompleteMessage'),
                [
                  {
                    text: t('common.confirm'),
                    onPress: () => {
                      // 앱 재시작을 위해 강제 종료
                      // React Native에서는 직접 앱을 종료할 수 없으므로 사용자가 수동으로 재시작해야 함
                    }
                  }
                ]
              );
            } catch (error) {
              Alert.alert(t('common.error'), t('settings.dataManagement.resetError'));
            }
          },
        },
      ]
    );
  };

  const handleSubscribeMonthly = async () => {
    try {
      const success = await subscribeToPremium('monthly');
      if (success) {
        Alert.alert(
          '구독 완료',
          '월간 프리미엄 구독이 활성화되었습니다!\n이제 광고 없이 앱을 이용하실 수 있습니다.',
          [{ text: '확인' }]
        );
      } else {
        Alert.alert('오류', '구독 처리 중 오류가 발생했습니다.', [{ text: '확인' }]);
      }
    } catch (error) {
      Alert.alert('오류', '구독 처리 중 오류가 발생했습니다.', [{ text: '확인' }]);
    }
  };

  const handleSubscribeYearly = async () => {
    try {
      const success = await subscribeToPremium('yearly');
      if (success) {
        Alert.alert(
          '구독 완료',
          '연간 프리미엄 구독이 활성화되었습니다!\n이제 광고 없이 앱을 이용하실 수 있습니다.',
          [{ text: '확인' }]
        );
      } else {
        Alert.alert('오류', '구독 처리 중 오류가 발생했습니다.', [{ text: '확인' }]);
      }
    } catch (error) {
      Alert.alert('오류', '구독 처리 중 오류가 발생했습니다.', [{ text: '확인' }]);
    }
  };

  const handleCancelSubscription = async () => {
    Alert.alert(
      '구독 취소',
      '정말로 프리미엄 구독을 취소하시겠습니까?\n구독을 취소하면 광고가 다시 표시됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확인',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelSubscription();
              Alert.alert('구독 취소 완료', '프리미엄 구독이 취소되었습니다.', [{ text: '확인' }]);
            } catch (error) {
              Alert.alert('오류', '구독 취소 중 오류가 발생했습니다.', [{ text: '확인' }]);
            }
          },
        },
      ]
    );
  };

  const formatSubscriptionEndDate = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const openPrivacyPolicy = () => {
    const privacyUrl = 'https://smy383.github.io/memoya/docs/privacy-policy.html';
    Linking.openURL(privacyUrl).catch(err => {
      console.error('Failed to open privacy policy URL:', err);
      Alert.alert('오류', '개인정보처리방침을 열 수 없습니다.');
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: theme.spacing.md,
    },
    section: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius,
      marginBottom: theme.spacing.md,
      overflow: 'hidden',
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    lastSettingItem: {
      borderBottomWidth: 0,
    },
    settingLabel: {
      fontSize: getResponsiveFontSize(16),
      color: theme.colors.text,
      flex: 1,
    },
    settingValue: {
      fontSize: getResponsiveFontSize(14),
      color: theme.colors.textSecondary,
    },
    sectionTitle: {
      fontSize: getResponsiveFontSize(18),
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      marginTop: theme.spacing.lg,
    },
    appName: {
      fontSize: getResponsiveFontSize(24),
      fontWeight: '700',
      color: theme.colors.primary,
      textAlign: 'center',
      marginVertical: theme.spacing.xl,
    },
    version: {
      fontSize: getResponsiveFontSize(14),
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    settingLabelWithIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: theme.spacing.sm,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 프리미엄이 아닌 경우에만 헤더 바로 아래 배너 광고 표시 */}
        {!isPremium && <BannerAdComponent screenName="settings" />}
        
        <View style={styles.content}>
        <Text style={styles.appName}>Memoya</Text>

        <Text style={styles.sectionTitle}>{t('settings.appearance')}</Text>
        <View style={styles.section}>
          <View style={[styles.settingItem, styles.lastSettingItem]}>
            <Text style={styles.settingLabel}>{safeT('settings.darkMode', '다크모드')}</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={isDark ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('settings.general')}</Text>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={openTrash}
          >
            <View style={styles.settingLabelWithIcon}>
              <Icon name="trash-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.settingLabel}>{safeT('trash.title', '휴지통')}</Text>
            </View>
            <Icon name="chevron-forward-outline" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.settingItem, styles.lastSettingItem]}
            onPress={openLanguageSelector}
          >
            <View style={styles.settingLabelWithIcon}>
              <Icon name="language-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.settingLabel}>{safeT('settings.language', '언어')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.settingValue}>
                {
                  i18n.language === 'ko' ? safeT('common.korean', '한국어') :
                    i18n.language === 'ja' ? safeT('common.japanese', '日本語') :
                      i18n.language === 'zh' ? safeT('common.chinese', '中文') :
                        i18n.language === 'es' ? safeT('common.spanish', 'Español') :
                          i18n.language === 'de' ? safeT('common.german', 'Deutsch') :
                            safeT('common.english', 'English')
                }
              </Text>
              <Icon name="chevron-forward-outline" size={20} color={theme.colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>프리미엄 구독</Text>
        <View style={styles.section}>
          {isPremium ? (
            <>
              <View style={styles.settingItem}>
                <View style={styles.settingLabelWithIcon}>
                  <Icon name="star" size={20} color="#FFD700" />
                  <Text style={styles.settingLabel}>구독 상태</Text>
                </View>
                <Text style={[styles.settingValue, { color: '#4CAF50', fontWeight: '600' }]}>
                  프리미엄 활성화
                </Text>
              </View>
              <View style={styles.settingItem}>
                <View style={styles.settingLabelWithIcon}>
                  <Icon name="card-outline" size={20} color={theme.colors.textSecondary} />
                  <Text style={styles.settingLabel}>구독 타입</Text>
                </View>
                <Text style={styles.settingValue}>
                  {subscriptionType === 'monthly' ? '월간 구독' : '연간 구독'}
                </Text>
              </View>
              {subscriptionEndDate && (
                <View style={styles.settingItem}>
                  <View style={styles.settingLabelWithIcon}>
                    <Icon name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                    <Text style={styles.settingLabel}>만료일</Text>
                  </View>
                  <Text style={styles.settingValue}>
                    {formatSubscriptionEndDate(subscriptionEndDate)}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.settingItem, styles.lastSettingItem]}
                onPress={handleCancelSubscription}
              >
                <View style={styles.settingLabelWithIcon}>
                  <Icon name="close-circle-outline" size={20} color="#ff4757" />
                  <Text style={[styles.settingLabel, { color: '#ff4757' }]}>구독 취소</Text>
                </View>
                <Icon name="chevron-forward-outline" size={20} color="#ff4757" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={[styles.settingItem, { paddingVertical: 16 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { fontSize: getResponsiveFontSize(16), marginBottom: 4 }]}>
                    광고 없는 프리미엄 경험
                  </Text>
                  <Text style={[styles.settingValue, { fontSize: getResponsiveFontSize(13) }]}>
                    구독하고 광고 없이 앱을 이용해보세요
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.settingItem}
                onPress={handleSubscribeMonthly}
              >
                <View style={styles.settingLabelWithIcon}>
                  <Icon name="card-outline" size={20} color={theme.colors.primary} />
                  <Text style={styles.settingLabel}>월간 구독 (₩3,900/월)</Text>
                </View>
                <Icon name="chevron-forward-outline" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.settingItem, styles.lastSettingItem]}
                onPress={handleSubscribeYearly}
              >
                <View style={styles.settingLabelWithIcon}>
                  <Icon name="trophy-outline" size={20} color="#FFD700" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingLabel}>연간 구독 (₩39,000/년)</Text>
                    <Text style={[styles.settingValue, { fontSize: getResponsiveFontSize(12), color: '#4CAF50' }]}>
                      2개월 무료! (17% 할인)
                    </Text>
                  </View>
                </View>
                <Icon name="chevron-forward-outline" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.sectionTitle}>{t('settings.dataManagementTitle')}</Text>
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.settingItem, styles.lastSettingItem]}
            onPress={resetAllData}
          >
            <View style={styles.settingLabelWithIcon}>
              <Icon name="warning-outline" size={20} color="#ff4757" />
              <Text style={[styles.settingLabel, { color: '#ff4757' }]}>{t('settings.dataManagement.deleteAllData')}</Text>
            </View>
            <Icon name="chevron-forward-outline" size={20} color="#ff4757" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>{t('settings.dataManagement.backupRestore')}</Text>
        <View style={styles.section}>
          <View style={styles.settingItem}>
            <View style={styles.settingLabelWithIcon}>
              <Icon name="folder-outline" size={20} color={theme.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>저장된 백업</Text>
                <Text style={[styles.settingValue, { fontSize: getResponsiveFontSize(12), marginTop: 2 }]}>
                  {backupInfo?.exists 
                    ? `${backupInfo.timestamp} (${backupInfo.dataCount}개 항목)`
                    : '백업 없음'
                  }
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleCreateBackup}
            disabled={isBackupCreating}
          >
            <View style={styles.settingLabelWithIcon}>
              <Icon name="save-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.settingLabel}>{t('settings.dataManagement.createBackup')}</Text>
            </View>
            {isBackupCreating ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Icon name="chevron-forward-outline" size={20} color={theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleRestoreBackup}
            disabled={isBackupRestoring || !backupInfo?.exists}
          >
            <View style={styles.settingLabelWithIcon}>
              <Icon name="refresh-outline" size={20} color={backupInfo?.exists ? theme.colors.primary : theme.colors.textSecondary} />
              <Text style={[styles.settingLabel, { color: backupInfo?.exists ? theme.colors.text : theme.colors.textSecondary }]}>
                {t('settings.dataManagement.restoreBackup')}
              </Text>
            </View>
            {isBackupRestoring ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Icon name="chevron-forward-outline" size={20} color={backupInfo?.exists ? theme.colors.textSecondary : '#ccc'} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleExportBackup}
            disabled={!backupInfo?.exists}
          >
            <View style={styles.settingLabelWithIcon}>
              <Icon name="share-outline" size={20} color={backupInfo?.exists ? theme.colors.primary : theme.colors.textSecondary} />
              <Text style={[styles.settingLabel, { color: backupInfo?.exists ? theme.colors.text : theme.colors.textSecondary }]}>
                JSON 파일로 내보내기
              </Text>
            </View>
            <Icon name="chevron-forward-outline" size={20} color={backupInfo?.exists ? theme.colors.textSecondary : '#ccc'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.settingItem, styles.lastSettingItem]}
            onPress={handleImportBackup}
            disabled={isBackupRestoring}
          >
            <View style={styles.settingLabelWithIcon}>
              <Icon name="document-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.settingLabel}>JSON 파일에서 가져오기</Text>
            </View>
            {isBackupRestoring ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Icon name="chevron-forward-outline" size={20} color={theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>{safeT('settings.about', '정보')}</Text>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={openPrivacyPolicy}
            activeOpacity={0.7}
          >
            <View style={styles.settingLabelWithIcon}>
              <Icon name="shield-checkmark-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.settingLabel}>개인정보처리방침</Text>
            </View>
            <Icon name="open-outline" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <View style={[styles.settingItem, styles.lastSettingItem]}>
            <Text style={styles.settingLabel}>{safeT('settings.version', '버전')}</Text>
            <Text style={styles.settingValue}>1.0.4</Text>
          </View>
        </View>
        </View>
      </ScrollView>

      <LanguageSelector
        visible={isLanguageSelectorVisible}
        onClose={closeLanguageSelector}
      />
      
    </SafeAreaView>
  );
};

export default SettingsScreen;