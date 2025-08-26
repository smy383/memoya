import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getResponsiveFontSize } from '../../utils/dimensions';

interface AIProcessingIndicatorProps {
  isProcessing: boolean;
  status: string;
}

const AIProcessingIndicator: React.FC<AIProcessingIndicatorProps> = React.memo(({
  isProcessing,
  status
}) => {
  const { theme } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    processingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginHorizontal: 16,
      marginVertical: 4,
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      maxWidth: '80%',
    },
    processingText: {
      marginLeft: 8,
      fontSize: getResponsiveFontSize(14),
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
    },
  }), [theme.colors]);

  if (!isProcessing) return null;

  return (
    <View style={styles.processingContainer}>
      <ActivityIndicator size="small" color={theme.colors.primary} />
      <Text style={styles.processingText}>{status}</Text>
    </View>
  );
});

export default AIProcessingIndicator;