
import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { THEMES } from '../../themes';
import { CheckCircleIcon, Cog6ToothIcon, SparklesIcon, PaintBrushIcon, XMarkIcon, TrashIcon, ArrowUpTrayIcon } from '../../components/icons/index';
import { useBranding } from '../../context/BrandingContext';
import { mainNavItems, toolsNavItems, settingsNavItems } from '../../navigation';
import { Screen, UserRole, ThemePreset } from '../../types';
import { ColorPickerControl } from '../../components/ColorPickerControl';
import { AppBrandingEditor } from '../../components/AppBrandingEditor';
import { LayoutName, useLayout } from '../../context/LayoutContext';
import { listenToThemePresets, saveThemePreset, deleteThemePreset, applyDimensionsToRoles, saveThemePreference } from '../../services/firebase';

// --- Helper Functions ---

// Converts an "r g b" string to a hex color string
const rgbStringToHex = (rgbString: string): string => {
  if (!rgbString) return '#000000';
  const parts = rgbString.split(' ').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '#000000';
  const [r, g, b] = parts;
  const toHex = (c: number) => ('0' + c.toString(16)).slice(-2);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};


const allManageableFeatures = [
    ...mainNavItems,
    ...toolsNavItems,
    ...settingsNavItems
]
.filter(item => !['my_account', 'help'].includes(item.id))
.sort((a, b) => a.label.localeCompare(b.label));

const uniqueFeaturesBase = allManageableFeatures.filter((item, index, self) =>
    index === self.findIndex((t) => t.id === item.id)
);

const PreviewWrapper: React.FC<{ theme: typeof THEMES[string], children: React.ReactNode, className?: string }> = ({ theme, children, className }) => {
  const style = {
    '--bg': `rgb(${theme.colors['--color-background']})`,
    '--surface': `rgb(${theme.colors['--color-surface']})`,
    '--primary': `rgb(${theme.colors['--color-primary']})`,
  } as React.CSSProperties;
  return <div className={`w-full h-full p-2 rounded-lg ${className || ''}`} style={style}>{children}</div>;
}

const SimplePreview: React.FC<{ theme: typeof THEMES[string] }> = ({ theme }) => (
    <PreviewWrapper theme={theme} className="bg-[var(--bg)]">
        <div className="flex w-full h-full gap-1">
            <div className="w-1/4 bg-[var(--surface)] rounded-l-md"></div>
            <div className="flex-1 bg-[var(--bg)] rounded-r-md p-1 space-y-1">
                 <div className="h-4 bg-[var(--surface)] rounded-sm"></div>
                 <div className="h-2/3 bg-[var(--surface)] rounded-sm"></div>
            </div>
        </div>
    </PreviewWrapper>
);

interface Sample {
  id: string;
  name: string;
  description: string;
  preview: React.FC<{ theme: typeof THEMES[string] }>;
  theme: keyof typeof THEMES;
  layout: LayoutName;
}

const SAMPLES: Sample[] = [
  { id: 'royalIndigo', name: 'Default Desktop', description: 'Standard professional layout.', preview: SimplePreview, theme: 'royalIndigo', layout: 'default' },
  { id: 'bookingBlue', name: 'Booking App', description: 'Responsive bottom nav layout.', preview: SimplePreview, theme: 'bookingBlue', layout: 'mobile_booking' },
  { id: 'neonPurple', name: 'Neon Dark', description: 'Futuristic dark theme.', preview: SimplePreview, theme: 'neonPurple', layout: 'neon' },
  { id: 'vibrantChat', name: 'Vibrant Chat', description: 'Messaging style interface.', preview: SimplePreview, theme: 'vibrantChat', layout: 'vibrantChat' },
  { id: 'travelApp', name: 'Travel App', description: 'Fresh green/yellow palette.', preview: SimplePreview, theme: 'travelApp', layout: 'travelApp' },
];

const ALL_ROLES: UserRole[] = ['developer', 'app_manager', 'admin', 'officer', 'client', 'designer'];

interface ApplyThemeModalProps {
    sample: Sample;
    onClose: () => void;
    onApply: (roles: UserRole[]) => void;
}

