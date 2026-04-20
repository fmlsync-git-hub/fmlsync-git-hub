
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useCompanies } from '../context/CompanyContext';
import { XMarkIcon } from './icons/index';

interface AddCompanyModalProps {
  onClose: () => void;
}

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const MAX_LOGO_SIZE_MB = 1;
const MAX_LOGO_SIZE_BYTES = MAX_LOGO_SIZE_MB * 1024 * 1024;

export const AddCompanyModal: React.FC<AddCompanyModalProps> = ({ onClose }) => {
    const { addCompany } = useCompanies();
    const [name, setName] = useState('');
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError(null);

        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            setError('Please select an image or video file.');
            return;
        }

        if (file.size > MAX_LOGO_SIZE_BYTES) {
            setError(`Logo file size cannot exceed ${MAX_LOGO_SIZE_MB}MB.`);
            return;
        }

        try {
            const dataUrl = await fileToDataUrl(file);
            setLogoDataUrl(dataUrl);
        } catch (err) {
            console.error('Failed to read file:', err);
            setError('Could not process the selected file.');
        }
    }, []);

    const handleSave = () => {
        setError(null);
        if (!name.trim()) {
            setError('Company name is required.');
            return;
        }
        if (!logoDataUrl) {
            setError('Company logo is required.');
            return;
        }
        setIsSaving(true);
        addCompany({ name: name.trim(), logo: logoDataUrl });
        setIsSaving(false);
        onClose();
    };

    const triggerFileInput = () => fileInputRef.current?.click();

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-md max-h-[70vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-border-default p-4 flex-none">
                    <h3 className="text-xl font-semibold text-text-primary">Add New Company</h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-danger p-1 rounded-full transition-colors">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                    {error && (
                        <div className="bg-danger/10 text-danger p-3 rounded-md text-sm text-center font-medium">
                            {error}
                        </div>
                    )}
                    <div>
                        <label htmlFor="company-name" className="block text-sm font-medium text-text-secondary mb-1">Company Name *</label>
                        <input
                            id="company-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter company name"
                            className="w-full px-3 py-2 border border-border-default bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                            required
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Company Logo *</label>
                        <div className="mt-1 flex justify-center items-center text-center p-6 border-2 border-border-default border-dashed rounded-md">
                            {logoDataUrl ? (
                                <div className="flex flex-col items-center gap-4">
                                    {logoDataUrl.startsWith('data:video') ? (
                                        <video src={logoDataUrl} autoPlay loop muted playsInline className="max-h-24 object-contain"></video>
                                    ) : (
                                        <img src={logoDataUrl} alt="Logo Preview" className="max-h-24 object-contain" />
                                    )}
                                     <button onClick={triggerFileInput} className="text-sm font-semibold text-primary hover:text-primary-dark">Change Logo</button>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <button onClick={triggerFileInput} className="text-primary font-semibold">Click to upload</button>
                                    <p className="text-xs text-text-secondary mt-1">Image or Video up to {MAX_LOGO_SIZE_MB}MB</p>
                                </div>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            id="logo-upload"
                            type="file"
                            className="sr-only"
                            onChange={handleFileChange}
                            accept="image/*,video/mp4,video/webm,video/quicktime"
                        />
                    </div>
                </div>
                 <div className="flex justify-end gap-3 bg-surface-soft p-4 border-t border-border-default rounded-b-lg flex-none">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-surface text-text-primary rounded-md hover:bg-border-default transition-colors">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save Company'}
                    </button>
                </div>
            </div>
        </div>
    );
};
