import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { XMarkIcon, SparklesIcon, UserIcon } from './icons';
import { Passenger } from '../types';
import { getAllPassengers } from '../services/firebase';
import { useCompanies } from '../context/CompanyContext';
// FIX: Changed to a named import to match the export.
import { useFormatters } from '../hooks/useFormatters';

interface AssistantChatProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectPassenger: (passenger: Passenger) => void;
}

type Message = {
    role: 'user' | 'model';
    text: string;
    data?: any;
    isLoading?: boolean;
};

// --- Function Declarations for Gemini ---
const findExpiringDocuments: FunctionDeclaration = {
    name: 'findExpiringDocuments',
    description: "Finds passengers whose documents (passport, visa, or permit) are expiring within a specified number of days.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            companyName: { type: Type.STRING, description: "The name of the company to filter by (e.g., 'SPIE', 'MODEC')." },
            passengerCategory: { type: Type.STRING, description: "The category of the passenger, either 'Local' or 'Expatriate'." },
            days: { type: Type.INTEGER, description: "The number of days from now within which the document expires. Defaults to 90 if not specified." },
            documentType: { type: Type.STRING, description: "The type of document to check: 'Passport', 'Visa', or 'Permit'." }
        },
        required: ["documentType"]
    }
};

const findPassengerByName: FunctionDeclaration = {
    name: 'findPassengerByName',
    description: "Finds a passenger by their first name, surname, or full name.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "The name of the passenger to search for." },
        },
        required: ["name"]
    }
};

