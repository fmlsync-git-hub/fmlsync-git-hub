import React, { useState, useEffect } from 'react';
import { User, UserSettings, Screen, UserRole } from '../types';
import { XMarkIcon } from './icons';

// --- Reusable Components ---
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-border-default p-4">
                    <h3 className="text-xl font-semibold text-text-primary">{title}</h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-danger p-1 rounded-full transition-colors"><XMarkIcon className="h-6 w-6" /></button>
                </div>
                {children}
            </div>
        </div>
    );
};

const Button: React.FC<{ children: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit'; className?: string; variant?: 'primary' | 'secondary' }> = ({ children, onClick, disabled, type = 'button', className, variant = 'primary' }) => {
    const baseClasses = `px-4 py-2 text-sm font-semibold rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`;
    const variantClasses = {
        primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary disabled:bg-neutral-600',
        secondary: 'bg-surface-soft text-text-primary hover:bg-border-default disabled:opacity-50'
    };
    return <button type={type} onClick={onClick} disabled={disabled} className={`${baseClasses} ${variantClasses[variant || 'primary']} ${className}`}>{children}</button>;
};


// --- Edit User Settings Modal ---
const ALL_MENUS: { id: Screen, label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' }, { id: 'company_flow', label: 'Clients' },
    { id: 'travel', label: 'Travel' }, { id: 'documents', label: 'Documents' },
    { id: 'notifications', label: 'Notifications' }, { id: 'technical', label: 'Technical' },
    { id: 'settings', label: 'Company Settings' }, { id: 'appearance', label: 'Appearance' },
    { id: 'help', label: 'Help & FAQ' }
];

interface EditUserSettingsModalProps {
    user: (User & UserSettings);
    onClose: () => void;
    onSave: () => void;
    currentUserRole?: UserRole;
}

export const EditUserSettingsModal: React.FC<EditUserSettingsModalProps> = ({ user, onClose, onSave, currentUserRole }) => {
    const isProtectedRole = user.role === 'developer';
    const isDeveloper = currentUserRole === 'developer';
    const [isActive, setIsActive] = useState(isProtectedRole ? true : user.isActive);
    const [disabledMenus, setDisabledMenus] = useState<Screen[]>(user.disabledMenus || []);
    const [duplicateToggleEnabled, setDuplicateToggleEnabled] = useState(user.duplicateToggleEnabled ?? true);
    const [isSaving, setIsSaving] = useState(false);
    
    useEffect(() => {
        setIsActive(isProtectedRole ? true : user.isActive);
    }, [user, isProtectedRole]);

    const handleMenuToggle = (menuId: Screen) => {
        setDisabledMenus(prev => 
            prev.includes(menuId) ? prev.filter(m => m !== menuId) : [...prev, menuId]
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        // Mock update
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsSaving(false);
        onSave();
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Edit Settings for ${user.username}`}>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div>
                    <h4 className="font-semibold text-text-primary mb-2">Account Status</h4>
                    <label className={`flex items-center gap-3 ${isProtectedRole ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                        <div className="relative">
                            <input
                                type="checkbox"
                                className="sr-only"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                disabled={isProtectedRole}
                            />
                            <div className={`block w-12 h-6 rounded-full transition-colors ${isActive ? 'bg-primary' : 'bg-surface-soft'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isActive ? 'translate-x-6' : ''}`}></div>
                        </div>
                        <span className={`font-medium ${isActive ? 'text-success' : 'text-danger'}`}>{isActive ? 'Enabled' : 'Disabled'}</span>
                    </label>
                    {isProtectedRole && (
                        <p className="text-xs text-text-secondary mt-2">Developer accounts are always active and cannot be deactivated.</p>
                    )}
                </div>

                {isDeveloper && (
                    <div>
                        <h4 className="font-semibold text-text-primary mb-2">Feature Permissions (Developer Only)</h4>
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={duplicateToggleEnabled}
                                        onChange={(e) => setDuplicateToggleEnabled(e.target.checked)}
                                    />
                                    <div className={`block w-12 h-6 rounded-full transition-colors ${duplicateToggleEnabled ? 'bg-primary' : 'bg-surface-soft'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${duplicateToggleEnabled ? 'translate-x-6' : ''}`}></div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-text-primary">Show Duplicate Toggle</span>
                                    <span className="text-xs text-text-secondary">If enabled, this user will see the button to hide/show duplicate records.</span>
                                </div>
                            </label>
                        </div>
                    </div>
                )}

                <div>
                    <h4 className="font-semibold text-text-primary mb-2">Sidebar Menu Permissions</h4>
                    <p className="text-sm text-text-secondary mb-3">Uncheck a menu item to hide it for this user.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {ALL_MENUS.map(menu => (
                            <label key={menu.id} className="flex items-center gap-2 p-2 bg-surface-soft rounded-md cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!disabledMenus.includes(menu.id)}
                                    onChange={() => handleMenuToggle(menu.id)}
                                    className="h-4 w-4 rounded bg-surface border-border-default text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-text-primary">{menu.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-3 bg-surface-soft p-4 border-t border-border-default">
                <Button onClick={onClose} disabled={isSaving} variant="secondary">Cancel</Button>
                <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
            </div>
        </Modal>
    );
};
