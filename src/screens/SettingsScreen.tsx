import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../types';
import { getResponsiveFontSize, isTablet } from '../utils/dimensions';
import LanguageSelector from '../components/LanguageSelector';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const SettingsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme, isDark, toggleTheme } = useTheme();
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

      let dataInfo = '저장된 데이터:\n\n';
      allData.forEach(([key, value]) => {
        if (value) {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              dataInfo += `${key}: ${parsed.length}개 항목\n`;
              if (key === 'chatRooms') {
                parsed.forEach((room: any, index: number) => {
                  dataInfo += `  ${index + 1}. ${room.title} (${room.id})\n`;
                });
              }
            } else if (typeof parsed === 'object') {
              dataInfo += `${key}: 객체\n`;
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

      Alert.alert('저장된 데이터 확인', dataInfo);
    } catch (error) {
      Alert.alert('오류', '데이터 확인 중 오류가 발생했습니다.');
    }
  };

  const testSaveRoom = async () => {
    try {
      const testRoom = {
        id: 'test-room-' + Date.now(),
        title: '테스트 채팅방',
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: 0,
        memoCount: 0,
      };

      await AsyncStorage.setItem('chatRooms', JSON.stringify([testRoom]));
      Alert.alert('성공', '테스트 채팅방이 저장되었습니다.');
    } catch (error) {
      Alert.alert('오류', '테스트 저장 중 오류가 발생했습니다.');
    }
  };

  const resetAllData = () => {
    Alert.alert(
      '⚠️ 모든 데이터 삭제',
      '정말로 모든 데이터를 삭제하시겠습니까?\n\n🚨 주의사항:\n• 모든 채팅방이 삭제됩니다\n• 모든 메시지가 삭제됩니다\n• 모든 메모가 삭제됩니다\n• 휴지통 데이터도 모두 삭제됩니다\n• 삭제된 데이터는 절대로 복구할 수 없습니다\n\n앱을 다시 시작해야 합니다.',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '모든 데이터 삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              // 모든 AsyncStorage 데이터 삭제
              await AsyncStorage.clear();
              Alert.alert(
                '완료',
                '모든 데이터가 삭제되었습니다.\n앱을 다시 시작해주세요.',
                [
                  {
                    text: '확인',
                    onPress: () => {
                      // 앱 재시작을 위해 강제 종료
                      // React Native에서는 직접 앱을 종료할 수 없으므로 사용자가 수동으로 재시작해야 함
                    }
                  }
                ]
              );
            } catch (error) {
              Alert.alert('오류', '데이터 삭제 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  };


  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
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
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.appName}>Memoya</Text>

        <Text style={styles.sectionTitle}>Appearance</Text>
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

        <Text style={styles.sectionTitle}>General</Text>
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

        <Text style={styles.sectionTitle}>데이터 관리</Text>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={checkStoredData}
          >
            <View style={styles.settingLabelWithIcon}>
              <Icon name="information-circle-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.settingLabel}>저장된 데이터 확인</Text>
            </View>
            <Icon name="chevron-forward-outline" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={testSaveRoom}
          >
            <View style={styles.settingLabelWithIcon}>
              <Icon name="flask-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.settingLabel}>테스트 채팅방 저장</Text>
            </View>
            <Icon name="chevron-forward-outline" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.settingItem, styles.lastSettingItem]}
            onPress={resetAllData}
          >
            <View style={styles.settingLabelWithIcon}>
              <Icon name="warning-outline" size={20} color="#ff4757" />
              <Text style={[styles.settingLabel, { color: '#ff4757' }]}>모든 데이터 삭제</Text>
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

      <LanguageSelector
        visible={isLanguageSelectorVisible}
        onClose={closeLanguageSelector}
      />
    </View>
  );
};

export default SettingsScreen;