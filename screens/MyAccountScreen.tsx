import React, { useState } from 'react';
import { User, UserSettings, Screen } from '../types';
import { updateUserCredentialsCF, addActivityLog } from '../services/firebase';
import { EyeIcon } from '../components/icons/EyeIcon';
import { EyeOffIcon } from '../components/icons/EyeOffIcon';
import { useLayout } from '../context/LayoutContext';
import { getVisibleNavItems } from '../navigation';
import { PowerIcon, ChevronRightIcon } from '../components/icons';

// Reusable Components
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`bg-surface rounded-lg shadow-md border border-border-default ${className || ''}`}>{children}</div>
);

const Button: React.FC<{ children: React.ReactNode; onClick?: () => void; disabled?: boolean, type?: 'button' | 'submit' }> = ({ children, onClick, disabled, type = 'button' }) => (
    <button type={type} onClick={onClick} disabled={disabled} className={`px-4 py-2 text-sm font-semibold rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-primary text-white hover:bg-primary-dark focus:ring-primary disabled:bg-neutral-600`}>
        {children}
    </button>
);

const Input: React.FC<{ label: string; id: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; disabled?: boolean; required?: boolean; }> = ({ label, id, value, onChange, type = 'text', disabled = false, required = false }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1">{label}{required && ' *'}</label>
        <input
            id={id}
            type={type}
            value={value}
            onChange={onChange}
            disabled={disabled}
            required={required}
            className="w-full px-3 py-2 border border-border-default bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-surface-soft disabled:opacity-70"
        />
    </div>
);

interface MyAccountScreenProps {
    currentUser: User & UserSettings;
    onLogout: () => void;
    onNavigate?: (screen: Screen) => void;
}

const MyAccountScreen: React.FC<MyAccountScreenProps> = ({ currentUser, onLogout, onNavigate }) => {
    const [username, setUsername] = useState(currentUser.username);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const { layout } = useLayout();
    const { visibleToolsNavItems, visibleSettingsNavItems } = getVisibleNavItems(currentUser);

    const menuItems = [
        ...visibleToolsNavItems,
        ...visibleSettingsNavItems.filter(item => item.id !== 'my_account')
    ].sort((a, b) => a.label.localeCompare(b.label));
    
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        setIsSaving(true);
        try {
            await updateUserCredentialsCF(currentUser.username, username, password || undefined);
            
            if (password) {
                await addActivityLog(currentUser.username, 'updated own password.');
                setSuccess("Password updated successfully!");
            } else {
                setSuccess("No changes made to password.");
            }
            setPassword(''); // Clear password field after save
            setTimeout(() => setSuccess(null), 4000);

        } catch (err) {
            console.error("Failed to update credentials:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsSaving(false);
        }
    };

    const MobileMenu: React.FC = () => (
        <Card className="mt-8">
            <div className="p-4">
                <h3 className="text-lg font-semibold text-on-surface">Menu & Settings</h3>
            </div>
            <div className="border-t border-border-default">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate?.(item.id)}
                        className="w-full flex justify-between items-center text-left px-4 py-3 hover:bg-surface-soft transition-colors border-b border-border-default last:border-b-0"
                    >
                        <div className="flex items-center gap-3">
                            <item.icon className="h-6 w-6 text-text-secondary" />
                            <span className="font-medium text-on-surface">{item.label}</span>
                        </div>
                        <ChevronRightIcon className="h-5 w-5 text-text-secondary" />
                    </button>
                ))}
            </div>
            <div className="p-3 bg-surface-soft border-t border-border-default">
                <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md text-danger hover:bg-danger/10 transition-colors"
                >
                    <PowerIcon className="h-5 w-5" />
                    Logout
                </button>
            </div>
        </Card>
    );

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-on-background">My Account</h2>
                <p className="mt-1 text-text-secondary">Manage your login credentials.</p>
            </div>

            <Card className="max-w-lg">
                <form onSubmit={handleSave}>
                    <div className="p-6 space-y-4">
                        {error && <p className="text-danger bg-danger/10 p-3 rounded-md text-sm text-center">{error}</p>}
                        {success && <p className="text-success bg-success/10 p-3 rounded-md text-sm text-center">{success}</p>}
                        <Input
                            id="username"
                            label="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={true}
                            required
                        />
                         <p className="text-xs text-text-secondary -mt-2">Usernames cannot be changed after creation.</p>
                        
                        <div className="relative">
                            <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">New Password</label>
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
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </Card>

            {layout === 'mobile_booking' && <MobileMenu />}
        </div>
    );
};

export default MyAccountScreen;