import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import DeviceInfo from 'react-native-device-info';
import { useTheme } from '../contexts/ThemeContext';
import { ColorScheme } from '../styles/colors';
import { responsiveFontSize, SPACING, wp } from '../styles/dimensions';

interface SettingItemProps {
  title: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({ 
  title, 
  value, 
  onPress, 
  showArrow = true 
}) => {
  const { colors } = useTheme();
  
  const itemStyles = StyleSheet.create({
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
      backgroundColor: colors.surface,
    },
    settingTitle: {
      fontSize: responsiveFontSize(16),
      flex: 1,
      color: colors.text,
    },
    settingValue: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    settingValueText: {
      fontSize: responsiveFontSize(16),
      marginRight: SPACING.sm,
      color: colors.textSecondary,
    },
    arrow: {
      fontSize: responsiveFontSize(16),
      fontWeight: '600',
      color: colors.textSecondary,
    },
  });
  
  return (
    <TouchableOpacity
      style={itemStyles.settingItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={itemStyles.settingTitle}>
        {title}
      </Text>
      <View style={itemStyles.settingValue}>
        {value && (
          <Text style={itemStyles.settingValueText}>
            {value}
          </Text>
        )}
        {showArrow && onPress && (
          <Text style={itemStyles.arrow}>
            →
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export const SettingsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { colors, colorScheme, setColorScheme } = useTheme();

  const handleThemeChange = () => {
    Alert.alert(
      t('settings.theme'),
      '',
      [
        {
          text: t('settings.lightMode'),
          onPress: () => setColorScheme('light'),
        },
        {
          text: t('settings.darkMode'),
          onPress: () => setColorScheme('dark'),
        },
        {
          text: t('settings.systemMode'),
          onPress: () => setColorScheme('system'),
        },
        {
          text: '취소',
          style: 'cancel',
        },
      ]
    );
  };

  const handleLanguageChange = () => {
    Alert.alert(
      t('settings.language'),
      '',
      [
        {
          text: '한국어',
          onPress: () => i18n.changeLanguage('ko'),
        },
        {
          text: 'English',
          onPress: () => i18n.changeLanguage('en'),
        },
        {
          text: '취소',
          style: 'cancel',
        },
      ]
    );
  };

  const getThemeDisplayName = (scheme: ColorScheme) => {
    switch (scheme) {
      case 'light':
        return t('settings.lightMode');
      case 'dark':
        return t('settings.darkMode');
      case 'system':
        return t('settings.systemMode');
      default:
        return t('settings.systemMode');
    }
  };

  const getLanguageDisplayName = (languageCode: string) => {
    switch (languageCode) {
      case 'ko':
        return '한국어';
      case 'en':
        return 'English';
      default:
        return 'English';
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    section: {
      marginVertical: SPACING.sm,
    },
    sectionTitle: {
      fontSize: responsiveFontSize(14),
      fontWeight: '600',
      color: colors.textSecondary,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      textTransform: 'uppercase',
    },
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('settings.title')}
        </Text>
        <SettingItem
          title={t('settings.theme')}
          value={getThemeDisplayName(colorScheme)}
          onPress={handleThemeChange}
        />
        <SettingItem
          title={t('settings.language')}
          value={getLanguageDisplayName(i18n.language)}
          onPress={handleLanguageChange}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('settings.about')}
        </Text>
        <SettingItem
          title={t('settings.version')}
          value={DeviceInfo.getVersion()}
          showArrow={false}
        />
      </View>
    </ScrollView>
  );
};