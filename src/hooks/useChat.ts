import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { ChatMessage } from '../components/chat/ChatMessage';

interface ChatListItem {
    id: string;
    type: 'message' | 'dateSeparator';
    message?: ChatMessage;
    date?: string;
}

export const useChat = (roomId?: string, onMetadataUpdate?: (roomId: string) => void) => {
    const { t } = useTranslation();
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatListData, setChatListData] = useState<ChatListItem[]>([]);

    const formatDate = useCallback((date: Date): string => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const isToday = date.toDateString() === today.toDateString();
        const isYesterday = date.toDateString() === yesterday.toDateString();

        if (isToday) {
            return t('common.today');
        } else if (isYesterday) {
            return t('common.yesterday');
        } else {
            const weekdays = t('weekdays');
            const weekday = weekdays[date.getDay()];
            return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${weekday}`;
        }
    }, [t]);

    const groupMessagesByDate = useCallback(() => {
        if (chatMessages.length === 0) {
            setChatListData([]);
            return;
        }

        const grouped: ChatListItem[] = [];
        let currentDate = '';

        chatMessages.forEach((message) => {
            const messageDate = message.timestamp.toDateString();

            if (messageDate !== currentDate) {
                currentDate = messageDate;
                grouped.push({
                    id: `date-${messageDate}`,
                    type: 'dateSeparator',
                    date: formatDate(message.timestamp),
                });
            }

            grouped.push({
                id: message.id,
                type: 'message',
                message,
            });
        });

        setChatListData(grouped);
    }, [chatMessages, formatDate]);

    const loadChatMessages = async () => {
        try {
            console.log('useChat: Loading messages for roomId:', roomId);
            const storageKey = roomId ? `chatMessages_${roomId}` : 'chatMessages';
            const savedMessages = await AsyncStorage.getItem(storageKey);
            console.log('useChat: Found saved messages:', !!savedMessages);
            
            if (savedMessages) {
                const parsedMessages: ChatMessage[] = JSON.parse(savedMessages);
                console.log('useChat: Parsed messages count:', parsedMessages.length);
                const messagesWithStatus = await Promise.all(
                    parsedMessages.map(async (msg) => ({
                        ...msg,
                        timestamp: new Date(msg.timestamp),
                        memoStatus: msg.type === 'record' ? await getMemoStatus(msg.id) : undefined,
                    }))
                );
                setChatMessages(messagesWithStatus);
            } else {
                // 메시지가 없으면 빈 배열로 초기화
                console.log('useChat: No messages found, initializing empty array');
                setChatMessages([]);
            }
        } catch (error) {
            console.error('Error loading chat messages:', error);
            setChatMessages([]);
        }
    };

    const getMemoStatus = async (memoId: string): Promise<'active' | 'deleted' | 'permanentlyDeleted'> => {
        try {
            const memosKey = roomId ? `memos_${roomId}` : 'memos';
            const activeMemos = await AsyncStorage.getItem(memosKey);
            if (activeMemos) {
                const memos = JSON.parse(activeMemos);
                if (memos.find((memo: any) => memo.id === memoId)) {
                    return 'active';
                }
            }

            const trashedMemosKey = roomId ? `trashedMemos_${roomId}` : 'trashedMemos';
            const trashedMemos = await AsyncStorage.getItem(trashedMemosKey);
            if (trashedMemos) {
                const trashed = JSON.parse(trashedMemos);
                if (trashed.find((memo: any) => memo.id === memoId)) {
                    return 'deleted';
                }
            }

            return 'permanentlyDeleted';
        } catch (error) {
            console.error('Error checking memo status:', error);
            return 'active';
        }
    };

    const saveChatMessages = async (messages: ChatMessage[]) => {
        try {
            const storageKey = roomId ? `chatMessages_${roomId}` : 'chatMessages';
            await AsyncStorage.setItem(storageKey, JSON.stringify(messages));
        } catch (error) {
            console.error('Error saving chat messages:', error);
        }
    };

    const addMessage = (message: ChatMessage) => {
        console.log('useChat addMessage: Adding message', message);
        console.log('useChat addMessage: Current messages count:', chatMessages.length);
        
        setChatMessages(prevMessages => {
            const updatedMessages = [...prevMessages, message];
            console.log('useChat addMessage: Updated messages count:', updatedMessages.length);
            
            // 비동기 작업들을 별도로 처리
            saveChatMessages(updatedMessages);
            
            if (roomId && onMetadataUpdate) {
                onMetadataUpdate(roomId);
            }
            
            return updatedMessages;
        });
        
        // 현재 상태 + 새 메시지를 반환 (동기적)
        return [...chatMessages, message];
    };

    const updateMemoStatus = useCallback(async () => {
        if (chatMessages.length > 0) {
            const updatedMessages = await Promise.all(
                chatMessages.map(async (msg) => ({
                    ...msg,
                    memoStatus: msg.type === 'record' ? await getMemoStatus(msg.id) : msg.memoStatus,
                }))
            );
            setChatMessages(updatedMessages);
        }
    }, [chatMessages.length]);

    useEffect(() => {
        console.log('useChat: roomId changed to:', roomId);
        loadChatMessages();
    }, [roomId]);

    useEffect(() => {
        groupMessagesByDate();
    }, [groupMessagesByDate]);



    return {
        chatMessages,
        chatListData,
        setChatMessages,
        addMessage,
        saveChatMessages,
    };
};