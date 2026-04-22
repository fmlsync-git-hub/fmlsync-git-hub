
import React, { useState, useEffect, useRef } from 'react';
import { useCompanies } from '../context/CompanyContext';
import { useDateTime, DateTimeSettings } from '../context/DateTimeContext';
import { Company, NotificationSettings, Passenger, TwilioSettings } from '../types';
import { listenToNotificationSettings, updateNotificationSettings, getAllPassengers, getTwilioSettings, updateTwilioSettings, factoryResetApplication } from '../services/firebase';
import { CompanyAppearanceModal } from '../components/CompanyAppearanceModal';
import { AddCompanyModal } from '../components/AddCompanyModal';
import { ChecklistManager } from '../components/ChecklistManager';
import { RecipientSelector } from '../components/RecipientSelector';
import { BellIcon, ClockIcon, QueueListIcon, CheckBadgeIcon, BuildingOfficeIcon, ChatBubbleLeftEllipsisIcon, Bars3Icon, TrashIcon } from '../components/icons/index';
import { CollapsibleCard } from '../components/CollapsibleCard';
import { ConfirmationModal } from '../components/ConfirmationModal';

type ButtonVariant = 'primary' | 'secondary' | 'danger';
const Button: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string; type?: 'button'|'submit'|'reset', disabled?: boolean; variant?: ButtonVariant }> = ({ children, onClick, className, type = 'button', disabled = false, variant = 'primary' }) => {
    const baseClasses = `px-4 py-2 rounded-md font-semibold shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2`;
    const variantClasses = {
        primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
        secondary: 'bg-surface-soft text-text-primary hover:bg-border-default focus:ring-primary',
        danger: 'bg-danger text-white hover:bg-red-700 focus:ring-danger'
    };
    const disabledClasses = disabled ? 'bg-neutral-600 text-neutral-400 cursor-not-allowed' : '';
    return <button type={type} onClick={onClick} disabled={disabled} className={`${baseClasses} ${variantClasses[variant]} ${className}`}>{children}</button>;
};

