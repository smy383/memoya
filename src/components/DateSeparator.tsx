import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { responsiveFontSize, SPACING } from '../styles/dimensions';

interface DateSeparatorProps {
  date: Date;
}

export const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  const { colors } = useTheme();

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const messageDate = new Date(date);
    messageDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);

    if (messageDate.getTime() === today.getTime()) {
      return '오늘';
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return '어제';
    } else {
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short'
      });
    }
  };

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: SPACING.md,
      marginHorizontal: SPACING.md,
    },
    line: {
      flex: 1,
      height: 1,
      backgroundColor: colors.borderLight,
    },
    dateText: {
      fontSize: responsiveFontSize(12),
      color: colors.textSecondary,
      backgroundColor: colors.background,
      paddingHorizontal: SPACING.sm,
      fontWeight: '500',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <Text style={styles.dateText}>{formatDate(date)}</Text>
      <View style={styles.line} />
    </View>
  );
};