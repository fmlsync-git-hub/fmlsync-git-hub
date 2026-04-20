
import React, { useState, useEffect } from 'react';
import { Passenger } from '../types';
import { XMarkIcon } from './icons';
import { functions, httpsCallable } from '../services/firebase'; // Import Firebase functions

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; }> = ({ isOpen, onClose, title, children }) => {
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-border-default p-4">
                    <h3 className="text-xl font-semibold text-text-primary">{title}</h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-danger p-1 rounded-full transition-colors">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};

const Button: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string; type?: 'button'|'submit'|'reset', disabled?: boolean; variant?: 'primary' | 'secondary' }> = ({ children, onClick, className, type = 'button', disabled = false, variant = 'primary' }) => {
    const baseClasses = `px-4 py-2 rounded-md font-semibold shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2`;
    const variantClasses = {
        primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
        secondary: 'bg-surface-soft text-text-primary hover:bg-border-default focus:ring-primary',
    };
    const disabledClasses = disabled ? 'bg-neutral-600 text-neutral-400 cursor-not-allowed' : '';
    return <button type={type} onClick={onClick} disabled={disabled} className={`${baseClasses} ${variantClasses[variant || 'primary']} ${className}`}>{children}</button>;
};


interface SendMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    passenger: Passenger | null;
}

export const SendMessageModal: React.FC<SendMessageModalProps> = ({ isOpen, onClose, passenger }) => {
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) {
            // Reset state a bit later to avoid UI flickering during close animation
            setTimeout(() => {
                setMessage('');
                setStatus('idle');
                setError('');
            }, 300);
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!passenger?.contactData?.phone || !message.trim()) {
            setError('Passenger phone number is missing or message is empty.');
            setStatus('error');
            return;
        }

        setStatus('sending');
        setError('');
        
        try {
            // Get a reference to the Firebase Cloud Function
            const sendMessage = httpsCallable(functions, 'sendMessage');

            // Call the function with the required parameters
            const result = await sendMessage({
                to: [passenger.contactData.phone], // Cloud function expects an array
                body: message,
            });

            if ((result.data as any).success) {
                setStatus('success');
                setTimeout(() => {
                    onClose();
                }, 2000); // Close modal after 2 seconds on success
            } else {
                throw new Error((result.data as any).error || 'The cloud function reported an error.');
            }

        } catch (err) {
            console.error("Error calling 'sendMessage' cloud function:", err);
            // Provide a user-friendly error message
            let errorMessage = 'Failed to send message.';
            if (err instanceof Error) {
                if (err.message.includes('permission-denied')) {
                    errorMessage = 'You do not have permission to perform this action.';
                } else if (err.message.includes('not-configured')) {
                    errorMessage = 'The notification service is not configured on the server. Please contact an administrator.';
                } else {
                    errorMessage = err.message;
                }
            }
            setError(errorMessage);
            setStatus('error');
        }
    };

    if (!passenger) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Send Custom Message">
            <div className="p-6 space-y-4">
                <div className="bg-surface-soft p-3 rounded-md">
                    <p className="text-sm font-medium text-text-secondary">To:</p>
                    <p className="font-semibold text-text-primary">{(passenger.passports || []).length > 0 ? `${passenger.passports[0].firstNames} ${passenger.passports[0].surname}` : 'No Passport'}</p>
                    <p className="text-sm text-text-secondary">{passenger.contactData.phone || 'No phone number on record'}</p>
                </div>

                <div>
                    <label htmlFor="custom-message" className="block text-sm font-medium text-text-secondary mb-1">Message</label>
                    <textarea
                        id="custom-message"
                        rows={5}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message here..."
                        className="w-full px-3 py-2 border border-border-default bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                        disabled={status === 'sending' || status === 'success'}
                    />
                </div>
                
                {status === 'error' && <p className="text-danger bg-danger/10 p-2 rounded-md text-sm text-center">{error}</p>}
                {status === 'success' && <p className="text-success bg-success/10 p-2 rounded-md text-sm text-center">Message sent successfully!</p>}
            </div>
            <div className="flex justify-end gap-3 bg-surface-soft p-4 border-t border-border-default">
                <Button onClick={onClose} variant="secondary" disabled={status === 'sending'}>Cancel</Button>
                <Button onClick={handleSend} disabled={!passenger.contactData.phone || !message.trim() || status === 'sending' || status === 'success'}>
                    {status === 'sending' && 'Sending...'}
                    {status === 'idle' && 'Send Message'}
                    {status === 'error' && 'Retry'}
                    {status === 'success' && 'Sent!'}
                </Button>
            </div>
        </Modal>
    );
};
