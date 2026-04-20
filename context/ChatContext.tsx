
import React, { createContext, useState, useEffect, useContext } from 'react';
import { User, UserSettings } from '../types';
import { listenForIncomingCalls } from '../services/chatService';

interface ChatContextType {
    activeCall: any | null;
    setActiveCall: (call: any) => void;
    unreadCount: number;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode, currentUser: User & UserSettings }> = ({ children, currentUser }) => {
    const [activeCall, setActiveCall] = useState<any | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    // Listen for incoming calls globally
    useEffect(() => {
        if (!currentUser) return;
        
        // Only if chat is enabled for this user
        if (currentUser.chatSettings?.enabled === false) return;

        const unsubscribe = listenForIncomingCalls(currentUser.username, (call) => {
            if (call && (!activeCall || activeCall.id !== call.id)) {
                // We have a new incoming call
                setActiveCall(call);
                // In a real app, play ringtone here
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); 
                audio.play().catch(e => console.log("Audio play failed (interaction needed)", e));
            } else if (!call && activeCall && activeCall.status === 'ringing') {
                // Call stopped ringing (missed or cancelled)
                setActiveCall(null);
            }
        });

        return () => unsubscribe();
    }, [currentUser, activeCall]);

    return (
        <ChatContext.Provider value={{ activeCall, setActiveCall, unreadCount }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = (): ChatContextType => {
    const context = useContext(ChatContext);
    if (!context) throw new Error('useChat must be used within ChatProvider');
    return context;
};
