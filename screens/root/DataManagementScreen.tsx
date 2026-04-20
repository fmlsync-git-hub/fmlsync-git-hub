
import React, { useState, useRef } from 'react';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { ServerStackIcon, ArrowUpTrayIcon, DownloadIcon, TrashIcon } from '../../components/icons';

// --- Reusable Components ---
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`bg-surface rounded-lg shadow-md border border-border-default ${className || ''}`}>{children}</div>
);

const Button: React.FC<{ children: React.ReactNode; onClick?: () => void; disabled?: boolean, className?: string; variant?: 'primary' | 'secondary' | 'danger' }> = ({ children, onClick, disabled, className, variant = 'primary' }) => {
    const baseClasses = `px-4 py-2 text-sm font-semibold rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`;
    const variantClasses = {
        primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary disabled:bg-neutral-600',
        secondary: 'bg-surface-soft text-text-primary hover:bg-border-default disabled:opacity-50',
        danger: 'bg-danger text-white hover:bg-red-700 disabled:opacity-50'
    };
    return <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${variantClasses[variant]} ${className}`}>{children}</button>;
};

const DataManagementScreen: React.FC = () => {
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const [parsedBackupData, setParsedBackupData] = useState<any>(null);
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [confirmationText, setConfirmationText] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const showMessage = (setter: React.Dispatch<React.SetStateAction<string | null>>, message: string) => {
        setter(message);
        setTimeout(() => setter(null), 5000);
    };

    const convertToCSV = (data: any[]): string => {
        if (!data || data.length === 0) return "";
        const replacer = (_key: any, value: any) => value === null ? '' : value;
        const header = Object.keys(data[0]);
        const csv = [
            header.join(','),
            ...data.map(row => header.map(fieldName => {
                let cellData = row[fieldName];
                if (cellData && typeof cellData === 'object') {
                    return JSON.stringify(cellData).replace(/"/g, '""'); // Stringify objects/arrays
                }
                return JSON.stringify(cellData, replacer);
            }).join(','))
        ].join('\r\n');
        return csv;
    };

    const downloadFile = (content: string, filename: string, type: string) => {
        const blob = new Blob([content], { type });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleBackup = async () => {
        setIsBackingUp(true);
        setError(null);
        setSuccess(null);
        try {
            // Mock backup data
            const backupData = {
                passengers: JSON.parse(localStorage.getItem('fml_passengers') || '[]'),
                users: [],
                usersSettings: [],
                checklists: [],
            };
            const timestamp = new Date().toISOString().replace(/:/g, '-');

            // Download JSON archive
            downloadFile(JSON.stringify(backupData, null, 2), `fml_backup_${timestamp}.json`, 'application/json');

            showMessage(setSuccess, 'Backup files generated and downloaded successfully.');
        } catch (err) {
            console.error(err);
            showMessage(setError, err instanceof Error ? err.message : 'An unknown error occurred during backup.');
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/json') {
            setRestoreFile(file);
            setError(null);
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const parsed = JSON.parse(event.target?.result as string);
                    // Basic validation
                    if (parsed.passengers) {
                        setParsedBackupData(parsed);
                        setIsRestoreModalOpen(true);
                    } else {
                        showMessage(setError, 'Invalid backup file structure. Missing required collections.');
                    }
                } catch (err) {
                    showMessage(setError, 'Failed to parse JSON file. Ensure it is a valid backup.');
                }
            };
            reader.readAsText(file);
        } else {
            showMessage(setError, 'Please select a valid .json backup file.');
        }
        // Reset file input to allow re-selection of the same file
        e.target.value = '';
    };

    const handleRestore = async () => {
        if (confirmationText !== 'OVERWRITE' || !parsedBackupData) return;
        
        setIsRestoring(true);
        setError(null);
        setSuccess(null);
        try {
            // Mock restore
            if (parsedBackupData.passengers) {
                localStorage.setItem('fml_passengers', JSON.stringify(parsedBackupData.passengers));
            }
            showMessage(setSuccess, 'Restore successful! The application will now reload.');
            setTimeout(() => window.location.reload(), 2000);
        } catch (err) {
            console.error(err);
            showMessage(setError, err instanceof Error ? err.message : 'An unknown error occurred during restore.');
        } finally {
            setIsRestoring(false);
            setIsRestoreModalOpen(false);
            setConfirmationText('');
            setParsedBackupData(null);
        }
    };

    const handleFactoryReset = async () => {
        if (confirmationText !== 'FACTORY RESET') return;

        setIsResetting(true);
        setError(null);
        setSuccess(null);
        try {
            // Mock factory reset
            localStorage.clear();
            showMessage(setSuccess, 'System reset successful! The application will now reload.');
            setTimeout(() => window.location.reload(), 2000);
        } catch (err) {
            console.error(err);
            showMessage(setError, err instanceof Error ? err.message : 'An unknown error occurred during reset.');
        } finally {
            setIsResetting(false);
            setIsResetModalOpen(false);
            setConfirmationText('');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-text-primary">Data Management</h2>
                <p className="mt-1 text-text-secondary">Create backups, restore data, or reset the system.</p>
            </div>

            {error && <div className="bg-danger text-white p-4 rounded-md text-center font-semibold">{error}</div>}
            {success && <div className="bg-success text-white p-4 rounded-md text-center font-semibold">{success}</div>}

            <Card>
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-text-primary mb-2 flex items-center gap-2">
                        <DownloadIcon className="h-6 w-6 text-text-secondary" />
                        Create Backup
                    </h3>
                    <p className="text-sm text-text-secondary mb-4">
                        Generate a complete backup of the application data. This will download a JSON file for restoration and separate CSV files for offline viewing. It is recommended to perform backups regularly and store the files in a secure location.
                    </p>
                    <Button onClick={handleBackup} disabled={isBackingUp}>
                        {isBackingUp ? 'Generating...' : 'Generate and Download Backup'}
                    </Button>
                </div>
            </Card>

            <Card>
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-text-primary mb-2 flex items-center gap-2">
                        <ArrowUpTrayIcon className="h-6 w-6 text-text-secondary" />
                        Restore from Backup
                    </h3>
                    <p className="text-sm text-danger mb-4">
                        <strong className="font-semibold">Warning:</strong> Restoring from a backup is a destructive action. It will completely overwrite all existing data in the application with the data from the backup file. This action cannot be undone.
                    </p>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".json" className="hidden" />
                    <Button onClick={() => fileInputRef.current?.click()} variant="secondary">
                        Select Backup File (.json)
                    </Button>
                </div>
            </Card>

            <Card className="border-danger/30 bg-danger/5">
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-danger mb-2 flex items-center gap-2">
                        <TrashIcon className="h-6 w-6 text-danger" />
                        Factory Reset
                    </h3>
                    <p className="text-sm text-text-secondary mb-4">
                        This action will <strong>permanently delete all passenger data</strong>, activity logs, and reset all UI/UX settings to their default state. User accounts will remain, but their layout preferences will be reset.
                    </p>
                    <Button onClick={() => { setConfirmationText(''); setIsResetModalOpen(true); }} variant="danger">
                        Reset Application to Factory Settings
                    </Button>
                </div>
            </Card>

            <ConfirmationModal
                isOpen={isRestoreModalOpen}
                onClose={() => setIsRestoreModalOpen(false)}
                onConfirm={handleRestore}
                title="Confirm Data Restore"
                confirmText="Overwrite Data"
                isConfirming={isRestoring}
                confirmVariant="danger"
            >
                <p>You are about to overwrite all data in the application. This action is irreversible.</p>
                {parsedBackupData && (
                    <div className="text-xs mt-2 bg-surface-soft p-2 rounded">
                        <p>Backup contains:</p>
                        <ul className="list-disc list-inside">
                            <li>{parsedBackupData.users?.length || 0} Users</li>
                            <li>{parsedBackupData.passengers?.length || 0} Passengers</li>
                            <li>{parsedBackupData.checklists?.length || 0} Checklists</li>
                        </ul>
                    </div>
                )}
                <p className="mt-4">To proceed, please type <strong className="text-danger">OVERWRITE</strong> in the box below.</p>
                <input
                    type="text"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    className="w-full mt-2 px-3 py-2 border border-danger bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-danger"
                />
            </ConfirmationModal>

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
                    <li>Clear all activity, error, and notification logs.</li>
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

export default DataManagementScreen;
