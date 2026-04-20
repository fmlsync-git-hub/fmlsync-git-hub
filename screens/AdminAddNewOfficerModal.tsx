import React, { useState } from 'react';
import { createNewUserCF } from '../services/firebase';
import { UserRole } from '../types';
import { XMarkIcon, EnvelopeIcon, WhatsappIcon, ChatBubbleLeftEllipsisIcon, ClipboardDocumentIcon, CheckCircleIcon } from '../components/icons';
import { EyeIcon } from '../components/icons/EyeIcon';
import { EyeOffIcon } from '../components/icons/EyeOffIcon';
import { useCompanies } from '../context/CompanyContext';

// Reusable components from root modal
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
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
const Button: React.FC<{ children: React.ReactNode; onClick?: () => void; disabled?: boolean, type?: 'button' | 'submit', variant?: 'primary' | 'secondary' }> = ({ children, onClick, disabled, type = 'button', variant = 'primary' }) => {
    const baseClasses = `px-4 py-2 text-sm font-semibold rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`;
    const variantClasses = {
        primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary disabled:bg-neutral-600',
        secondary: 'bg-surface-soft text-text-primary hover:bg-border-default disabled:opacity-50'
    };
    return <button type={type} onClick={onClick} disabled={disabled} className={`${baseClasses} ${variantClasses[variant]}`}>{children}</button>;
};
const Input: React.FC<{ label: string; id: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; required?: boolean; }> = ({ label, id, value, onChange, type = 'text', required }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1">{label}{required && ' *'}</label>
        <input id={id} type={type} value={value} onChange={onChange} required={required} className="w-full px-3 py-2 border border-border-default bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-primary" />
    </div>
);
const Select: React.FC<{ label: string; id: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode; required?: boolean; }> = ({ label, id, value, onChange, children, required }) => (
     <div>
        <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1">{label}{required && ' *'}</label>
        <select
            id={id}
            value={value}
            onChange={onChange}
            required={required}
            className="w-full px-3 py-2 border border-border-default bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
        >
            {children}
        </select>
    </div>
);

