import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/Ionicons';
import { ChatScreen } from '../screens/ChatScreen';
import { MemoScreen } from '../screens/MemoScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useTheme } from '../contexts/ThemeContext';
import { responsiveFontSize, SPACING } from '../styles/dimensions';

const Tab = createBottomTabNavigator();

const TabIcon: React.FC<{ focused: boolean; title: string }> = ({ focused, title }) => {
  const { colors } = useTheme();
  
  return (
    <Icon
      name={getTabIcon(title)}
      size={responsiveFontSize(24)}
      color={focused ? colors.tabBarActive : colors.tabBarInactive}
    />
  );
};

const getTabIcon = (title: string): string => {
  switch (title) {
    case 'Chat':
    case '채팅':
      return 'chatbubbles';
    case 'Memo':
    case '메모':
      return 'document-text';
    case 'Settings':
    case '설정':
      return 'settings';
    default:
      return 'help-circle';
  }
};

export const TabNavigator: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabIcon focused={focused} title={route.name} />
        ),
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.border,
          paddingVertical: SPACING.xs,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: responsiveFontSize(12),
          fontWeight: '600',
          marginTop: -SPACING.xs,
        },
        headerStyle: {
          backgroundColor: colors.background,
          shadowColor: colors.border,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 4,
        },
        headerTitleStyle: {
          color: colors.text,
          fontSize: responsiveFontSize(18),
          fontWeight: '600',
        },
        headerTintColor: colors.text,
      })}
    >
      <Tab.Screen 
        name={t('navigation.chat')} 
        component={ChatScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name={t('navigation.memo')} 
        component={MemoScreen}
      />
      <Tab.Screen 
        name={t('navigation.settings')} 
        component={SettingsScreen}
      />
    </Tab.Navigator>
  );
};