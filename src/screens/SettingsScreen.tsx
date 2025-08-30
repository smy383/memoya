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
        t('backup.exportSuccess', { fileName })
      );
    } catch (error) {
      console.error('Error exporting backup:', error);
      Alert.alert(t('common.error'), t('settings.dataManagement.exportError'));
    }
  };

  const handleImportBackup = () => {
    Alert.alert(
      t('backup.jsonBackupImport'),
      t('backup.importMethodPrompt'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('backup.selectFile'),
          onPress: handleFilePickerImport
        },
        {
          text: t('backup.textInput'),
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
        t('backup.restoreComplete'),
        t('backup.backupRestoreSuccess'),
        [{ text: t('common.confirm') }]
      );
    } catch (error) {
      console.error('Error importing backup from file:', error);
      Alert.alert(t('common.error'), error.message || t('backup.fileRestoreError'));
    } finally {
      setIsBackupRestoring(false);
    }
  };

  const handleTextImport = () => {
    Alert.prompt(
      t('backup.backupTextInput'),
      t('backup.backupTextPrompt'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('backup.restore'),
          style: 'destructive',
          onPress: (backupText) => {
            if (!backupText || backupText.trim() === '') {
              Alert.alert(t('common.error'), t('backup.noBackupDataError'));
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
      t('backup.restoreFromBackupData'),
      t('backup.restoreConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('backup.restore'),
          style: 'destructive',
          onPress: async () => {
            try {
              setIsBackupRestoring(true);
              
              // 백업 텍스트에서 복구
              const { restoreFromBackupText } = await import('../services/backupService');
              await restoreFromBackupText(backupText);
              
              await loadBackupInfo(); // 백업 정보 새로고침
              
              Alert.alert(
                t('backup.restoreComplete'),
                t('backup.backupRestoreCompleteText'),
                [{ text: t('common.confirm') }]
              );
            } catch (error) {
              console.error('Error importing backup from text:', error);
              Alert.alert(t('common.error'), error.message || t('backup.backupDataRestoreError'));
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
      const success = await subscribeToPremium();
      if (success) {
        Alert.alert(
          t('subscription.subscriptionComplete'),
          t('subscription.subscriptionCompleteMessage'),
          [{ text: t('common.confirm') }]
        );
      } else {
        Alert.alert(t('common.error'), t('subscription.subscriptionError'), [{ text: t('common.confirm') }]);
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('subscription.subscriptionError'), [{ text: t('common.confirm') }]);
    }
  };


  const handleManageSubscription = async () => {
    try {
      // Google Play 구독 관리 페이지로 직접 연결
      const url = 'https://play.google.com/store/account/subscriptions';
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          t('subscription.manageSubscription'),
          t('subscription.manageSubscriptionMessage'),
          [{ text: t('common.confirm') }]
        );
      }
    } catch (error) {
      console.error('Error opening subscription management:', error);
      Alert.alert(
        t('subscription.manageSubscription'),
        t('subscription.manageSubscriptionMessage'),
        [{ text: t('common.confirm') }]
      );
    }
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
      Alert.alert(t('common.error'), t('subscription.privacyPolicyError'));
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

        <Text style={styles.sectionTitle}>{t('subscription.premiumSection')}</Text>
        <View style={styles.section}>
          {isPremium ? (
            <>
              <View style={styles.settingItem}>
                <View style={styles.settingLabelWithIcon}>
                  <Icon name="star" size={20} color="#FFD700" />
                  <Text style={styles.settingLabel}>{t('subscription.subscriptionStatus')}</Text>
                </View>
                <Text style={[styles.settingValue, { color: '#4CAF50', fontWeight: '600' }]}>
                  {t('subscription.premiumActive')}
                </Text>
              </View>
              <View style={styles.settingItem}>
                <View style={styles.settingLabelWithIcon}>
                  <Icon name="card-outline" size={20} color={theme.colors.textSecondary} />
                  <Text style={styles.settingLabel}>{t('subscription.subscriptionType')}</Text>
                </View>
                <Text style={styles.settingValue}>
                  {subscriptionType === 'monthly' ? t('subscription.monthlySubscription') : t('subscription.yearlySubscription')}
                </Text>
              </View>
              {subscriptionEndDate && (
                <View style={styles.settingItem}>
                  <View style={styles.settingLabelWithIcon}>
                    <Icon name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                    <Text style={styles.settingLabel}>{t('subscription.expirationDate')}</Text>
                  </View>
                  <Text style={styles.settingValue}>
                    {formatSubscriptionEndDate(subscriptionEndDate)}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.settingItem, styles.lastSettingItem]}
                onPress={handleManageSubscription}
              >
                <View style={styles.settingLabelWithIcon}>
                  <Icon name="settings-outline" size={20} color={theme.colors.primary} />
                  <Text style={styles.settingLabel}>{t('subscription.manageSubscription')}</Text>
                </View>
                <Icon name="chevron-forward-outline" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={[styles.settingItem, { paddingVertical: 16 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { fontSize: getResponsiveFontSize(16), marginBottom: 4 }]}>
                    {t('subscription.premiumExperience')}
                  </Text>
                  <Text style={[styles.settingValue, { fontSize: getResponsiveFontSize(13) }]}>
                    {t('subscription.premiumDescription')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.settingItem, styles.lastSettingItem]}
                onPress={handleSubscribeMonthly}
              >
                <View style={styles.settingLabelWithIcon}>
                  <Icon name="card-outline" size={20} color={theme.colors.primary} />
                  <Text style={styles.settingLabel}>{t('subscription.monthlySubscriptionPrice')}</Text>
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
                <Text style={styles.settingLabel}>{t('backup.savedBackupLabel')}</Text>
                <Text style={[styles.settingValue, { fontSize: getResponsiveFontSize(12), marginTop: 2 }]}>
                  {backupInfo?.exists 
                    ? t('backup.backupTimestamp', { timestamp: backupInfo.timestamp, count: backupInfo.dataCount })
                    : t('backup.noBackupData')
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
                {t('backup.exportJSON')}
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
              <Text style={styles.settingLabel}>{t('backup.importJSON')}</Text>
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
              <Text style={styles.settingLabel}>{t('subscription.privacyPolicy')}</Text>
            </View>
            <Icon name="open-outline" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <View style={[styles.settingItem, styles.lastSettingItem]}>
            <Text style={styles.settingLabel}>{safeT('settings.version', '버전')}</Text>
            <Text style={styles.settingValue}>1.2.0</Text>
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