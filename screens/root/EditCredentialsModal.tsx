
import React, { useState } from 'react';
import { User } from '../../types';
import { XMarkIcon } from '../../components/icons';
import { EyeIcon } from '../../components/icons/EyeIcon';
import { EyeOffIcon } from '../../components/icons/EyeOffIcon';

// --- Reusable Components for this modal ---
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-border-default p-4">
                    <h3 className="text-xl font-semibold text-text-primary">{title}</h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-danger p-1 rounded-full transition-colors"><XMarkIcon className="h-6 w-6" /></button>
                </div>
                {children}
            </div>
        </div>
    );
};

const Button: React.FC<{ children: React.ReactNode; onClick?: () => void; disabled?: boolean, type?: 'button' | 'submit', className?: string }> = ({ children, onClick, disabled, type = 'button', className }) => (
    <button type={type} onClick={onClick} disabled={disabled} className={`px-4 py-2 text-sm font-semibold rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-primary text-white hover:bg-primary-dark focus:ring-primary disabled:bg-neutral-600 ${className}`}>
        {children}
    </button>
);

const Input: React.FC<{ label: string; id: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; disabled?: boolean; }> = ({ label, id, value, onChange, type = 'text', disabled = false }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
        <input
            id={id}
            type={type}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className="w-full px-3 py-2 border border-border-default bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-surface-soft disabled:opacity-70"
        />
    </div>
);


// --- Main Modal Component ---

interface EditCredentialsModalProps {
    user: User;
    onClose: () => void;
    onSave: () => void;
}

export const EditCredentialsModal: React.FC<EditCredentialsModalProps> = ({ user, onClose, onSave }) => {
    const [username, setUsername] = useState(user.username);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!username.trim()) {
            setError("Username cannot be empty.");
            return;
        }

        setIsSaving(true);
        try {
            // Mock credential update
            await new Promise(resolve => setTimeout(resolve, 1000));
            onSave();
            onClose();
        } catch (err) {
            console.error("Failed to update credentials:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Edit Credentials for ${user.username}`}>
            <form onSubmit={handleSave}>
                <div className="p-6 space-y-4">
                    {error && <p className="text-danger bg-danger/10 p-3 rounded-md text-sm text-center">{error}</p>}
                    <Input
                        id="username"
                        label="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={true}
                    />
                     <p className="text-xs text-text-secondary -mt-2">Usernames cannot be changed after creation.</p>
                    <div className="relative">
                        <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">New Password (optional)</label>
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Leave blank to keep current password"
                            className="w-full px-3 py-2 border border-border-default bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 top-7 pr-3 flex items-center text-sm leading-5"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label="Toggle password visibility"
                        >
                            {showPassword ? (
                                <EyeOffIcon className="h-5 w-5 text-text-secondary" />
                            ) : (
                                <EyeIcon className="h-5 w-5 text-text-secondary" />
                            )}
                        </button>
                    </div>
                </div>
                <div className="flex justify-end gap-3 bg-surface-soft p-4 border-t border-border-default">
                    <Button type="button" onClick={onClose} disabled={isSaving} className="bg-surface-soft text-text-primary hover:bg-border-default">Cancel</Button>
                    <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
                </div>
            </form>
        </Modal>
    );
};
