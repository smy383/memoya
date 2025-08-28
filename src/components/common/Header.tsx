import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { getResponsiveFontSize } from '../../utils/dimensions';

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
}

const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton = false,
  onBackPress,
  rightComponent,
  size = 'medium'
}) => {
  const { theme } = useTheme();

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return getResponsiveFontSize(18);
      case 'medium':
        return getResponsiveFontSize(20);
      case 'large':
        return getResponsiveFontSize(28);
      default:
        return getResponsiveFontSize(20);
    }
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: theme.colors.background,
      // 그림자 효과
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      borderBottomWidth: 0,
    },
    backButton: {
      padding: 12,
      marginRight: 12,
      marginLeft: -4,
      borderRadius: 24,
      backgroundColor: 'transparent',
    },
    titleContainer: {
      flex: 1,
      alignItems: showBackButton ? 'flex-start' : 'center',
    },
    title: {
      fontSize: getFontSize(),
      fontWeight: size === 'large' ? '800' : '700',
      color: theme.colors.text,
      letterSpacing: size === 'large' ? -0.8 : -0.5,
    },
    rightContainer: {
      alignItems: 'flex-end',
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        {showBackButton && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackPress}
            activeOpacity={0.7}
          >
            <Icon name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        )}
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
        </View>
        
        {rightComponent && (
          <View style={styles.rightContainer}>
            {rightComponent}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default Header;