const ShareCredentialsView: React.FC<{
    data: { username: string; password: string; contactInfo: { firstNames?: string; email?: string; phone?: string; } };
    onDone: () => void;
}> = ({ data, onDone }) => {
    const { username, password, contactInfo } = data;
    const { firstNames, email, phone } = contactInfo;
    const [copied, setCopied] = useState(false);

    const message = `Hello ${firstNames || 'User'},\n\nYour account for the FML Ticketing App has been created.\n\nYou can log in using the following credentials:\nUsername: ${username}\nPassword: ${password}\n\nThank you.`;

    const handleCopy = () => {
        navigator.clipboard.writeText(message);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    const cleanPhoneNumber = (num: string) => num.replace(/[^0-9]/g, '');

    const shareActions = [
        { name: 'Email', icon: EnvelopeIcon, href: `mailto:${email}?subject=Your FML Ticketing App Credentials&body=${encodeURIComponent(message)}`, enabled: !!email },
        { name: 'WhatsApp', icon: WhatsappIcon, href: `https://wa.me/${cleanPhoneNumber(phone || '')}?text=${encodeURIComponent(message)}`, enabled: !!phone },
        { name: 'SMS', icon: ChatBubbleLeftEllipsisIcon, href: `sms:${cleanPhoneNumber(phone || '')}?&body=${encodeURIComponent(message)}`, enabled: !!phone }
    ];

    return (
        <>
            <div className="p-6 space-y-4">
                <div className="bg-surface-soft p-3 rounded-md space-y-2">
                    <p className="text-sm"><span className="font-medium text-text-secondary">Username:</span> <strong className="text-text-primary">{username}</strong></p>
                    <p className="text-sm"><span className="font-medium text-text-secondary">Password:</span> <strong className="text-text-primary">{password}</strong></p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Generated Message</label>
                    <textarea value={message} readOnly rows={6} className="w-full text-sm p-2 border border-border-default bg-background rounded-md text-text-primary focus:ring-1 focus:ring-primary focus:outline-none" />
                </div>
                
                <div className="flex flex-wrap gap-2 justify-center">
                    <Button onClick={handleCopy} variant="secondary" className="flex items-center gap-2">
                        {copied ? <CheckCircleIcon className="h-5 w-5 text-success" /> : <ClipboardDocumentIcon className="h-5 w-5" />}
                        {copied ? 'Copied!' : 'Copy Message'}
                    </Button>
                    {shareActions.filter(a => a.enabled).map(action => (
                         <a key={action.name} href={action.href} target="_blank" rel="noopener noreferrer" className="px-4 py-2 text-sm font-semibold rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-surface-soft text-text-primary hover:bg-border-default flex items-center gap-2">
                            <action.icon className="h-5 w-5" />
                            {action.name}
                        </a>
                    ))}
                </div>
            </div>
            <div className="flex justify-end gap-3 bg-surface-soft p-4 border-t border-border-default">
                <Button onClick={onDone}>Done</Button>
            </div>
        </>
    );
};

interface AdminAddNewUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export const AdminAddNewUserModal: React.FC<AdminAddNewUserModalProps> = ({ isOpen, onClose, onSave }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState<UserRole>('officer');
    const [companyId, setCompanyId] = useState('');
    const [firstNames, setFirstNames] = useState('');
    const [surname, setSurname] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [creationSuccessData, setCreationSuccessData] = useState<{ username: string; password: string; contactInfo: any } | null>(null);

    const { companies } = useCompanies();

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!username.trim() || !password.trim() || !email.trim()) {
            setError("Username, Email, and Password cannot be empty.");
            return;
        }

        if (role === 'client' && !companyId) {
            setError("You must assign a company to a client user.");
            return;
        }

        setIsSaving(true);
        try {
            const contactInfo = { firstNames, surname, phone };
            await createNewUserCF(username, password, role, email, contactInfo, companyId);
            setCreationSuccessData({ username, password, contactInfo: { firstNames, surname, email, phone } });
        } catch (err) {
            console.error("Failed to create user:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsSaving(false);
        }
    };
    
    React.useEffect(() => {
        if (!isOpen) {
            setUsername('');
            setPassword('');
            setRole('officer');
            setCompanyId('');
            setFirstNames('');
            setSurname('');
            setEmail('');
            setPhone('');
            setError(null);
            setIsSaving(false);
            setCreationSuccessData(null);
        }
    }, [isOpen]);

    const handleDone = () => {
        onClose();
        onSave();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleDone} title={creationSuccessData ? "User Created Successfully" : "Add New User"}>
             {creationSuccessData ? (
                <ShareCredentialsView data={creationSuccessData} onDone={handleDone} />
            ) : (
                <form onSubmit={handleSave}>
                    <div className="p-6 space-y-4">
                        {error && <p className="text-danger bg-danger/10 p-3 rounded-md text-sm text-center">{error}</p>}
                        <Input id="new-username" label="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                        <div className="relative">
                            <label htmlFor="new-password" className="block text-sm font-medium text-text-secondary mb-1">Password *</label>
                            <input
                                id="new-password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
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
                        <Select id="new-role" label="Role" value={role} onChange={(e) => setRole(e.target.value as UserRole)} required >
                            <option value="officer">Officer</option>
                            <option value="admin">Admin</option>
                            <option value="client">Client</option>
                        </Select>

                        {role === 'client' && (
                            <Select id="new-companyId" label="Assign to Company" value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
                                <option value="" disabled>Select a company</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </Select>
                        )}
                        
                        <hr className="border-border-default" />
                        <h4 className="text-sm font-semibold text-text-primary -mb-2">Contact Information (Optional)</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input id="new-firstNames" label="First Name(s)" value={firstNames} onChange={(e) => setFirstNames(e.target.value)} />
                            <Input id="new-surname" label="Surname" value={surname} onChange={(e) => setSurname(e.target.value)} />
                            <Input id="new-email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                            <Input id="new-phone" label="Phone Number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </div>
                        <p className="text-xs text-text-secondary pt-2">The new user will be created and enabled by default. A developer can disable them if needed.</p>
                    </div>
                    <div className="flex justify-end gap-3 bg-surface-soft p-4 border-t border-border-default">
                        <Button type="button" onClick={onClose} disabled={isSaving} variant="secondary">Cancel</Button>
                        <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Create User'}</Button>
                    </div>
                </form>
            )}
        </Modal>
    );
};
