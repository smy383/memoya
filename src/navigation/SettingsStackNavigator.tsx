import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TrashScreen } from '../screens/TrashScreen';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { responsiveFontSize } from '../styles/dimensions';

const Stack = createStackNavigator();

export const SettingsStackNavigator: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
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
      }}
    >
      <Stack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{ title: t('navigation.settings') }}
      />
      <Stack.Screen
        name="Trash"
        component={TrashScreen}
        options={{ title: t('trash.title') }}
      />
    </Stack.Navigator>
  );
};