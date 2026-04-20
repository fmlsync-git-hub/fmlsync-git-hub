
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { XMarkIcon, CommandLineIcon, ArrowPathIcon } from './icons';

interface Message {
    role: 'user' | 'model';
    text: string;
}

const DeveloperChat: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: 'System Architect Console initialized. Ready for commands.' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const aiRef = useRef<GoogleGenAI | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (process.env.API_KEY) {
            aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
        }
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    const handleSendMessage = async () => {
        if (!input.trim() || !aiRef.current) return;

        const userMessage: Message = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await aiRef.current.models.generateContent({
                model: 'gemini-2.5-flash', // Use a fast model for responsiveness
                contents: { parts: [{ text: input }] },
                config: {
                    systemInstruction: `You are the Lead Developer and System Architect of the 'FML-Ticketing-Pro' application. 
                    You built this system using React 18, TypeScript, Tailwind CSS, and Firebase (Auth, Firestore, Functions). 
                    You are currently talking to a fellow developer in a terminal-like console.
                    
                    Your persona:
                    - Highly technical, concise, and precise.
                    - You prefer code snippets over long explanations.
                    - You use technical jargon correctly (e.g., "Firestore security rules", "React hooks", "state management").
                    - You know the project structure: 'screens/' for pages, 'components/' for UI, 'services/' for logic.
                    
                    Goal: Help the developer debug, refactor, or understand the architecture.
                    If asked about the database, explain the schema (users, passengers, companies, tickets collections).
                    If asked about the UI, explain the layout system (MobileBookingLayout, etc.).
                    `,
                },
            });

            const text = response.text || "Command execution failed. No response data.";
            setMessages(prev => [...prev, { role: 'model', text }]);
        } catch (err) {
            console.error("Dev Console Error:", err);
            setMessages(prev => [...prev, { role: 'model', text: `Error: ${err instanceof Error ? err.message : 'Unknown system failure'}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 left-6 z-[9999] p-3 bg-black border border-green-500 text-green-500 rounded-full shadow-lg hover:bg-green-900/20 transition-all hover:scale-110"
                title="Open Developer Console"
            >
                <CommandLineIcon className="h-6 w-6" />
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 left-6 z-[9999] w-[90vw] max-w-lg h-[600px] bg-black/95 border border-green-500/50 rounded-lg shadow-2xl flex flex-col font-mono text-sm overflow-hidden backdrop-blur-md animate-slideUp">
            {/* Terminal Header */}
            <div className="flex justify-between items-center p-3 bg-green-900/10 border-b border-green-500/30">
                <div className="flex items-center gap-2 text-green-500">
                    <CommandLineIcon className="h-4 w-4" />
                    <span className="font-bold tracking-wider">DEV_CONSOLE_V1.0</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setMessages([{ role: 'model', text: 'Console cleared.' }])} className="text-green-700 hover:text-green-400 transition-colors" title="Clear Console">
                        <ArrowPathIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => setIsOpen(false)} className="text-green-700 hover:text-red-500 transition-colors">
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Terminal Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 text-green-400 custom-scrollbar">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`${msg.role === 'user' ? 'text-white' : 'text-green-400'}`}>
                        <span className="opacity-50 mr-2">{msg.role === 'user' ? '>' : '#'}</span>
                        <span className="whitespace-pre-wrap">{msg.text}</span>
                    </div>
                ))}
                {isLoading && (
                    <div className="text-green-600 animate-pulse">
                        <span className="mr-2">#</span> Processing command...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Line */}
            <div className="p-3 bg-black border-t border-green-500/30 flex items-center gap-2">
                <span className="text-green-500 font-bold">{'>'}</span>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                    className="flex-1 bg-transparent border-none outline-none text-white placeholder-green-800"
                    placeholder="Enter system command or query..."
                    autoFocus
                />
            </div>
        </div>
    );
};

export default DeveloperChat;
