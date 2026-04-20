
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Company } from '../types';
import { useCompanies } from '../context/CompanyContext';
import { XMarkIcon } from './icons/index';

interface CompanyAppearanceModalProps {
  company: Company;
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

const RadioPill: React.FC<{name: string, value: string, checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, label: string}> = ({ name, value, checked, onChange, label}) => (
    <label className={`relative inline-flex items-center justify-center cursor-pointer px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${checked ? 'bg-primary text-white shadow-sm z-10' : 'bg-surface text-text-secondary hover:bg-border-default'}`}>
        <input
            type="radio"
            name={name}
            value={value}
            checked={checked}
            onChange={onChange}
            className="sr-only"
        />
        {label}
    </label>
);


export const CompanyAppearanceModal: React.FC<CompanyAppearanceModalProps> = ({ company, onClose }) => {
    const { updateCompanyAppearance } = useCompanies();
    const [logoPreview, setLogoPreview] = useState<string | null>(typeof company.logo === 'string' ? company.logo : null);
    const [bgColor, setBgColor] = useState<string>(company.logoBg || '#ffffff');
    const [logoSize, setLogoSize] = useState<'50%' | '70%' | '100%'>(company.logoSize || '100%');
    const [bgStyle, setBgStyle] = useState<'transparent' | 'color'>(company.bgStyle || 'color');
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

        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            alert('Please select an image or video file.');
            return;
        }

        try {
            const dataUrl = await fileToDataUrl(file);
            setLogoPreview(dataUrl);
        } catch (error) {
            console.error('Failed to read file:', error);
            alert('Could not process the selected file.');
        }
    }, []);

    const handleSave = () => {
        setIsSaving(true);
        updateCompanyAppearance(company.id, {
            logo: logoPreview,
            logoBg: bgColor,
            logoSize: logoSize,
            bgStyle: bgStyle,
        });
        setIsSaving(false);
        onClose();
    };

    const triggerFileInput = () => fileInputRef.current?.click();

    const renderLogo = () => {
        const style = {
            maxWidth: logoSize,
            maxHeight: logoSize,
        };
        if (logoPreview) {
            if (logoPreview.startsWith('data:video')) {
                return <video src={logoPreview} autoPlay loop muted playsInline className="object-contain" style={style}></video>;
            }
            return <img src={logoPreview} alt="Logo preview" className="object-contain" style={style} />;
        }
        if (typeof company.logo === 'function') {
            const LogoComponent = company.logo;
            return <LogoComponent className="text-primary" style={style} />;
        }
        return <span className="text-text-secondary">No Logo</span>;
    };
    
    const transparentBgStyle: React.CSSProperties = {
        backgroundImage: 'linear-gradient(45deg, rgb(var(--color-border-default)) 25%, transparent 25%), linear-gradient(-45deg, rgb(var(--color-border-default)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgb(var(--color-border-default)) 75%), linear-gradient(-45deg, transparent 75%, rgb(var(--color-border-default)) 75%)',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
    };

    const previewContainerStyle = bgStyle === 'transparent' ? transparentBgStyle : { backgroundColor: bgColor };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-border-default p-4">
                    <h3 className="text-xl font-semibold text-text-primary">Edit Appearance for {company.name}</h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-danger p-1 rounded-full transition-colors">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Logo Preview</label>
                        <div className="flex items-center justify-center p-4 rounded-md min-h-[150px] border border-border-default" style={previewContainerStyle}>
                            {renderLogo()}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Logo Size</label>
                            <div className="flex items-center bg-surface-soft p-1 rounded-lg">
                                <RadioPill name="logoSize" value="50%" checked={logoSize === '50%'} onChange={(e) => setLogoSize(e.target.value as any)} label="50%" />
                                <RadioPill name="logoSize" value="70%" checked={logoSize === '70%'} onChange={(e) => setLogoSize(e.target.value as any)} label="70%" />
                                <RadioPill name="logoSize" value="100%" checked={logoSize === '100%'} onChange={(e) => setLogoSize(e.target.value as any)} label="Fill" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Background Style</label>
                             <div className="flex items-center bg-surface-soft p-1 rounded-lg">
                                <RadioPill name="bgStyle" value="color" checked={bgStyle === 'color'} onChange={(e) => setBgStyle(e.target.value as any)} label="Colored" />
                                <RadioPill name="bgStyle" value="transparent" checked={bgStyle === 'transparent'} onChange={(e) => setBgStyle(e.target.value as any)} label="Transparent" />
                            </div>
                        </div>
                    </div>


                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                        <div>
                            <label htmlFor="logo-upload" className="block text-sm font-medium text-text-secondary mb-1">Upload new logo</label>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={triggerFileInput}
                                    className="w-full px-4 py-2 bg-surface-soft text-text-primary font-semibold rounded-md hover:bg-border-default transition-colors"
                                >
                                    Choose File...
                                </button>
                                {logoPreview && (
                                    <button onClick={() => setLogoPreview(null)} className="text-sm text-danger hover:underline flex-shrink-0">
                                        Remove
                                    </button>
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
                        <div style={{ visibility: bgStyle === 'color' ? 'visible' : 'hidden' }}>
                            <label htmlFor="bg-color" className="block text-sm font-medium text-text-secondary mb-1">Background Color</label>
                            <input
                                id="bg-color"
                                type="color"
                                value={bgColor}
                                onChange={(e) => setBgColor(e.target.value)}
                                className="w-full h-10 p-1 bg-surface border border-border-default rounded-md cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
                 <div className="flex justify-end gap-3 bg-surface-soft p-4 border-t border-border-default rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-surface text-text-primary rounded-md hover:bg-border-default transition-colors">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};