const ApplyThemeModal: React.FC<ApplyThemeModalProps> = ({ sample, onClose, onApply }) => {
    const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleRoleToggle = (role: UserRole) => {
        setSelectedRoles(prev => 
            prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
        );
    };

    const handleSelectAll = (isChecked: boolean) => {
        setSelectedRoles(isChecked ? ALL_ROLES : []);
    };
    
    const isAllSelected = selectedRoles.length === ALL_ROLES.length;

    const handleConfirm = async () => {
        if (selectedRoles.length === 0) {
            setError('Please select at least one user role.');
            return;
        }
        setError('');
        setIsSaving(true);
        try {
            // Mock Apply Layout
            console.log(`Applying layout ${sample.layout} to roles:`, selectedRoles);
            onApply(selectedRoles);
            onClose();
        } catch (err) {
            console.error("Failed to apply layout:", err);
            setError("An error occurred while applying the settings.");
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-border-default p-4">
                    <h3 className="text-xl font-semibold text-text-primary">Apply UI: {sample.name}</h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-danger p-1 rounded-full transition-colors"><XMarkIcon className="h-6 w-6" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-text-secondary">Select roles to apply this UI layout to.</p>
                    {error && <p className="text-sm text-danger text-center bg-danger/10 p-2 rounded-md">{error}</p>}
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 p-2 bg-surface-soft rounded-md cursor-pointer hover:bg-border-default/50 transition-colors">
                            <input type="checkbox" className="h-5 w-5 rounded bg-surface border-border-default text-primary focus:ring-primary" checked={isAllSelected} onChange={(e) => handleSelectAll(e.target.checked)} />
                            <span className="font-semibold text-text-primary">All Users</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2 pl-4 border-l-2 border-border-default">
                             {ALL_ROLES.map(role => (
                                <label key={role} className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-surface-soft transition-colors">
                                    <input type="checkbox" className="h-5 w-5 rounded bg-surface border-border-default text-primary focus:ring-primary" checked={selectedRoles.includes(role)} onChange={() => handleRoleToggle(role)} />
                                    <span className="text-text-primary capitalize">{role.replace('_', ' ')}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 bg-surface-soft p-4 border-t border-border-default">
                    <button onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm font-semibold bg-surface text-text-primary rounded-md hover:bg-border-default transition-colors">Cancel</button>
                    <button onClick={handleConfirm} disabled={isSaving || selectedRoles.length === 0} className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50">{isSaving ? 'Applying...' : 'Apply'}</button>
                </div>
            </div>
        </div>
    );
};


const RootAppearanceScreen: React.FC = () => {
    const { 
        theme: activeTheme, 
        customColors, 
        setTheme,
        setCustomColors
    } = useTheme();
    
    const { featureFlags, updateBranding } = useBranding();
    const [scope, setScope] = useState<'developer' | 'admin' | 'both'>('both');
    const activeThemeColors = THEMES[activeTheme].colors;
    const [applyingSample, setApplyingSample] = useState<Sample | null>(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [themePresets, setThemePresets] = useState<ThemePreset[]>([]);
    const [isDeploying, setIsDeploying] = useState(false);

    useEffect(() => {
        const unsubscribe = listenToThemePresets(setThemePresets);
        return () => unsubscribe();
    }, []);
    
    // Pattern Upload
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Preset State
    const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    const [isSavingPreset, setIsSavingPreset] = useState(false);


    // Add AI Assistant to the list of features that can be managed
    const uniqueFeatures = [...uniqueFeaturesBase, {
        id: 'ai_assistant' as Screen,
        label: 'AI Assistant',
        icon: SparklesIcon,
    }].sort((a, b) => a.label.localeCompare(b.label));

    // Helper to get current values
    const getVal = (key: keyof typeof customColors) => customColors[key] || activeThemeColors[key as keyof typeof activeThemeColors];

    // --- Color Calculations ---
    const currentBgMarginColor = rgbStringToHex(getVal('--color-background-margin') || getVal('--color-background'));
    const currentBgColor = rgbStringToHex(getVal('--color-background'));
    const currentBgTextColor = rgbStringToHex(getVal('--color-on-background') || getVal('--color-on-surface'));
    const currentBgTextSecondaryColor = rgbStringToHex(getVal('--color-on-background-secondary') || getVal('--color-text-secondary'));

    const currentSurfaceColor = rgbStringToHex(getVal('--color-surface'));
    const currentOnSurfaceColor = rgbStringToHex(getVal('--color-on-surface'));
    const currentSurfaceOpacity = getVal('--opacity-surface') || '1';

    const currentSidebarColor = rgbStringToHex(getVal('--color-sidebar'));
    const currentOnSidebarColor = rgbStringToHex(getVal('--color-on-sidebar') || getVal('--color-on-surface')); 
    const currentSidebarOpacity = getVal('--opacity-sidebar') || '1';

    const currentHeaderColor = rgbStringToHex(getVal('--color-header'));
    const currentOnHeaderColor = rgbStringToHex(getVal('--color-on-header') || getVal('--color-on-surface'));
    const currentHeaderOpacity = getVal('--opacity-header') || '1';
    
    const currentPrimaryColor = rgbStringToHex(getVal('--color-primary'));
    const currentOnPrimaryColor = rgbStringToHex(getVal('--color-on-primary'));

    const currentInputBgColor = rgbStringToHex(getVal('--color-input-bg'));
    const currentInputTextColor = rgbStringToHex(getVal('--color-input-text'));
    const currentInputOpacity = getVal('--opacity-input') || '1';
    
    // Pattern State
    const currentPatternOpacity = parseFloat(getVal('--opacity-background-pattern') || '1') * 100;


    const handleThemeSelect = (themeKey: keyof typeof THEMES) => {
        setTheme(themeKey);
    };

    const handleUpdateColors = (updates: { [key: string]: string }) => {
         setCustomColors({ ...customColors, ...updates });
    }
    
    const handlePatternUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        
        try {
            const dataUrl = await fileToDataUrl(file);
            handleUpdateColors({ 
                '--image-background-margin': dataUrl,
                '--opacity-background-pattern': '1' // Reset to full visibility on new upload
            });
        } catch (e) {
            console.error("Failed to read pattern file", e);
        }
    };
    
    const handleRemovePattern = () => {
         handleUpdateColors({ 
            '--image-background-margin': '',
            '--opacity-background-pattern': '0' 
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
    
    const handlePatternOpacityChange = (val: string) => {
        handleUpdateColors({ '--opacity-background-pattern': String(parseInt(val) / 100) });
    }


    const handleFeatureToggle = (featureId: Screen, isEnabled: boolean) => {
        updateBranding({
            featureFlags: {
                ...featureFlags,
                [featureId]: isEnabled,
            },
        });
    };
    
    const handleResetColors = () => {
        setCustomColors({});
    };

    const handleDeployGlobal = async () => {
        setIsDeploying(true);
        try {
            await saveThemePreference('both', {
                name: activeTheme,
                customColors: customColors
            });
            setSuccessMessage("Theme deployed globally to all users!");
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (e) {
             console.error("Error deploying theme:", e);
             alert("Deployment failed.");
        } finally {
            setIsDeploying(false);
        }
    };

    const handleSavePreset = async () => {
        if (!newPresetName.trim()) return;
        setIsSavingPreset(true);
        
        try {
            const newPreset: ThemePreset = {
                id: Date.now().toString(),
                name: newPresetName.trim(),
                createdBy: 'Developer',
                createdAt: Date.now(),
                colors: customColors as { [key: string]: string },
            };
            
            await saveThemePreset(newPreset);
            
            setSuccessMessage(`Preset "${newPresetName}" saved successfully.`);
            setTimeout(() => setSuccessMessage(''), 3000);
            setIsPresetModalOpen(false);
            setNewPresetName('');
        } catch (e) {
            console.error("Error saving preset:", e);
            alert("Failed to save preset.");
        } finally {
            setIsSavingPreset(false);
        }
    };

    const handleDeletePreset = async (presetId: string) => {
        if (!confirm('Are you sure you want to delete this preset?')) return;
        try {
            await deleteThemePreset(presetId);
            setSuccessMessage('Preset deleted.');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (e) {
            console.error("Error deleting preset:", e);
        }
    };

    const hasCustomColors = Object.keys(customColors).length > 0;

    return (
        <div className="space-y-6">
             {successMessage && (
                <div className="fixed top-24 right-6 bg-success text-white p-3 rounded-lg shadow-lg animate-slideIn z-50 flex items-center gap-2">
                    <CheckCircleIcon className="h-5 w-5"/>
                    <span>{successMessage}</span>
                </div>
            )}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-text-primary">Global Settings</h2>
                    <p className="mt-1 text-text-secondary">
                        Define and apply themes, branding, and features. Changes made here affect all users.
                    </p>
                </div>
                <button
                    onClick={handleDeployGlobal}
                    disabled={isDeploying}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-lg shadow-lg hover:bg-primary-dark transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                    <SparklesIcon className="h-5 w-5" />
                    {isDeploying ? 'Deploying...' : 'Deploy to All Users'}
                </button>
            </div>

            <div className="bg-surface p-6 rounded-lg shadow-md border border-border-default">
                 <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <PaintBrushIcon className="h-6 w-6 text-text-secondary" />
                    App Branding
                 </h3>
                 <AppBrandingEditor />
            </div>
            
            <div className="bg-surface p-6 rounded-lg shadow-md border border-border-default">
                <div className="flex justify-between items-center mb-4">
                    <div>
                         <h3 className="text-lg font-semibold text-text-primary">Custom Color Overrides</h3>
                         <p className="text-sm text-text-secondary mt-1">Fine-tune colors and opacity. These settings override the selected theme.</p>
                    </div>
                    <button 
                        onClick={() => setIsPresetModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-dark transition-colors"
                        disabled={!hasCustomColors}
                        title={!hasCustomColors ? "Customize colors first to save a preset" : "Save as Preset"}
                    >
                        <ArrowUpTrayIcon className="h-4 w-4" />
                        Save as Preset
                    </button>
                </div>
                
                <div className="space-y-6">
                    {/* Section 1: Core Layout */}
                    <div>
                        <h4 className="text-md font-medium text-text-primary mb-3 border-l-4 border-primary pl-2">Core Layout Surfaces</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                             <div className="space-y-4">
                                <ColorPickerControl 
                                    label="Page Margins (Outer)"
                                    bgVariable="--color-background-margin"
                                    initialBgColor={currentBgMarginColor}
                                    onSave={handleUpdateColors}
                                />
                                {/* Pattern Uploader Section */}
                                <div className="bg-surface-soft p-3 rounded-lg border border-border-default">
                                    <label className="block text-xs font-bold text-text-primary mb-2">Margin Pattern / Watermark</label>
                                    <div className="flex gap-2 mb-2">
                                        <button 
                                            onClick={() => fileInputRef.current?.click()} 
                                            className="flex-1 px-2 py-1 text-xs bg-surface border border-border-default rounded hover:bg-border-default text-text-primary"
                                        >
                                            Upload Image
                                        </button>
                                        {customColors['--image-background-margin'] && (
                                            <button onClick={handleRemovePattern} className="px-2 py-1 text-xs bg-danger/10 text-danger rounded hover:bg-danger/20">
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                    <input 
                                        ref={fileInputRef}
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={handlePatternUpload} 
                                    />
                                    
                                    {customColors['--image-background-margin'] && (
                                        <div>
                                            <div className="flex justify-between text-xs text-text-secondary mb-1">
                                                <span>Pattern Opacity</span>
                                                <span>{Math.round(currentPatternOpacity)}%</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0" 
                                                max="100" 
                                                value={currentPatternOpacity} 
                                                onChange={(e) => handlePatternOpacityChange(e.target.value)}
                                                className="w-full h-1.5 bg-border-default rounded-lg appearance-none cursor-pointer accent-primary"
                                            />
                                        </div>
                                    )}
                                </div>
                             </div>

                            <ColorPickerControl 
                                label="Main Dashboard Background"
                                bgVariable="--color-background"
                                textVariable="--color-on-background"
                                secondaryTextVariable="--color-on-background-secondary"
                                initialBgColor={currentBgColor}
                                initialTextColor={currentBgTextColor}
                                initialSecondaryTextColor={currentBgTextSecondaryColor}
                                onSave={handleUpdateColors}
                            />

                            <ColorPickerControl 
                                label="Cards & Surfaces"
                                bgVariable="--color-surface"
                                textVariable="--color-on-surface"
                                opacityVariable="--opacity-surface"
                                initialBgColor={currentSurfaceColor}
                                initialTextColor={currentOnSurfaceColor}
                                initialOpacity={currentSurfaceOpacity}
                                onSave={handleUpdateColors}
                            />

                            <ColorPickerControl 
                                label="Sidebar"
                                bgVariable="--color-sidebar"
                                textVariable="--color-on-sidebar"
                                opacityVariable="--opacity-sidebar"
                                initialBgColor={currentSidebarColor}
                                initialTextColor={currentOnSidebarColor}
                                initialOpacity={currentSidebarOpacity}
                                onSave={handleUpdateColors}
                            />
                        </div>
                    </div>

                    {/* Section 2: Navigation & Interactive */}
                    <div>
                        <h4 className="text-md font-medium text-text-primary mb-3 border-l-4 border-primary pl-2">Navigation & Interactive Elements</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                             <ColorPickerControl 
                                label="Top Bar / Header"
                                bgVariable="--color-header"
                                textVariable="--color-on-header"
                                opacityVariable="--opacity-header"
                                initialBgColor={currentHeaderColor}
                                initialTextColor={currentOnHeaderColor}
                                initialOpacity={currentHeaderOpacity}
                                onSave={handleUpdateColors}
                            />

                            <ColorPickerControl 
                                label="Input Fields"
                                bgVariable="--color-input-bg"
                                textVariable="--color-input-text"
                                opacityVariable="--opacity-input"
                                initialBgColor={currentInputBgColor}
                                initialTextColor={currentInputTextColor}
                                initialOpacity={currentInputOpacity}
                                onSave={handleUpdateColors}
                            />

                            <ColorPickerControl 
                                label="Primary Brand Color"
                                bgVariable="--color-primary"
                                textVariable="--color-on-primary"
                                initialBgColor={currentPrimaryColor}
                                initialTextColor={currentOnPrimaryColor}
                                onSave={handleUpdateColors}
                            />
                        </div>
                    </div>
                </div>

                 {hasCustomColors && (
                    <div className="mt-6 pt-4 border-t border-border-default flex justify-end">
                        <button onClick={handleResetColors} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10 rounded-md transition-colors">
                            <TrashIcon className="h-4 w-4" />
                            Reset All Custom Colors
                        </button>
                    </div>
                )}
            </div>

            {/* Base Themes Section */}
            <div>
                <h3 className="text-xl font-bold text-text-primary mb-4">Base Themes</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Object.entries(THEMES).map(([key, theme]) => {
                        const isActive = activeTheme === key;
                        const previewStyles = {
                            background: `rgb(${theme.colors['--color-background']})`,
                            '--preview-surface': `rgb(${theme.colors['--color-surface']})`,
                            '--preview-primary': `rgb(${theme.colors['--color-primary']})`,
                            '--preview-text-primary': `rgb(${theme.colors['--color-on-surface']})`,
                            '--preview-text-secondary': `rgb(${theme.colors['--color-text-secondary']})`,
                        } as React.CSSProperties;

                        return (
                            <div
                                key={key}
                                onClick={() => handleThemeSelect(key as keyof typeof THEMES)}
                                className={`rounded-lg border-2 transition-all duration-200 cursor-pointer overflow-hidden relative shadow-md ${isActive ? 'border-primary' : 'border-border-default hover:border-primary/50'}`}
                                style={previewStyles}
                            >
                                {isActive && (
                                    <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1 z-10">
                                        <CheckCircleIcon className="h-5 w-5" />
                                    </div>
                                )}
                                <div className="p-4">
                                    <h3 className="font-semibold text-lg" style={{ color: 'var(--preview-text-primary)' }}>{theme.name}</h3>
                                </div>
                                <div className="h-32 p-4 space-y-2 opacity-80">
                                    <div className="h-6 rounded w-full" style={{ background: 'var(--preview-surface)' }}></div>
                                    <div className="flex items-center gap-2">
                                         <div className="h-8 rounded-full w-8 flex-shrink-0" style={{ background: 'var(--preview-primary)' }}></div>
                                         <div className="space-y-1 w-full">
                                            <div className="h-2.5 rounded-full w-3/4" style={{ background: 'var(--preview-text-primary)' }}></div>
                                            <div className="h-2.5 rounded-full w-1/2" style={{ background: 'var(--preview-text-secondary)' }}></div>
                                         </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Presets Modal */}
            {isPresetModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface rounded-lg shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-semibold text-text-primary mb-4">Save Theme Preset</h3>
                        <input
                            type="text"
                            value={newPresetName}
                            onChange={(e) => setNewPresetName(e.target.value)}
                            placeholder="Preset Name"
                            className="w-full px-3 py-2 border border-border-default bg-background rounded-md mb-4 focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsPresetModalOpen(false)} className="px-4 py-2 text-sm font-semibold bg-surface-soft text-text-primary rounded-md">Cancel</button>
                            <button onClick={handleSavePreset} disabled={!newPresetName.trim() || isSavingPreset} className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md">{isSavingPreset ? 'Saving...' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Saved Presets Section */}
            {themePresets.length > 0 && (
                <div className="bg-surface p-6 rounded-lg shadow-md border border-border-default mb-6">
                    <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <SparklesIcon className="h-6 w-6 text-text-secondary" />
                        Saved Color Presets
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {themePresets.map((preset) => (
                            <div key={preset.id} className="group relative">
                                <button
                                    onClick={() => setCustomColors(preset.colors)}
                                    className="w-full flex items-center justify-between p-3 rounded-lg border border-border-default hover:border-primary hover:bg-primary/5 transition-all text-left"
                                >
                                    <div>
                                        <span className="font-medium text-text-primary block">{preset.name}</span>
                                        <span className="text-[10px] text-text-secondary">By {preset.createdBy}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        {Object.entries(preset.colors).slice(0, 3).map(([key, val]) => (
                                            <div 
                                                key={key} 
                                                className="h-3 w-3 rounded-full border border-white/20 shadow-sm"
                                                style={{ backgroundColor: val }}
                                            />
                                        ))}
                                    </div>
                                </button>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeletePreset(preset.id);
                                    }}
                                    className="absolute -top-1 -right-1 p-1 bg-error text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                    title="Delete Preset"
                                >
                                    <TrashIcon className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Feature Flags Section */}
            <div className="bg-surface p-6 rounded-lg shadow-md border border-border-default">
                <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <Cog6ToothIcon className="h-6 w-6 text-text-secondary" />
                    Feature Management
                </h3>
                <p className="text-sm text-text-secondary mb-4">Toggle visibility of specific features for all users.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {uniqueFeatures.map(feature => (
                        <label key={feature.id} className="flex items-center justify-between p-3 bg-surface-soft rounded-lg border border-border-default cursor-pointer hover:border-primary/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <feature.icon className="h-5 w-5 text-text-secondary" />
                                <span className="font-medium text-text-primary">{feature.label}</span>
                            </div>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={featureFlags[feature.id] !== false}
                                    onChange={(e) => handleFeatureToggle(feature.id, e.target.checked)}
                                />
                                <div className={`block w-10 h-6 rounded-full transition-colors ${featureFlags[feature.id] !== false ? 'bg-primary' : 'bg-gray-600'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${featureFlags[feature.id] !== false ? 'translate-x-4' : ''}`}></div>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {applyingSample && (
                <ApplyThemeModal
                    sample={applyingSample}
                    onClose={() => setApplyingSample(null)}
                    onApply={(roles) => {
                        setSuccessMessage(`Applied UI to ${roles.length} role(s).`);
                        setTimeout(() => setSuccessMessage(''), 4000);
                    }}
                />
            )}
        </div>
    );
};

export default RootAppearanceScreen;