const DateTimeEditor: React.FC = () => {
    const { dateFormat, timeFormat, timezone, updateDateTimeSettings, timezones } = useDateTime();
    const [localSettings, setLocalSettings] = useState<DateTimeSettings>({ dateFormat, timeFormat, timezone });

    useEffect(() => {
        setLocalSettings({ dateFormat, timeFormat, timezone });
    }, [dateFormat, timeFormat, timezone]);

    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleSave = () => {
        setIsSaving(true);
        updateDateTimeSettings(localSettings);
        setIsSaving(false);
        setSuccessMessage('Settings saved successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    return (
        <>
            <p className="text-sm text-text-secondary -mt-4 mb-4">Configure how dates and times are displayed throughout the application.</p>
            <div className="space-y-6">
                <div>
                    <label htmlFor="date-format" className="block text-sm font-medium text-text-secondary mb-1">Date Format</label>
                    <select id="date-format" value={localSettings.dateFormat} onChange={e => setLocalSettings(p => ({...p, dateFormat: e.target.value as any}))} className="w-full px-3 py-2 border border-border-default bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-primary">
                        <option value="dd/mm/yyyy">DD/MM/YYYY (e.g., 31/12/2023)</option>
                        <option value="mm/dd/yyyy">MM/DD/YYYY (e.g., 12/31/2023)</option>
                        <option value="yyyy-mm-dd">YYYY-MM-DD (e.g., 2023-12-31)</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="time-format" className="block text-sm font-medium text-text-secondary mb-1">Time Format</label>
                    <select id="time-format" value={localSettings.timeFormat} onChange={e => setLocalSettings(p => ({...p, timeFormat: e.target.value as any}))} className="w-full px-3 py-2 border border-border-default bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-primary">
                        <option value="12-hour">12-hour (e.g., 11:59 PM)</option>
                        <option value="24-hour">24-hour (e.g., 23:59)</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="timezone" className="block text-sm font-medium text-text-secondary mb-1">Timezone</label>
                    <select id="timezone" value={localSettings.timezone} onChange={e => setLocalSettings(p => ({...p, timezone: e.target.value}))} className="w-full px-3 py-2 border border-border-default bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-primary">
                        {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                </div>
                 <div className="flex justify-end pt-4 border-t border-border-default">
                    <div className="flex items-center gap-4">
                        {successMessage && <p className="text-sm text-success">{successMessage}</p>}
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Date & Time Settings'}
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}

const TwilioSettingsEditor: React.FC = () => {
    const [settings, setSettings] = useState<TwilioSettings>({ accountSid: '', authToken: '', fromNumber: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        getTwilioSettings().then(data => {
            setSettings(data);
            setIsLoading(false);
        });
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({...prev, [name]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError('');
        setSuccessMessage('');
        try {
            await updateTwilioSettings(settings);
            setSuccessMessage('Twilio settings saved successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError('Failed to save settings. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };
    
    if (isLoading) {
        return <p className="text-text-secondary">Loading Twilio settings...</p>;
    }

    return (
        <>
            <p className="text-sm text-text-secondary -mt-4 mb-4">
                Configure your Twilio account to enable SMS and WhatsApp notifications. These credentials are stored securely and are not exposed to the frontend.
            </p>
            <div className="space-y-4">
                <div>
                    <label htmlFor="accountSid" className="block text-sm font-medium text-text-secondary mb-1">Account SID</label>
                    <input id="accountSid" name="accountSid" type="text" value={settings.accountSid} onChange={handleChange} className="w-full px-3 py-2 border border-border-default bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-primary"/>
                </div>
                <div>
                    <label htmlFor="authToken" className="block text-sm font-medium text-text-secondary mb-1">Auth Token</label>
                    <input id="authToken" name="authToken" type="password" value={settings.authToken} onChange={handleChange} className="w-full px-3 py-2 border border-border-default bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-primary"/>
                </div>
                <div>
                    <label htmlFor="fromNumber" className="block text-sm font-medium text-text-secondary mb-1">"From" Phone Number</label>
                    <input id="fromNumber" name="fromNumber" type="tel" value={settings.fromNumber} onChange={handleChange} placeholder="e.g., +1234567890" className="w-full px-3 py-2 border border-border-default bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-primary"/>
                </div>
                {error && <p className="text-sm text-danger">{error}</p>}
                <div className="flex justify-end pt-4 border-t border-border-default">
                    <div className="flex items-center gap-4">
                        {successMessage && <p className="text-sm text-success">{successMessage}</p>}
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Twilio Settings'}
                        </Button>
                    </div>
                </div>
            </div>
        </>
    )
};

const SettingsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');

  const handleFactoryReset = async () => {
    if (confirmationText !== 'FACTORY RESET') return;

    setIsResetting(true);
    try {
        await factoryResetApplication();
        setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
        console.error(err);
        alert('An unknown error occurred during reset.');
    } finally {
        setIsResetting(false);
        setIsResetModalOpen(false);
        setConfirmationText('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-text-primary">Company Settings</h2>
        <p className="mt-1 text-text-secondary">Manage global settings for the application.</p>
      </div>

        <CollapsibleCard
            title="Date & Time Formatting"
            icon={ClockIcon}
            isExpanded={activeTab === 'datetime'}
            onToggle={() => setActiveTab(prev => prev === 'datetime' ? '' : 'datetime')}
        >
            <DateTimeEditor />
        </CollapsibleCard>
        
        <CollapsibleCard
            title="Email Notifications"
            icon={BellIcon}
            isExpanded={activeTab === 'notifications'}
            onToggle={() => setActiveTab(prev => prev === 'notifications' ? '' : 'notifications')}
        >
             <NotificationSettingsEditor />
        </CollapsibleCard>
        
        <CollapsibleCard
            title="SMS & WhatsApp Alerts (Twilio)"
            icon={ChatBubbleLeftEllipsisIcon}
            isExpanded={activeTab === 'sms'}
            onToggle={() => setActiveTab(prev => prev === 'sms' ? '' : 'sms')}
        >
             <TwilioSettingsEditor />
        </CollapsibleCard>

        <CollapsibleCard
            title="Activity Checklists"
            icon={CheckBadgeIcon}
            isExpanded={activeTab === 'checklists'}
            onToggle={() => setActiveTab(prev => prev === 'checklists' ? '' : 'checklists')}
        >
            <ChecklistSettingsManager />
        </CollapsibleCard>
        
        <CollapsibleCard
            title="Company Appearance"
            icon={BuildingOfficeIcon}
            isExpanded={activeTab === 'companies'}
            onToggle={() => setActiveTab(prev => prev === 'companies' ? '' : 'companies')}
        >
            <CompanyAppearanceManager />
        </CollapsibleCard>

        {/* Danger Zone for Admins */}
        <div className="border border-danger/30 bg-danger/5 rounded-lg p-6 mt-8">
            <h3 className="text-lg font-semibold text-danger mb-2 flex items-center gap-2">
                <TrashIcon className="h-6 w-6 text-danger" />
                Danger Zone
            </h3>
            <p className="text-sm text-text-secondary mb-4">
                Perform a full system reset. This will delete all passenger data and restore all UI settings to defaults.
            </p>
            <Button onClick={() => { setConfirmationText(''); setIsResetModalOpen(true); }} variant="danger">
                Reset Application to Factory Settings
            </Button>
        </div>

        <ConfirmationModal
            isOpen={isResetModalOpen}
            onClose={() => setIsResetModalOpen(false)}
            onConfirm={handleFactoryReset}
            title="Confirm Factory Reset"
            confirmText="RESET EVERYTHING"
            isConfirming={isResetting}
            confirmVariant="danger"
        >
            <p className="text-danger font-bold mb-2">CRITICAL WARNING</p>
            <p>You are about to perform a Factory Reset. This will:</p>
            <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                <li>Delete ALL passenger records and documents.</li>
                <li>Clear all activity logs.</li>
                <li>Reset all branding, themes, and UI customizations to default.</li>
            </ul>
            <p className="mt-4">This action cannot be undone. All dashboard counters will reset to zero.</p>
            <p className="mt-4">To confirm, please type <strong className="text-danger">FACTORY RESET</strong> in the box below.</p>
            <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                className="w-full mt-2 px-3 py-2 border border-danger bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-danger"
            />
        </ConfirmationModal>
    </div>
  );
};

const NotificationSettingsEditor: React.FC = () => {
    const [settings, setSettings] = useState<NotificationSettings | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [allPassengers, setAllPassengers] = useState<Passenger[]>([]);

    useEffect(() => {
        const unsubscribe = listenToNotificationSettings((data) => {
            if (data) setSettings(data);
        });
        getAllPassengers().then(setAllPassengers);
        return () => unsubscribe();
    }, []);

    const handleTriggerChange = (trigger: keyof NotificationSettings['triggers'], field: 'enabled' | 'hoursBefore', value: boolean | number) => {
        setSettings(prev => {
            if (!prev) return null;
            return {
                ...prev,
                triggers: {
                    ...prev.triggers,
                    [trigger]: {
                        ...prev.triggers[trigger],
                        [field]: value
                    }
                }
            };
        });
    };
    
    const handleRecipientConfigChange = (field: keyof NotificationSettings['recipientConfig'], value: any) => {
        setSettings(prev => {
            if (!prev) return null;
            return {
                ...prev,
                recipientConfig: {
                    ...prev.recipientConfig,
                    [field]: value,
                }
            };
        });
    }

    const handleSave = async () => {
        if (!settings) return;
        setIsSaving(true);
        try {
            await updateNotificationSettings(settings);
            setSuccessMessage('Settings saved successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error('Failed to save settings:', error);
        } finally {
            setIsSaving(false);
        }
    };
    
    if (!settings) return <p>Loading settings...</p>;

    const hoursToDays = (hours: number) => Math.round(hours / 24);

    return (
        <div className="space-y-6">
            <div>
                <h4 className="font-semibold text-text-primary mb-2">Recipient Configuration</h4>
                <p className="text-sm text-text-secondary mb-4">Choose who should receive SMS/WhatsApp alerts. These settings apply to all enabled triggers below.</p>
                <div className="space-y-3">
                     <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded bg-surface border-border-default text-primary focus:ring-primary"
                            checked={settings.recipientConfig.notifyPersonnel}
                            onChange={e => handleRecipientConfigChange('notifyPersonnel', e.target.checked)}
                        />
                        <span className="text-sm text-text-primary">Send alerts to the personnel the notification is about (using their contact phone number).</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded bg-surface border-border-default text-primary focus:ring-primary"
                            checked={settings.recipientConfig.notifyClientUsers}
                            onChange={e => handleRecipientConfigChange('notifyClientUsers', e.target.checked)}
                        />
                        <span className="text-sm text-text-primary">Send alerts to Client users associated with the personnel's company.</span>
                    </label>
                    <RecipientSelector
                        allPassengers={allPassengers}
                        selectedRecipients={settings.recipientConfig.customPhoneNumbers}
                        onChange={(newList) => handleRecipientConfigChange('customPhoneNumbers', newList)}
                    />
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border-default">
                <h4 className="font-semibold text-text-primary">Notification Triggers</h4>
                <p className="text-sm text-text-secondary">Define when notifications should be generated. Changes here are saved automatically.</p>
                {Object.entries(settings.triggers).map(([key, triggerValue]) => {
                    const trigger = triggerValue as { enabled: boolean; hoursBefore: number; };
                    const triggerKey = key as keyof NotificationSettings['triggers'];
                    return (
                        <div key={key} className="p-4 bg-surface-soft rounded-md border border-border-default">
                            <label className="flex items-center justify-between cursor-pointer">
                                <span className="font-medium text-text-primary">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                                <div className="relative">
                                    <input type="checkbox" className="sr-only" checked={trigger.enabled} onChange={e => handleTriggerChange(triggerKey, 'enabled', e.target.checked)} />
                                    <div className={`block w-12 h-6 rounded-full transition-colors ${trigger.enabled ? 'bg-primary' : 'bg-surface'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${trigger.enabled ? 'translate-x-6' : ''}`}></div>
                                </div>
                            </label>
                            {trigger.enabled && (
                                <div className="mt-3 pt-3 border-t border-border-default/50">
                                    <label htmlFor={`${key}-hours`} className="text-sm text-text-secondary">Notify <span className="font-bold text-text-primary">{hoursToDays(trigger.hoursBefore)}</span> days before</label>
                                    <input
                                        id={`${key}-hours`}
                                        type="range"
                                        min="24"
                                        max="4320" // 180 days
                                        step="24"
                                        value={trigger.hoursBefore}
                                        onChange={e => handleTriggerChange(triggerKey, 'hoursBefore', parseInt(e.target.value))}
                                        className="w-full mt-1"
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-end pt-4 border-t border-border-default">
                <div className="flex items-center gap-4">
                    {successMessage && <p className="text-sm text-success">{successMessage}</p>}
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Notification Settings'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const ChecklistSettingsManager: React.FC = () => {
    const [isManagerOpen, setIsManagerOpen] = useState(false);
    return (
        <div>
            <p className="text-sm text-text-secondary -mt-4 mb-4">Create and manage document checklists for various travel and administrative activities. These checklists power the Compliance Report feature.</p>
            <Button onClick={() => setIsManagerOpen(true)}>Manage Checklists</Button>
            <ChecklistManager isOpen={isManagerOpen} onClose={() => setIsManagerOpen(false)} />
        </div>
    );
};

const CompanyAppearanceManager: React.FC = () => {
    const { companies, updateCompanyOrder } = useCompanies();
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    
    // Drag and Drop State
    const [draggedItem, setDraggedItem] = useState<Company | null>(null);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, company: Company) => {
        setDraggedItem(company);
        e.dataTransfer.effectAllowed = "move";
        // Optional: set drag image
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetCompany: Company) => {
        e.preventDefault();
        if (!draggedItem || draggedItem.id === targetCompany.id) return;

        const newCompanies = [...companies];
        const draggedIndex = newCompanies.findIndex(c => c.id === draggedItem.id);
        const targetIndex = newCompanies.findIndex(c => c.id === targetCompany.id);
        
        // Remove dragged item
        newCompanies.splice(draggedIndex, 1);
        // Insert at new position
        newCompanies.splice(targetIndex, 0, draggedItem);
        
        // Save new order by IDs
        const newOrderIds = newCompanies.map(c => c.id);
        updateCompanyOrder(newOrderIds);
        setDraggedItem(null);
    };


    return (
        <div>
             <p className="text-sm text-text-secondary -mt-4 mb-4">Customize the logo and background for each client company. Drag and drop to reorder how they appear in the app.</p>
            <div className="flex justify-end mb-4">
                <Button onClick={() => setIsAddModalOpen(true)}>+ Add New Company</Button>
            </div>
            <div className="space-y-2">
                {companies.map((company, index) => (
                    <div 
                        key={company.id} 
                        className={`flex justify-between items-center p-3 bg-surface-soft rounded-md border border-transparent transition-all ${draggedItem?.id === company.id ? 'opacity-50 border-primary' : 'hover:border-border-default'}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, company)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, company)}
                    >
                        <div className="flex items-center gap-3">
                             <div className="cursor-grab text-text-secondary hover:text-text-primary">
                                <Bars3Icon className="h-5 w-5" />
                            </div>
                            <span className="font-medium text-text-primary">{index + 1}. {company.name}</span>
                        </div>
                        <Button onClick={() => setEditingCompany(company)} variant="secondary">Edit Appearance</Button>
                    </div>
                ))}
            </div>
            {editingCompany && <CompanyAppearanceModal company={editingCompany} onClose={() => setEditingCompany(null)} />}
            {isAddModalOpen && <AddCompanyModal onClose={() => setIsAddModalOpen(false)} />}
        </div>
    );
};

export default SettingsScreen;
