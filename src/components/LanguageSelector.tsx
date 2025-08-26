import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { getResponsiveFontSize } from '../utils/dimensions';

interface LanguageSelectorProps {
  visible: boolean;
  onClose: () => void;
}

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
];

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ visible, onClose }) => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();

  // i18n이 아직 로드되지 않은 경우 기본값 사용
  const safeT = (key: string, defaultValue?: string) => {
    try {
      return t(key) || defaultValue || key;
    } catch (error) {
      return defaultValue || key;
    }
  };

  const handleLanguageSelect = async (languageCode: string) => {
    try {
      await i18n.changeLanguage(languageCode);
      await AsyncStorage.setItem('selectedLanguage', languageCode);
      onClose();
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing?.lg || 24,
    },
    modal: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius,
      width: '100%',
      maxWidth: 400,
      maxHeight: '70%',
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing?.lg || 24,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: getResponsiveFontSize(20),
      fontWeight: '600',
      color: theme.colors.text,
    },
    closeButton: {
      padding: theme.spacing?.xs || 4,
    },
    languageList: {
      maxHeight: 400,
    },
    languageItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing?.lg || 24,
      paddingVertical: theme.spacing?.md || 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    lastLanguageItem: {
      borderBottomWidth: 0,
    },
    languageItemSelected: {
      backgroundColor: theme.colors.primary + '10',
    },
    flag: {
      fontSize: getResponsiveFontSize(24),
      marginRight: theme.spacing?.md || 16,
    },
    languageInfo: {
      flex: 1,
    },
    languageName: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: 2,
    },
    nativeName: {
      fontSize: getResponsiveFontSize(14),
      color: theme.colors.textSecondary,
    },
    checkIcon: {
      marginLeft: theme.spacing?.sm || 8,
    },
  }), [theme]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {safeT('settings.selectLanguage', '언어 선택')}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Icon
                name="close-outline"
                size={24}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.languageList} showsVerticalScrollIndicator={false}>
            {LANGUAGES.map((language, index) => {
              const isSelected = i18n.language === language.code;
              const isLast = index === LANGUAGES.length - 1;

              return (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.languageItem,
                    isLast && styles.lastLanguageItem,
                    isSelected && styles.languageItemSelected,
                  ]}
                  onPress={() => handleLanguageSelect(language.code)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.flag}>{language.flag}</Text>
                  <View style={styles.languageInfo}>
                    <Text style={styles.languageName}>{language.name}</Text>
                    <Text style={styles.nativeName}>{language.nativeName}</Text>
                  </View>
                  {isSelected && (
                    <Icon
                      name="checkmark-outline"
                      size={20}
                      color={theme.colors.primary}
                      style={styles.checkIcon}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default LanguageSelector;