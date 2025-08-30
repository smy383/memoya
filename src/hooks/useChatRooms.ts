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

  // 채팅방 목록 저장
  const saveChatRooms = async (rooms: ChatRoom[]) => {
    try {
      console.log('useChatRooms: Saving rooms:', rooms.map(r => ({ id: r.id, title: r.title })));
      await AsyncStorage.setItem(STORAGE_KEYS.CHAT_ROOMS, JSON.stringify(rooms));
      console.log('useChatRooms: Rooms saved successfully');
      
      // 저장 확인
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_ROOMS);
      console.log('useChatRooms: Verification - saved data exists:', !!saved);
    } catch (error) {
      console.error('Error saving chat rooms:', error);
    }
  };



  // 채팅방 목록 로드
  const loadChatRooms = async () => {
    try {
      console.log('useChatRooms: Loading chat rooms...');
      const savedRooms = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_ROOMS);
      const savedCurrentRoomId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_ROOM_ID);
      
      console.log('useChatRooms: savedRooms:', savedRooms);
      console.log('useChatRooms: savedCurrentRoomId:', savedCurrentRoomId);
      
      if (savedRooms && savedRooms !== 'null') {
        const rooms: ChatRoom[] = JSON.parse(savedRooms).map((room: any) => ({
          ...room,
          createdAt: new Date(room.createdAt),
          updatedAt: new Date(room.updatedAt),
          lastMessage: room.lastMessage ? {
            ...room.lastMessage,
            timestamp: new Date(room.lastMessage.timestamp)
          } : undefined
        }));
        console.log('useChatRooms: Loaded rooms:', rooms.map(r => r.id));
        setChatRooms(rooms);
        
        if (savedCurrentRoomId && rooms.find(room => room.id === savedCurrentRoomId)) {
          setCurrentRoomId(savedCurrentRoomId);
        } else if (rooms.length > 0) {
          setCurrentRoomId(rooms[0].id);
        }
      } else {
        // 저장된 채팅방이 없으면 빈 상태로 시작
        console.log('useChatRooms: No saved rooms, starting with empty state');
        setChatRooms([]);
        setCurrentRoomId(null);
      }
    } catch (error) {
      console.error('Error loading chat rooms:', error);
      // 오류 발생 시에도 빈 상태로 시작
      setChatRooms([]);
      setCurrentRoomId(null);
    } finally {
      setIsLoading(false);
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
    
    // 상태 업데이트를 먼저 하여 즈시 UI에 반영
    setChatRooms(updatedRooms);
    setCurrentRoomId(roomId);
    
    console.log('createRoom: State updated immediately for UI responsiveness');
    
    try {
      // 마지막에 AsyncStorage에 저장 (비동기)
      await Promise.all([
        saveChatRooms(updatedRooms),
        AsyncStorage.setItem(STORAGE_KEYS.CURRENT_ROOM_ID, roomId)
      ]);
      
      console.log('createRoom: Successfully saved to AsyncStorage:', roomId);
      
    } catch (error) {
      console.error('createRoom: Error saving room data:', error);
      // 저장 실패 시 상태 되돌리기
      setChatRooms(chatRooms);
      setCurrentRoomId(currentRoomId);
      throw error;
    }
    
    return newRoom;
  }, [chatRooms, currentRoomId]);

  // 채팅방 업데이트
  const updateRoom = useCallback(async (roomId: string, updates: Partial<ChatRoom>, updateTimestamp = true) => {
    const updatedRooms = chatRooms.map(room => 
      room.id === roomId 
        ? { ...room, ...updates, ...(updateTimestamp ? { updatedAt: new Date() } : {}) }
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
  }, [chatRooms, currentRoomId, safeT]);

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

  // 실제 데이터를 기반으로 채팅방 메타데이터 계산
  const calculateRoomMetadata = useCallback(async (roomId: string) => {
    try {
      // 메시지 수 계산 (메모 제외)
      const messagesKey = `chatMessages_${roomId}`;
      const storedMessages = await AsyncStorage.getItem(messagesKey);
      const messages = storedMessages ? JSON.parse(storedMessages) : [];
      const messageCount = messages.filter((msg: any) => msg.type !== 'record').length;

      // 메모 수 계산
      const memosKey = `memos_${roomId}`;
      const storedMemos = await AsyncStorage.getItem(memosKey);
      const memos = storedMemos ? JSON.parse(storedMemos) : [];
      const memoCount = memos.length;

      // 마지막 메시지 찾기
      let lastMessage: ChatRoom['lastMessage'] = undefined;
      if (messages.length > 0) {
        const sortedMessages = messages.sort((a: any, b: any) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        const latest = sortedMessages[0];
        lastMessage = {
          content: latest.content,
          timestamp: new Date(latest.timestamp),
          type: latest.type,
        };
      }

      return { messageCount, memoCount, lastMessage };
    } catch (error) {
      console.error('Error calculating room metadata:', error);
      return { messageCount: 0, memoCount: 0, lastMessage: undefined };
    }
  }, []);

  // 모든 채팅방의 메타데이터 새로고침
  const refreshAllRoomMetadata = useCallback(async () => {
    try {
      console.log('refreshAllRoomMetadata: Starting refresh for', chatRooms.length, 'rooms');
      if (chatRooms.length === 0) {
        console.log('refreshAllRoomMetadata: No rooms to refresh, skipping');
        return;
      }
      
      const updatedRooms = await Promise.all(
        chatRooms.map(async (room) => {
          const metadata = await calculateRoomMetadata(room.id);
          return { ...room, ...metadata };
        })
      );
      
      // 실제 변경사항이 있을 때만 업데이트
      const hasChanges = updatedRooms.some((updated, index) => {
        const original = chatRooms[index];
        return updated.messageCount !== original.messageCount ||
               updated.memoCount !== original.memoCount ||
               updated.lastMessage?.content !== original.lastMessage?.content;
      });
      
      if (hasChanges) {
        console.log('refreshAllRoomMetadata: Changes detected, updating rooms');
        setChatRooms(updatedRooms);
        await saveChatRooms(updatedRooms);
      } else {
        console.log('refreshAllRoomMetadata: No changes detected, skipping update');
      }
    } catch (error) {
      console.error('Error refreshing room metadata:', error);
    }
  }, [chatRooms, calculateRoomMetadata]);

  // 즐겨찾기 토글
  const toggleFavorite = useCallback(async (roomId: string) => {
    const room = chatRooms.find(r => r.id === roomId);
    if (!room) return;

    const newFavoriteState = !room.isFavorite;
    
    // 즉시 UI 업데이트 (Optimistic Update)
    const updatedRooms = chatRooms.map(r => 
      r.id === roomId 
        ? { ...r, isFavorite: newFavoriteState }
        : r
    );
    setChatRooms(updatedRooms);
    
    // 비동기로 저장
    try {
      await saveChatRooms(updatedRooms);
    } catch (error) {
      console.error('Error saving favorite state:', error);
      // 실패 시 롤백
      setChatRooms(chatRooms);
    }
  }, [chatRooms, saveChatRooms]);

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
  }, []);

  return {
    chatRooms,
    currentRoomId,
    isLoading,
    createRoom,
    updateRoom,
    deleteRoom,
    setCurrentRoom,
    getCurrentRoom,
    toggleFavorite,
    updateRoomMetadata,
    calculateRoomMetadata,
    refreshAllRoomMetadata,
    refetch: loadChatRooms,
  };
};