import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/Ionicons';

import { useTheme } from '../contexts/ThemeContext';
import { RootTabParamList, RootStackParamList } from '../types';
import ChatRoomsListScreen from '../screens/ChatRoomsListScreen';
import ChatScreen from '../screens/ChatScreen';
import MemosScreen from '../screens/MemosScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TrashScreen from '../screens/TrashScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

const TabsWithAd: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'ChatRooms':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
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

          return (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: focused ? 32 : 28,
              height: focused ? 32 : 28,
              borderRadius: focused ? 16 : 14,
              backgroundColor: focused ? theme.colors.primary + '15' : 'transparent',
            }}>
              <Icon 
                name={iconName} 
                size={focused ? size + 2 : size} 
                color={focused ? theme.colors.primary : color} 
              />
            </View>
          );
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          paddingBottom: 10,
          paddingTop: 10,
          height: 65,
          // 그림자 효과 추가
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
        headerStyle: {
          backgroundColor: theme.colors.background,
          // 그림자 효과 추가
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
        headerTitleStyle: {
          color: theme.colors.text,
          fontSize: 20,
          fontWeight: '700',
          letterSpacing: -0.5,
        },
        headerTitleAlign: 'center',
      })}
    >
      <Tab.Screen
        name="ChatRooms"
        component={ChatRoomsListScreen}
        options={{
          title: t('tabs.chatRooms'),
          headerShown: false,
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

const MainTabNavigator: React.FC = () => {
  return <TabsWithAd />;
};

const TabNavigator: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="Main" 
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ChatRoom" 
        component={ChatScreen}
        options={{ 
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen 
        name="Trash" 
        component={TrashScreen}
        options={{ 
          headerShown: false,
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};

export default TabNavigator;