const AssistantChat: React.FC<AssistantChatProps> = ({ isOpen, onClose, onSelectPassenger }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const aiRef = useRef<GoogleGenAI | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { companies } = useCompanies();
    const { formatDate } = useFormatters();

    // Memoize passengers to avoid re-fetching on every render
    const [allPassengers, setAllPassengers] = useState<Passenger[]>([]);
    useEffect(() => {
        if(isOpen) {
            getAllPassengers().then(setAllPassengers);
        }
    }, [isOpen]);

    useEffect(() => {
        if (process.env.API_KEY) {
            aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
        }
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // --- Function Implementations ---
    const executeFindExpiringDocuments = useCallback((args: any) => {
        const { companyName, passengerCategory, days = 90, documentType } = args;
        
        const companyId = companyName ? companies.find(c => c.name.toLowerCase() === companyName.toLowerCase())?.id : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thresholdDate = new Date(today);
        thresholdDate.setDate(today.getDate() + days);

        const results: { passenger: Passenger, doc: any, daysLeft: number }[] = [];

        allPassengers.forEach(p => {
            if (companyId && p.companyId !== companyId) return;
            if (passengerCategory && p.category !== passengerCategory) return;

            const checkDoc = (dateStr: string, doc: any) => {
                if (!dateStr) return;
                const dateParts = dateStr.split('-').map(Number);
                if (dateParts.length !== 3 || dateParts.some(isNaN)) return;
                const expiryDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);

                if (expiryDate >= today && expiryDate <= thresholdDate) {
                    const diffTime = expiryDate.getTime() - today.getTime();
                    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    results.push({ passenger: p, doc, daysLeft });
                }
            };

            if (documentType.toLowerCase() === 'passport') {
                const passport = p.passports && p.passports[0];
                if (passport) checkDoc(passport.dateOfExpiry, { type: 'Passport' });
            } else if (documentType.toLowerCase() === 'visa') {
                p.visas.forEach(v => checkDoc(v.dateOfExpiry, { type: 'Visa', ...v }));
            } else if (documentType.toLowerCase() === 'permit') {
                p.permits.forEach(pm => checkDoc(pm.dateOfExpiry, { type: 'Permit', ...pm }));
            }
        });
        
        return results.sort((a,b) => a.daysLeft - b.daysLeft);

    }, [allPassengers, companies]);

    const executeFindPassengerByName = useCallback((args: any) => {
        const { name } = args;
        const lowerCaseName = name.toLowerCase();
        return allPassengers.filter(p => 
            (p.passports && p.passports[0] ? `${p.passports[0].firstNames} ${p.passports[0].surname}` : '').toLowerCase().includes(lowerCaseName)
        );
    }, [allPassengers]);


    const handleSendMessage = async () => {
        if (!input.trim() || !aiRef.current) return;

        const userMessage: Message = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage, { role: 'model', text: '', isLoading: true }]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await aiRef.current.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [{ text: input }] },
                config: {
                    systemInstruction: `You are an assistant for a travel and ticketing management app. Your goal is to help users find information about passengers and their documents. Use the available tools to answer questions. Be concise and helpful. Today's date is ${new Date().toDateString()}.`,
                    tools: [{ functionDeclarations: [findExpiringDocuments, findPassengerByName] }],
                },
            });
            
            const functionCalls = response.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
                const call = functionCalls[0];
                let functionResult;

                if (call.name === 'findExpiringDocuments') {
                    functionResult = executeFindExpiringDocuments(call.args);
                } else if (call.name === 'findPassengerByName') {
                    functionResult = executeFindPassengerByName(call.args);
                }

                const response2 = await aiRef.current.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: {
                        parts: [
                            { text: input },
                            { functionCall: call },
                            { functionResponse: { name: call.name, response: { result: functionResult } } }
                        ]
                    },
                    config: {
                        tools: [{ functionDeclarations: [findExpiringDocuments, findPassengerByName] }],
                    },
                });

                const finalMessage: Message = { role: 'model', text: response2.text, data: functionResult };
                setMessages(prev => [...prev.slice(0, -1), finalMessage]);
            } else {
                const textMessage: Message = { role: 'model', text: response.text };
                setMessages(prev => [...prev.slice(0, -1), textMessage]);
            }

        } catch (err) {
            console.error("Gemini API error:", err);
            const errorMessage: Message = { role: 'model', text: "Sorry, I encountered an error. Please try again." };
            setMessages(prev => [...prev.slice(0, -1), errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose}>
            <div
                className="fixed bottom-0 right-0 top-0 sm:top-auto sm:bottom-6 sm:right-6 bg-surface rounded-none sm:rounded-lg shadow-2xl w-full sm:w-[400px] h-full sm:h-[600px] flex flex-col border border-border-default overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-border-default bg-surface-soft">
                    <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                        <SparklesIcon className="h-6 w-6 text-primary" />
                        Smart Assistant
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full text-text-secondary hover:text-danger transition-colors">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                
                {/* Message List */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-3 rounded-lg max-w-xs ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-surface-soft text-text-primary'}`}>
                                {msg.isLoading ? (
                                    <div className="flex items-center space-x-1.5 py-1">
                                        <div className="h-2 w-2 bg-text-secondary rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                        <div className="h-2 w-2 bg-text-secondary rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                        <div className="h-2 w-2 bg-text-secondary rounded-full animate-pulse"></div>
                                    </div>
                                ) : (
                                    <p className="text-sm break-words">{msg.text}</p>
                                )}
                                {msg.data && Array.isArray(msg.data) && msg.data.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                        {msg.data.map((item: any, itemIndex: number) => (
                                            <div key={itemIndex} className="bg-surface p-2 rounded-md border border-border-default">
                                                <p className="font-semibold">{item.passenger.passports && item.passenger.passports[0] ? `${item.passenger.passports[0].firstNames} ${item.passenger.passports[0].surname}` : 'No Passport'}</p>
                                                {item.doc && <p className="text-xs">{item.doc.type} expiring in {item.daysLeft} days ({formatDate(item.doc.dateOfExpiry || (item.passenger.passports && item.passenger.passports[0] ? item.passenger.passports[0].dateOfExpiry : ''))})</p>}
                                                <button onClick={() => { onClose(); onSelectPassenger(item.passenger); }} className="text-xs text-primary-light hover:underline mt-1">View Profile</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                
                {/* Input Area */}
                <div className="flex-shrink-0 p-4 border-t border-border-default">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !isLoading && handleSendMessage()}
                            placeholder="Ask me anything..."
                            className="flex-1 px-4 py-2 bg-background border border-border-default rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
                            disabled={isLoading}
                        />
                        <button onClick={handleSendMessage} disabled={isLoading || !input.trim()} className="p-2 bg-primary text-white rounded-full disabled:bg-neutral-500">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.949a.75.75 0 00.95.826L11.25 9.25v1.5L4.644 12.01a.75.75 0 00-.95.826l-1.414 4.949a.75.75 0 00.95.826L16.25 12l-13.145-9.711z" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssistantChat;