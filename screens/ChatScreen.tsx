
import React, { useState, useEffect, useRef } from 'react';
import { User, UserSettings, ChatRoom, ChatMessage, UploadedFile } from '../types';
import { useChat } from '../context/ChatContext';
import { listenToUserChats, listenToMessages, sendMessage, createDirectChat, createGroupChat, listenToAllChatsAdmin, endCall, initiateCall, answerCall } from '../services/chatService';
import { getUsers, updateUserSettings } from '../services/firebase';
import { ChatBubbleLeftEllipsisIcon, PhoneIcon, VideoCameraIcon, PaperClipIcon, FaceSmileIcon, MicrophoneIcon, MagnifyingGlassIcon, XMarkIcon, ChevronDownIcon, DocumentTextIcon, PhotoIcon, CheckCircleIcon, EllipsisVerticalIcon, TrashIcon, UserGroupIcon, LockClosedIcon } from '../components/icons';
import { FileUploader } from '../components/FileUploader';
import { ImageEditorModal } from '../components/ImageEditorModal';
import { useFormatters } from '../hooks/useFormatters';
import { extractPassportData, extractGhanaCardData } from '../services/geminiService'; // OCR Hooks

// --- Sub-components ---

const ChatSidebar: React.FC<{ 
    chats: ChatRoom[], 
    activeChatId: string | null, 
    onSelectChat: (id: string) => void,
    onNewChat: () => void,
    currentUser: User
}> = ({ chats, activeChatId, onSelectChat, onNewChat, currentUser }) => {
    const { formatTimestamp } = useFormatters();
    
    const getChatName = (chat: ChatRoom) => {
        if (chat.type === 'group') return chat.name;
        // Direct chat: find the other person
        const other = chat.participants.find(p => p !== currentUser.username);
        return other || 'Unknown User';
    };

    return (
        <div className="w-full md:w-80 border-r border-border-default flex flex-col bg-surface-soft h-full">
            <div className="p-4 border-b border-border-default flex justify-between items-center bg-surface">
                <h2 className="font-bold text-lg text-text-primary">Messages</h2>
                <button onClick={onNewChat} className="p-2 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors">
                    <ChatBubbleLeftEllipsisIcon className="h-5 w-5" />
                </button>
            </div>
            <div className="p-2">
                <div className="relative">
                    <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-3 text-text-secondary" />
                    <input type="text" placeholder="Search chats..." className="w-full pl-9 pr-4 py-2 bg-background border border-border-default rounded-lg text-sm focus:outline-none focus:border-primary" />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                {chats.map(chat => (
                    <div 
                        key={chat.id} 
                        onClick={() => onSelectChat(chat.id)}
                        className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-surface transition-colors border-b border-border-default/50 ${activeChatId === chat.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                    >
                        <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold shrink-0">
                            {getChatName(chat).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline">
                                <span className="font-semibold text-text-primary truncate">{getChatName(chat)}</span>
                                <span className="text-xs text-text-secondary">{formatTimestamp(chat.lastMessageTimestamp)}</span>
                            </div>
                            <p className="text-xs text-text-secondary truncate">{chat.lastSender === currentUser.username ? 'You: ' : ''}{chat.lastMessage}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MessageBubble: React.FC<{ message: ChatMessage, isOwn: boolean, onOcr?: (file: string, type: string) => void }> = ({ message, isOwn, onOcr }) => {
    const { formatTime } = useFormatters();
    
    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
            <div className={`max-w-[75%] rounded-lg p-3 relative ${isOwn ? 'bg-primary text-white rounded-br-none' : 'bg-surface border border-border-default text-text-primary rounded-bl-none'}`}>
                {/* Media Rendering */}
                {message.type === 'image' && message.fileUrl && (
                    <div className="mb-2 group relative">
                        <img src={message.fileUrl} alt="attachment" className="rounded-md max-h-60 object-cover cursor-pointer" />
                        {onOcr && (
                            <button onClick={() => onOcr(message.fileUrl!, 'image')} className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                Scan OCR
                            </button>
                        )}
                    </div>
                )}
                {message.type === 'document' && (
                    <div className="flex items-center gap-2 bg-black/10 p-2 rounded mb-2">
                        <DocumentTextIcon className="h-6 w-6" />
                        <span className="text-xs underline break-all">{message.fileName || 'Document'}</span>
                    </div>
                )}
                
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <div className={`text-[10px] text-right mt-1 opacity-70 ${isOwn ? 'text-white' : 'text-text-secondary'}`}>
                    {formatTime(message.timestamp)}
                    {isOwn && <span className="ml-1">✓</span>}
                </div>
            </div>
        </div>
    );
};

const ChatInput: React.FC<{ onSend: (content: string, file?: UploadedFile, type?: 'image'|'document') => void }> = ({ onSend }) => {
    const [text, setText] = useState('');
    const [attachment, setAttachment] = useState<UploadedFile | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSend = () => {
        if (!text.trim() && !attachment) return;
        const type = attachment ? (attachment.mimeType.startsWith('image') ? 'image' : 'document') : 'text';
        onSend(text, attachment || undefined, type);
        setText('');
        setAttachment(null);
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                setAttachment({
                    fileName: file.name,
                    mimeType: file.type,
                    size: file.size,
                    dataUrl: reader.result as string
                });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="p-3 bg-surface border-t border-border-default flex items-end gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-text-secondary hover:text-primary transition-colors">
                <PaperClipIcon className="h-6 w-6" />
            </button>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFile} />
            
            <div className="flex-1 bg-background border border-border-default rounded-lg px-3 py-2 flex flex-col">
                {attachment && (
                    <div className="flex justify-between items-center bg-surface-soft p-2 rounded mb-2 text-xs">
                        <span className="truncate max-w-[200px]">{attachment.fileName}</span>
                        <button onClick={() => setAttachment(null)}><XMarkIcon className="h-4 w-4" /></button>
                    </div>
                )}
                <textarea 
                    value={text} 
                    onChange={e => setText(e.target.value)} 
                    placeholder="Type a message" 
                    className="bg-transparent outline-none w-full resize-none max-h-24 text-sm"
                    rows={1}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                />
            </div>
            <button onClick={handleSend} className="p-3 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
            </button>
        </div>
    );
};

const CallOverlay: React.FC<{ activeCall: any, onEnd: () => void, onAnswer: () => void }> = ({ activeCall, onEnd, onAnswer }) => {
    if (!activeCall) return null;
    const isIncoming = activeCall.status === 'ringing';

    return (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-white p-8">
            <div className="h-32 w-32 rounded-full bg-gray-700 flex items-center justify-center mb-6 animate-pulse">
                <UserGroupIcon className="h-16 w-16" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{isIncoming ? 'Incoming Call...' : 'Connected'}</h2>
            <p className="text-lg opacity-80 mb-12">{isIncoming ? activeCall.caller : 'In Call'}</p>
            
            <div className="flex gap-12">
                {isIncoming && (
                    <button onClick={onAnswer} className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center hover:scale-110 transition-transform">
                        <PhoneIcon className="h-8 w-8" />
                    </button>
                )}
                <button onClick={onEnd} className="h-16 w-16 rounded-full bg-red-600 flex items-center justify-center hover:scale-110 transition-transform">
                    <PhoneIcon className="h-8 w-8 rotate-[135deg]" />
                </button>
            </div>
        </div>
    );
}

const ChatScreen: React.FC<{ currentUser: User & UserSettings }> = ({ currentUser }) => {
    const { activeCall, setActiveCall } = useChat();
    const [chats, setChats] = useState<ChatRoom[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isDevMode, setIsDevMode] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const activeChat = chats.find(c => c.id === activeChatId);

    // 1. Listen to Chats
    useEffect(() => {
        let unsubscribe: () => void;
        if (currentUser.role === 'developer' && isDevMode) {
            unsubscribe = listenToAllChatsAdmin(setChats);
        } else {
            unsubscribe = listenToUserChats(currentUser.username, currentUser.role, setChats);
        }
        return () => unsubscribe();
    }, [currentUser, isDevMode]);

    // 2. Listen to Messages for Active Chat
    useEffect(() => {
        if (!activeChatId) return;
        const unsubscribe = listenToMessages(activeChatId, setMessages);
        return () => unsubscribe();
    }, [activeChatId]);

    // 3. Auto Scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 4. Fetch Users for New Chat
    useEffect(() => {
        if(isNewChatModalOpen) {
            getUsers().then(setUsers);
        }
    }, [isNewChatModalOpen]);

    const handleSendMessage = (content: string, file?: UploadedFile, type: 'text'|'image'|'document' = 'text') => {
        if (activeChatId) {
            sendMessage(activeChatId, {
                sender: currentUser.username,
                content,
                type,
                fileUrl: file?.dataUrl,
                fileName: file?.fileName
            });
        }
    };

    const handleStartChat = async (targetUser: string) => {
        const id = await createDirectChat(currentUser.username, targetUser);
        setActiveChatId(id);
        setIsNewChatModalOpen(false);
    };

    const handleMakeCall = async (video: boolean) => {
        if (!activeChat) return;
        const otherUser = activeChat.participants.find(p => p !== currentUser.username);
        if (otherUser) {
            await initiateCall(currentUser.username, otherUser, video);
            setActiveCall({ status: 'calling', caller: currentUser.username, callee: otherUser });
        }
    };

    const handleOcr = async (fileUrl: string) => {
        // Mock OCR trigger - in real app, open NewPassengerScreen with pre-filled data
        alert(`OCR Scan initiated for image. Data extracted via Gemini.`);
    };

    if (currentUser.chatSettings?.enabled === false) {
        return (
            <div className="h-full flex items-center justify-center flex-col text-text-secondary">
                <LockClosedIcon className="h-16 w-16 mb-4 opacity-50" />
                <h2 className="text-xl font-bold">Messaging Disabled</h2>
                <p>Please contact an administrator to enable this feature.</p>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-background relative overflow-hidden">
            {activeCall && (
                <CallOverlay 
                    activeCall={activeCall} 
                    onAnswer={() => answerCall(activeCall.id)} 
                    onEnd={() => { endCall(activeCall.id); setActiveCall(null); }} 
                />
            )}

            {/* Sidebar */}
            <div className={`${activeChatId ? 'hidden md:flex' : 'flex w-full'} md:w-80 h-full`}>
                <ChatSidebar 
                    chats={chats} 
                    activeChatId={activeChatId} 
                    onSelectChat={setActiveChatId} 
                    onNewChat={() => setIsNewChatModalOpen(true)}
                    currentUser={currentUser}
                />
            </div>

            {/* Main Chat Area */}
            {activeChatId ? (
                <div className="flex-1 flex flex-col h-full bg-[#efeae2] dark:bg-[#0b141a]">
                    {/* Chat Header */}
                    <div className="h-16 bg-surface border-b border-border-default flex items-center justify-between px-4 shrink-0">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setActiveChatId(null)} className="md:hidden p-1 -ml-1 text-text-secondary"><ChevronDownIcon className="h-6 w-6 rotate-90" /></button>
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center font-bold text-gray-700">
                                {activeChat?.participants.find(p => p !== currentUser.username)?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-bold text-text-primary">{activeChat?.type === 'group' ? activeChat.name : activeChat?.participants.find(p => p !== currentUser.username)}</h3>
                                <p className="text-xs text-text-secondary">Online</p>
                            </div>
                        </div>
                        <div className="flex gap-2 text-primary">
                            <button onClick={() => handleMakeCall(false)} className="p-2 hover:bg-surface-soft rounded-full"><PhoneIcon className="h-5 w-5" /></button>
                            <button onClick={() => handleMakeCall(true)} className="p-2 hover:bg-surface-soft rounded-full"><VideoCameraIcon className="h-5 w-5" /></button>
                            <button className="p-2 hover:bg-surface-soft rounded-full"><EllipsisVerticalIcon className="h-5 w-5" /></button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-chat-pattern">
                        {messages.map(msg => (
                            <MessageBubble 
                                key={msg.id} 
                                message={msg} 
                                isOwn={msg.sender === currentUser.username} 
                                onOcr={handleOcr}
                            />
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <ChatInput onSend={handleSendMessage} />
                </div>
            ) : (
                <div className="hidden md:flex flex-1 items-center justify-center flex-col bg-surface-soft text-text-secondary border-l border-border-default">
                    <div className="h-32 w-32 bg-surface rounded-full flex items-center justify-center mb-6 shadow-sm">
                        <ChatBubbleLeftEllipsisIcon className="h-16 w-16 text-primary/50" />
                    </div>
                    <h2 className="text-2xl font-bold text-text-primary">FML Connect</h2>
                    <p className="mt-2">Select a chat to start messaging.</p>
                    {currentUser.role === 'developer' && (
                        <div className="mt-8">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={isDevMode} onChange={e => setIsDevMode(e.target.checked)} className="toggle" />
                                <span className="text-sm font-bold text-danger">Enable Developer Audit Mode</span>
                            </label>
                        </div>
                    )}
                </div>
            )}

            {/* New Chat Modal */}
            {isNewChatModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-surface rounded-lg w-full max-w-md h-[500px] flex flex-col shadow-xl">
                        <div className="p-4 border-b border-border-default flex justify-between items-center">
                            <h3 className="font-bold text-lg">New Message</h3>
                            <button onClick={() => setIsNewChatModalOpen(false)}><XMarkIcon className="h-6 w-6 text-text-secondary" /></button>
                        </div>
                        <div className="p-2 border-b border-border-default">
                            <input type="text" placeholder="Search users..." className="w-full p-2 bg-transparent outline-none" />
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {users.filter(u => u.username !== currentUser.username).map(user => (
                                <div key={user.username} onClick={() => handleStartChat(user.username)} className="p-3 hover:bg-surface-soft cursor-pointer rounded-lg flex items-center gap-3">
                                    <div className="h-10 w-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold">{user.username.charAt(0).toUpperCase()}</div>
                                    <div>
                                        <p className="font-semibold text-text-primary">{user.username}</p>
                                        <p className="text-xs text-text-secondary capitalize">{user.role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatScreen;
