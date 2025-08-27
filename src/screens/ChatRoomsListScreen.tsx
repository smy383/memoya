import React, { useMemo, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { getResponsiveFontSize, isTablet } from '../utils/dimensions';
import { useChatRooms } from '../hooks/useChatRooms';
import { ChatRoom, RootStackParamList } from '../types';
import ChatRoomItem from '../components/chat/ChatRoomItem';
import EditRoomNameModal from '../components/chat/EditRoomNameModal';
import CreateRoomModal from '../components/chat/CreateRoomModal';
import BannerAdComponent from '../components/ads/BannerAdComponent';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const ChatRoomsListScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isPremium } = useSubscription();
  const navigation = useNavigation<NavigationProp>();
  
  // i18n이 아직 로드되지 않은 경우 기본값 사용
  const safeT = (key: string, defaultValue?: string) => {
    try {
      return t(key) || defaultValue || key;
    } catch (error) {
      return defaultValue || key;
    }
  };
  
  const {
    chatRooms,
    currentRoomId,
    isLoading,
    createRoom,
    updateRoom,
    deleteRoom,
    setCurrentRoom,
    refreshAllRoomMetadata,
    refetch,
  } = useChatRooms();

  // 편집 모달 상태
  const [editingRoom, setEditingRoom] = useState<ChatRoom | null>(null);
  
  // 편집 모드 상태
  const [isEditMode, setIsEditMode] = useState(false);
  
  // 새 채팅방 생성 모달 상태
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

  // 화면 포커스 시 메타데이터 새로고침
  useFocusEffect(
    useCallback(() => {
      console.log('ChatRoomsListScreen: Screen focused, refreshing metadata');
      // 채팅방이 있는 경우에만 새로고침
      if (chatRooms.length > 0) {
        refreshAllRoomMetadata();
      }
    }, [refreshAllRoomMetadata, chatRooms.length])
  );

  const handleRoomPress = async (roomId: string) => {
    if (isEditMode) return; // 편집 모드에서는 채팅방 이동 비활성화
    await setCurrentRoom(roomId);
    navigation.navigate('ChatRoom', { roomId });
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  const handleRoomLongPress = (roomId: string) => {
    const room = chatRooms.find(r => r.id === roomId);
    if (!room) return;

    Alert.alert(
      room.title,
      safeT('chatRooms.selectAction', '작업을 선택하세요'),
      [
        {
          text: safeT('common.cancel', '취소'),
          style: 'cancel',
        },
        {
          text: safeT('chatRooms.edit', '편집'),
          onPress: () => handleEditRoom(roomId),
        },
        {
          text: safeT('chatRooms.delete', '삭제'),
          style: 'destructive',
          onPress: () => handleDeleteRoom(roomId),
        },
      ]
    );
  };

  const handleEditRoom = (roomId: string) => {
    const room = chatRooms.find(r => r.id === roomId);
    if (room) {
      setEditingRoom(room);
    }
  };

  const handleSaveRoomName = async (roomId: string, newTitle: string) => {
    await updateRoom(roomId, { title: newTitle });
  };

  const handleCloseEditModal = () => {
    setEditingRoom(null);
  };

  const handleDeleteRoom = (roomId: string) => {
    const room = chatRooms.find(r => r.id === roomId);
    if (!room) return;

    Alert.alert(
      safeT('chatRooms.deleteConfirmTitle', '⚠️ 채팅방 완전 삭제'),
      safeT('chatRooms.deleteConfirmMessage', `"${room.title}" 채팅방을 삭제하시겠습니까?\n\n🚨 주의사항:\n• 모든 채팅 메시지가 삭제됩니다\n• 모든 메모가 삭제됩니다\n• 휴지통의 메모도 모두 삭제됩니다\n• 삭제된 데이터는 절대로 복구할 수 없습니다\n\n정말로 삭제하시겠습니까?`).replace('{{title}}', room.title),
      [
        {
          text: safeT('common.cancel', '취소'),
          style: 'cancel',
        },
        {
          text: safeT('chatRooms.permanentDelete', '완전 삭제'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRoom(roomId);
            } catch (error) {
              Alert.alert(
                safeT('common.error', '오류'),
                error instanceof Error ? error.message : 
                  safeT('chatRooms.deleteError', '채팅방 삭제 중 오류가 발생했습니다.')
              );
            }
          },
        },
      ]
    );
  };

  const handleCreateRoom = async (title: string) => {
    try {
      const newRoom = await createRoom(title);
      console.log('handleCreateRoom: Created room:', newRoom.id);
      navigation.navigate('ChatRoom', { roomId: newRoom.id });
    } catch (error) {
      Alert.alert(
        safeT('common.error', '오류'),
        safeT('chatRooms.createError', '새 채팅방 생성 중 오류가 발생했습니다.')
      );
    }
  };

  const handleShowCreateModal = () => {
    setIsCreateModalVisible(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalVisible(false);
  };

  // 채팅방 목록과 광고를 혼합한 데이터 생성
  const mixedData = useMemo(() => {
    if (isPremium) {
      return chatRooms.map(room => ({ type: 'chatRoom', data: room }));
    }

    const result: Array<{ type: 'chatRoom' | 'ad'; data?: ChatRoom; adIndex?: number }> = [];
    chatRooms.forEach((room, index) => {
      result.push({ type: 'chatRoom', data: room });
      // 3개마다 광고 삽입 (인덱스 2, 5, 8, ... 다음에)
      if ((index + 1) % 3 === 0 && index < chatRooms.length - 1) {
        result.push({ type: 'ad', adIndex: Math.floor(index / 3) });
      }
    });
    return result;
  }, [chatRooms, isPremium]);

  const renderItem = ({ item }: { item: { type: 'chatRoom' | 'ad'; data?: ChatRoom; adIndex?: number } }) => {
    if (item.type === 'ad') {
      return <BannerAdComponent screenName="chat" />;
    }
    
    if (item.data) {
      return (
        <ChatRoomItem
          chatRoom={item.data}
          onPress={handleRoomPress}
          onLongPress={handleRoomLongPress}
          isCurrentRoom={item.data.id === currentRoomId}
          isEditMode={isEditMode}
          onEdit={handleEditRoom}
          onDelete={handleDeleteRoom}
        />
      );
    }
    
    return null;
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        {safeT('chatRooms.noRooms', '채팅방이 없습니다')}
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        {safeT('chatRooms.createFirstRoom', '새 채팅방을 만들어보세요')}
      </Text>
    </View>
  );

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: theme.spacing?.md || 16,
      paddingVertical: theme.spacing?.sm || 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      fontSize: getResponsiveFontSize(24),
      fontWeight: '700',
      color: theme.colors.text,
      flex: 1,
      textAlign: 'center',
    },
    editButton: {
      paddingHorizontal: theme.spacing?.sm || 12,
      paddingVertical: theme.spacing?.xs || 6,
    },
    editButtonText: {
      fontSize: getResponsiveFontSize(16),
      color: theme.colors.primary,
      fontWeight: '500',
    },
    editButtonTextActive: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    listContainer: {
      flex: 1,
      paddingVertical: theme.spacing?.sm || 8,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing?.xl || 32,
    },
    emptyTitle: {
      fontSize: getResponsiveFontSize(18),
      fontWeight: '600',
      marginBottom: theme.spacing?.sm || 8,
    },
    emptySubtitle: {
      fontSize: getResponsiveFontSize(14),
      textAlign: 'center',
      lineHeight: 20,
    },
    fab: {
      position: 'absolute',
      bottom: theme.spacing?.xl || 32,
      right: theme.spacing?.xl || 32,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 8,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowColor: theme.colors.primary,
    },
    fabText: {
      fontSize: getResponsiveFontSize(24),
      color: '#FFFFFF',
      fontWeight: '600',
    },
  }), [theme]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {safeT('chatRooms.title', '채팅방')}
          </Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={toggleEditMode}
            activeOpacity={0.7}
          >
            <Text style={[styles.editButtonText, isEditMode && styles.editButtonTextActive]}>
              {isEditMode ? '완료' : '편집'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.listContainer}>
        <FlatList
          data={mixedData}
          renderItem={renderItem}
          keyExtractor={(item, index) => 
            item.type === 'ad' 
              ? `ad-${item.adIndex || index}` 
              : item.data?.id || `item-${index}`
          }
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={!isPremium ? <BannerAdComponent screenName="chat" /> : null}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={!isLoading ? renderEmptyState : null}
        />
      </View>

      {!isEditMode && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleShowCreateModal}
          activeOpacity={0.8}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <EditRoomNameModal
        visible={!!editingRoom}
        chatRoom={editingRoom}
        onClose={handleCloseEditModal}
        onSave={handleSaveRoomName}
      />

      <CreateRoomModal
        visible={isCreateModalVisible}
        onClose={handleCloseCreateModal}
        onCreateRoom={handleCreateRoom}
      />
    </SafeAreaView>
  );
};

export default ChatRoomsListScreen;