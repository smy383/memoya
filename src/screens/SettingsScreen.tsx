import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
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

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const SettingsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme, isDark, toggleTheme } = useTheme();
  const { isPremium, subscriptionType, subscriptionEndDate, subscribeToPremium, cancelSubscription } = useSubscription();
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const [isLanguageSelectorVisible, setIsLanguageSelectorVisible] = useState(false);

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

  const checkStoredData = async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const allData = await AsyncStorage.multiGet(allKeys);

      let dataInfo = t('settings.dataManagement.storedDataPrefix') + '\n\n';
      allData.forEach(([key, value]) => {
        if (value) {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              dataInfo += `${key}: ${parsed.length}${t('settings.dataManagement.itemsCount')}\n`;
              if (key === 'chatRooms') {
                parsed.forEach((room: any, index: number) => {
                  dataInfo += `  ${index + 1}. ${room.title} (${room.id})\n`;
                });
              }
            } else if (typeof parsed === 'object') {
              dataInfo += `${key}: ${t('settings.dataManagement.objectType')}\n`;
            } else {
              dataInfo += `${key}: ${value}\n`;
            }
          } catch {
            dataInfo += `${key}: ${value}\n`;
          }
        } else {
          dataInfo += `${key}: null\n`;
        }
      });

      Alert.alert(t('settings.dataManagement.storedDataTitle'), dataInfo);
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.dataManagement.checkDataError'));
    }
  };

  const testSaveRoom = async () => {
    try {
      const testRoom = {
        id: 'test-room-' + Date.now(),
        title: t('settings.dataManagement.testRoomTitle'),
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: 0,
        memoCount: 0,
      };

      await AsyncStorage.setItem('chatRooms', JSON.stringify([testRoom]));
      Alert.alert(t('common.success'), t('settings.dataManagement.testRoomSuccess'));
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.dataManagement.testRoomError'));
    }
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
              // 모든 AsyncStorage 데이터 삭제
              await AsyncStorage.clear();
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
            style={styles.settingItem}
            onPress={checkStoredData}
          >
            <View style={styles.settingLabelWithIcon}>
              <Icon name="information-circle-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.settingLabel}>{t('settings.dataManagement.checkStoredData')}</Text>
            </View>
            <Icon name="chevron-forward-outline" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={testSaveRoom}
          >
            <View style={styles.settingLabelWithIcon}>
              <Icon name="flask-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.settingLabel}>{t('settings.dataManagement.saveTestRoom')}</Text>
            </View>
            <Icon name="chevron-forward-outline" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
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

        <Text style={styles.sectionTitle}>{safeT('settings.about', '정보')}</Text>
        <View style={styles.section}>
          <View style={[styles.settingItem, styles.lastSettingItem]}>
            <Text style={styles.settingLabel}>{safeT('settings.version', '버전')}</Text>
            <Text style={styles.settingValue}>1.0.0</Text>
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