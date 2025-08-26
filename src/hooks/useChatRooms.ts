import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { ChatRoom } from '../types';

const STORAGE_KEYS = {
  CHAT_ROOMS: 'chatRooms',
  CURRENT_ROOM_ID: 'currentRoomId',
  APP_SETTINGS: 'appSettings',
} as const;

interface AppSettings {
  lastUsedRoomId?: string;
  dataVersion?: string;
}

export const useChatRooms = () => {
  const { t } = useTranslation();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // i18n이 아직 로드되지 않은 경우 기본값 사용
  const safeT = (key: string, defaultValue?: string) => {
    try {
      return t(key) || defaultValue || key;
    } catch (error) {
      return defaultValue || key;
    }
  };

  // 채팅방 목록 로드
  const loadChatRooms = useCallback(async () => {
    try {
      const savedRooms = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_ROOMS);
      const savedCurrentRoomId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_ROOM_ID);
      
      if (savedRooms) {
        const rooms: ChatRoom[] = JSON.parse(savedRooms).map((room: any) => ({
          ...room,
          createdAt: new Date(room.createdAt),
          updatedAt: new Date(room.updatedAt),
          lastMessage: room.lastMessage ? {
            ...room.lastMessage,
            timestamp: new Date(room.lastMessage.timestamp)
          } : undefined
        }));
        setChatRooms(rooms);
        
        if (savedCurrentRoomId && rooms.find(room => room.id === savedCurrentRoomId)) {
          setCurrentRoomId(savedCurrentRoomId);
        } else if (rooms.length > 0) {
          setCurrentRoomId(rooms[0].id);
        }
      } else {
        // 첫 실행시 기본 채팅방 생성
        await createDefaultRoom();
      }
    } catch (error) {
      console.error('Error loading chat rooms:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 기본 채팅방 생성
  const createDefaultRoom = async () => {
    const defaultRoom: ChatRoom = {
      id: 'default-room',
      title: '기본 채팅방',
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
      memoCount: 0,
    };

    setChatRooms([defaultRoom]);
    setCurrentRoomId(defaultRoom.id);
    await saveChatRooms([defaultRoom]);
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_ROOM_ID, defaultRoom.id);
  };

  // 채팅방 목록 저장
  const saveChatRooms = async (rooms: ChatRoom[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CHAT_ROOMS, JSON.stringify(rooms));
    } catch (error) {
      console.error('Error saving chat rooms:', error);
    }
  };

  // 새 채팅방 생성
  const createRoom = useCallback(async (title?: string): Promise<ChatRoom> => {
    const roomId = `room-${Date.now()}`;
    const roomTitle = title || `새 채팅 ${chatRooms.length + 1}`;
    
    console.log('createRoom: Creating new room with ID:', roomId);
    
    const newRoom: ChatRoom = {
      id: roomId,
      title: roomTitle,
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
      memoCount: 0,
    };

    const updatedRooms = [...chatRooms, newRoom];
    setChatRooms(updatedRooms);
    await saveChatRooms(updatedRooms);
    
    // 새 채팅방을 현재 채팅방으로 설정
    setCurrentRoomId(roomId);
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_ROOM_ID, roomId);
    
    console.log('createRoom: Set new room as current:', roomId);
    
    return newRoom;
  }, [chatRooms, t]);

  // 채팅방 업데이트
  const updateRoom = useCallback(async (roomId: string, updates: Partial<ChatRoom>) => {
    const updatedRooms = chatRooms.map(room => 
      room.id === roomId 
        ? { ...room, ...updates, updatedAt: new Date() }
        : room
    );
    
    setChatRooms(updatedRooms);
    await saveChatRooms(updatedRooms);
  }, [chatRooms]);

  // 채팅방 삭제
  const deleteRoom = useCallback(async (roomId: string) => {
    if (chatRooms.length <= 1) {
      throw new Error(safeT('chatRooms.cannotDeleteLastRoom', '마지막 채팅방은 삭제할 수 없습니다.'));
    }

    try {
      // 관련 데이터 삭제
      await AsyncStorage.removeItem(`chatMessages_${roomId}`);
      await AsyncStorage.removeItem(`memos_${roomId}`);
      await AsyncStorage.removeItem(`trashedMemos_${roomId}`);

      const updatedRooms = chatRooms.filter(room => room.id !== roomId);
      setChatRooms(updatedRooms);
      await saveChatRooms(updatedRooms);

      // 현재 채팅방이 삭제된 경우 다른 채팅방으로 변경
      if (currentRoomId === roomId) {
        const newCurrentRoomId = updatedRooms[0]?.id;
        setCurrentRoomId(newCurrentRoomId);
        if (newCurrentRoomId) {
          await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_ROOM_ID, newCurrentRoomId);
        }
      }
    } catch (error) {
      console.error('Error deleting chat room:', error);
      throw error;
    }
  }, [chatRooms, currentRoomId, t]);

  // 현재 채팅방 변경
  const setCurrentRoom = useCallback(async (roomId: string) => {
    console.log('setCurrentRoom: Setting current room to:', roomId);
    console.log('setCurrentRoom: Available rooms:', chatRooms.map(r => r.id));
    
    // 채팅방이 존재하는지 확인하되, 새로 생성된 채팅방의 경우 바로 설정 허용
    const roomExists = chatRooms.find(room => room.id === roomId);
    if (roomExists || roomId.startsWith('room-')) {
      console.log('setCurrentRoom: Room found or is new room, setting as current');
      setCurrentRoomId(roomId);
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_ROOM_ID, roomId);
    } else {
      console.log('setCurrentRoom: Room not found:', roomId);
    }
  }, [chatRooms]);

  // 현재 채팅방 가져오기
  const getCurrentRoom = useCallback((): ChatRoom | null => {
    return currentRoomId ? chatRooms.find(room => room.id === currentRoomId) || null : null;
  }, [chatRooms, currentRoomId]);

  // 채팅방 메타데이터 업데이트 (메시지/메모 개수, 마지막 메시지)
  const updateRoomMetadata = useCallback(async (roomId: string, metadata: {
    messageCount?: number;
    memoCount?: number;
    lastMessage?: ChatRoom['lastMessage'];
  }) => {
    await updateRoom(roomId, metadata);
  }, [updateRoom]);

  useEffect(() => {
    loadChatRooms();
  }, [loadChatRooms]);

  return {
    chatRooms,
    currentRoomId,
    isLoading,
    createRoom,
    updateRoom,
    deleteRoom,
    setCurrentRoom,
    getCurrentRoom,
    updateRoomMetadata,
    refetch: loadChatRooms,
  };
};