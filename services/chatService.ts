import { ChatMessage, ChatRoom } from '../types';

export const listenToChatRooms = (username: string, callback: (rooms: ChatRoom[]) => void) => {
    callback([]);
    return () => {};
};

export const listenToMessages = (chatId: string, callback: (messages: ChatMessage[]) => void) => {
    callback([]);
    return () => {};
};

export const sendMessage = async (chatId: string, data: any) => {
    return { success: true, id: 'mock-msg-id' };
};

export const listenToUserChats = (username: string, role: string, callback: (rooms: ChatRoom[]) => void) => {
    callback([]);
    return () => {};
};

export const createDirectChat = async (currentUser: string, targetUser: string) => {
    return { success: true, id: 'mock-room-id' };
};

export const createGroupChat = async (participants: string[], name: string) => {
    return { success: true, id: 'mock-room-id' };
};

export const listenToAllChatsAdmin = (callback: (rooms: ChatRoom[]) => void) => {
    callback([]);
    return () => {};
};

export const listenForIncomingCalls = (username: string, callback: (signal: any) => void) => {
    return () => {};
};

export const initiateCall = async (caller: string, callee: string, video: boolean) => {
    return { success: true, id: 'mock-call-id' };
};

export const answerCall = async (callId: string) => {};

export const endCall = async (callId: string) => {};

export const markAsRead = async (chatId: string, username: string) => {};

export const archiveChat = async (chatId: string, username: string) => {};

export const deleteChat = async (chatId: string) => {};
