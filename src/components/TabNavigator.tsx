import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/Ionicons';

import { useTheme } from '../contexts/ThemeContext';
import { RootTabParamList } from '../types';
import ChatScreen from '../screens/ChatScreen';
import MemosScreen from '../screens/MemosScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();

const TabNavigator: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Chat':
              iconName = focused ? 'chatbubble' : 'chatbubble-outline';
              break;
            case 'Memos':
              iconName = focused ? 'document-text' : 'document-text-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        headerTitleStyle: {
          color: theme.colors.text,
          fontSize: 18,
          fontWeight: '600',
        },
        headerTitleAlign: 'center',
      })}
    >
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          title: t('tabs.chat'),
          headerTitle: t('tabs.chat'),
        }}
      />
      <Tab.Screen
        name="Memos"
        component={MemosScreen}
        options={{
          title: t('tabs.memos'),
          headerTitle: t('memos.title'),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t('tabs.settings'),
          headerTitle: t('settings.title'),
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;