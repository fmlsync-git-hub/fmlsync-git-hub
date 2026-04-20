
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useBranding, BrandingSettings, LoginScreenSettings } from '../context/BrandingContext';
import { useTheme } from '../context/ThemeContext';
import { THEMES } from '../themes';
import { ColorPickerControl } from './ColorPickerControl';
import { ArrowPathIcon, SwatchIcon, ArrowsPointingOutIcon, UserIcon } from './icons';
import { applyDimensionsToRoles } from '../services/firebase';
import { UserRole } from '../types';

// Helper to read file as Data URL
const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// Converts an "r g b" string to a hex color string
const rgbStringToHex = (rgbString: string): string => {
  if (!rgbString) return '#000000';
  const parts = rgbString.split(' ').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '#000000';
  const [r, g, b] = parts;
  const toHex = (c: number) => ('0' + c.toString(16)).slice(-2);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

type ButtonVariant = 'primary' | 'secondary';
const Button: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string; disabled?: boolean; variant?: ButtonVariant }> = ({ children, onClick, className, disabled, variant = 'primary' }) => {
    const baseClasses = `px-4 py-2 rounded-md font-semibold shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2`;
    const variantClasses = {
        primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
        secondary: 'bg-surface-soft text-text-primary hover:bg-border-default focus:ring-primary',
    };
    return <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${variantClasses[variant]} ${className} disabled:opacity-50`}>{children}</button>;
};

const ALL_ROLES: UserRole[] = ['developer', 'app_manager', 'admin', 'officer', 'client', 'designer', 'dashboard_only'];

export const AppBrandingEditor: React.FC = () => {
    // Branding Context
    const brandingContext = useBranding();
    const { updateBranding, ...brandingData } = brandingContext;
    const [localSettings, setLocalSettings] = useState<BrandingSettings>(brandingData);
    
    // Theme Context for Sidebar Color
    const { theme, customColors, setCustomColor } = useTheme();
    const activeThemeColors = THEMES[theme].colors;
    const getVal = (key: keyof typeof customColors) => customColors[key] || activeThemeColors[key as keyof typeof activeThemeColors];
    
    const currentSidebarColor = rgbStringToHex(getVal('--color-sidebar'));
    const currentOnSidebarColor = rgbStringToHex(getVal('--color-on-sidebar') || getVal('--color-on-surface'));
    const currentSidebarOpacity = getVal('--opacity-sidebar') || '1';

    // Dimension Targeting State
    const [targetRoles, setTargetRoles] = useState<UserRole[]>([]);
    const [isApplyingDimensions, setIsApplyingDimensions] = useState(false);
    const [dimensionMessage, setDimensionMessage] = useState('');

    useEffect(() => {
        // Sync with context updates
        const { updateBranding: _update, ...newBrandingData } = brandingContext;
        setLocalSettings(newBrandingData);
    }, [brandingContext]);

    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const splashInputRef = useRef<HTMLInputElement>(null);

    const updateLocalSetting = <K extends keyof BrandingSettings>(key: K, value: BrandingSettings[K]) => {
        setLocalSettings(prev => ({...prev, [key]: value }));
    };

    const updateLoginSetting = <K extends keyof LoginScreenSettings>(key: K, value: LoginScreenSettings[K]) => {
        setLocalSettings(prev => ({
            ...prev,
            loginSettings: {
                ...prev.loginSettings,
                [key]: value
            }
        }));
    };

    const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>, settingKey: keyof BrandingSettings) => {
        const file = event.target.files?.[0];
        if (!file) return;
        
        // Basic type check
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            alert('Please upload an image or video file.');
            return;
        }
        
        try {
            const dataUrl = await fileToDataUrl(file);
            updateLocalSetting(settingKey, dataUrl);
        } catch (error) {
            console.error('Failed to read file:', error);
        }
    }, []);

    const handleSave = () => {
        setIsSaving(true);
        updateBranding(localSettings);
        setIsSaving(false);
        setSuccessMessage('Branding updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
    };
    
    const handleSidebarColorUpdate = (updates: { [key: string]: string }) => {
        Object.entries(updates).forEach(([key, value]) => {
            setCustomColor(key as any, value);
        });
    };

    const triggerFileInput = () => fileInputRef.current?.click();
    const triggerSplashInput = () => splashInputRef.current?.click();
    
    const resetBrandColor = () => {
        updateLocalSetting('brandColor', '#4f46e5'); // Reset to default primary indigo
    };

    const handleApplyDimensions = async () => {
        if (targetRoles.length === 0) {
            setDimensionMessage('Please select at least one role to apply changes to.');
            setTimeout(() => setDimensionMessage(''), 3000);
            return;
        }

        setIsApplyingDimensions(true);
        setDimensionMessage('');
        try {
            await applyDimensionsToRoles(targetRoles, {
                sidebarWidth: localSettings.sidebarWidth,
                headerHeight: localSettings.headerHeight,
                pageLayout: localSettings.pageLayout
            });
            
            // Also update global defaults just in case
            updateBranding({
                sidebarWidth: localSettings.sidebarWidth,
                headerHeight: localSettings.headerHeight,
                pageLayout: localSettings.pageLayout
            });
            
            setDimensionMessage(`Dimensions applied to ${targetRoles.length} role(s) successfully.`);
        } catch (error) {
            console.error("Failed to apply dimensions:", error);
            setDimensionMessage('Failed to apply changes. Please try again.');
        } finally {
            setIsApplyingDimensions(false);
            setTimeout(() => setDimensionMessage(''), 3000);
        }
    };

    const toggleRole = (role: UserRole) => {
        setTargetRoles(prev => 
            prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
        );
    };

    const toggleAllRoles = () => {
        if (targetRoles.length === ALL_ROLES.length) {
            setTargetRoles([]);
        } else {
            setTargetRoles(ALL_ROLES);
        }
    };
    
    const HexInput = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => (
        <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>
            <div className="flex items-center gap-2">
                 <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="p-0.5 h-8 w-8 bg-transparent border border-border-default rounded cursor-pointer"
                />
                <input 
                    type="text" 
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-border-default bg-background rounded uppercase"
                />
            </div>
        </div>
    );

    return (
        <>
            <p className="text-sm text-text-secondary -mt-4 mb-4">Customize the application's identity, layout dimensions, colors, and container widths.</p>
            <div className="space-y-6">
                {/* --- Basic Branding --- */}
                <div className="space-y-4">
                    <div>
                        <label htmlFor="app-name" className="block text-sm font-medium text-text-secondary mb-1">App Name</label>
                        <input
                            id="app-name"
                            type="text"
                            value={localSettings.appName}
                            onChange={(e) => updateLocalSetting('appName', e.target.value)}
                            className="w-full px-3 py-2 border border-border-default bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div>
                             <label className="block text-sm font-medium text-text-secondary mb-1">App Logo</label>
                             <div className="flex items-center gap-4">
                                {localSettings.appLogo && (
                                    <img src={localSettings.appLogo} alt="App Logo Preview" className="h-12 w-12 object-contain bg-surface-soft p-1 rounded-md" />
                                )}
                                <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e, 'appLogo')} accept="image/*" className="hidden" />
                                <Button onClick={triggerFileInput} variant="secondary">Choose Logo</Button>
                                {localSettings.appLogo && (
                                    <button onClick={() => updateLocalSetting('appLogo', null)} className="text-sm text-danger hover:underline">Remove</button>
                                )}
                             </div>
                        </div>
                        <div>
                             <label htmlFor="brand-color" className="block text-sm font-medium text-text-secondary mb-1">Brand Font Color</label>
                             <div className="flex items-center gap-2">
                                <input
                                    id="brand-color"
                                    type="color"
                                    value={localSettings.brandColor || '#4f46e5'}
                                    onChange={(e) => updateLocalSetting('brandColor', e.target.value)}
                                    className="p-1 h-10 w-14 bg-background border border-border-default rounded cursor-pointer"
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm text-text-primary font-mono uppercase">{localSettings.brandColor}</span>
                                    <span className="text-xs text-text-secondary">App Title Color</span>
                                </div>
                                <button 
                                    onClick={resetBrandColor}
                                    className="ml-auto p-2 text-text-secondary hover:text-primary hover:bg-surface-soft rounded-full transition-colors"
                                    title="Reset to Default"
                                >
                                    <ArrowPathIcon className="h-5 w-5" />
                                </button>
                             </div>
                        </div>
                    </div>
                </div>

                {/* --- Login & Splash Customization --- */}
                <div className="space-y-4 pt-4 border-t border-border-default">
                    <h4 className="text-md font-semibold text-text-primary flex items-center gap-2">
                        <UserIcon className="h-5 w-5" />
                        Login & Splash Screen
                    </h4>
                    <p className="text-xs text-text-secondary">Customize the appearance of the authentication and loading screens.</p>
                    
                    <div className="bg-surface-soft p-4 rounded-lg border border-border-default">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <HexInput 
                                label="Background Color" 
                                value={localSettings.loginSettings.backgroundColor} 
                                onChange={(v) => updateLoginSetting('backgroundColor', v)} 
                            />
                             <HexInput 
                                label="Card Background" 
                                value={localSettings.loginSettings.cardBackgroundColor} 
                                onChange={(v) => updateLoginSetting('cardBackgroundColor', v)} 
                            />
                             <HexInput 
                                label="Input Background" 
                                value={localSettings.loginSettings.inputBackgroundColor} 
                                onChange={(v) => updateLoginSetting('inputBackgroundColor', v)} 
                            />
                            <HexInput 
                                label="Input Text Color" 
                                value={localSettings.loginSettings.inputTextColor} 
                                onChange={(v) => updateLoginSetting('inputTextColor', v)} 
                            />
                             <HexInput 
                                label="Main Text Color" 
                                value={localSettings.loginSettings.textColor} 
                                onChange={(v) => updateLoginSetting('textColor', v)} 
                            />
                             <HexInput 
                                label="Secondary Text Color" 
                                value={localSettings.loginSettings.textSecondaryColor} 
                                onChange={(v) => updateLoginSetting('textSecondaryColor', v)} 
                            />
                             <HexInput 
                                label="Button Color" 
                                value={localSettings.loginSettings.buttonColor} 
                                onChange={(v) => updateLoginSetting('buttonColor', v)} 
                            />
                             <HexInput 
                                label="Button Text Color" 
                                value={localSettings.loginSettings.buttonTextColor} 
                                onChange={(v) => updateLoginSetting('buttonTextColor', v)} 
                            />
                             <HexInput 
                                label="Accent / Spinner" 
                                value={localSettings.loginSettings.accentColor} 
                                onChange={(v) => updateLoginSetting('accentColor', v)} 
                            />
                        </div>
                    </div>
                </div>

                {/* --- Layout Dimensions & Color (Updated Section) --- */}
                <div className="space-y-4 pt-4 border-t border-border-default">
                    <div className="flex justify-between items-center">
                        <h4 className="text-md font-semibold text-text-primary flex items-center gap-2">
                            <ArrowsPointingOutIcon className="h-5 w-5" />
                            Layout & Dimensions
                        </h4>
                    </div>
                    
                    {/* Page Layout Selector */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Page Container Width</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                            {[
                                { id: 'full', label: 'Full Width', w: '100%' },
                                { id: 'wide', label: 'Wide', w: '1536px' },
                                { id: 'large', label: 'Large', w: '1400px' },
                                { id: 'boxed', label: 'Boxed', w: '1280px' },
                                { id: 'half', label: 'Narrow', w: '720px' },
                            ].map((layout) => (
                                <button
                                    key={layout.id}
                                    onClick={() => updateLocalSetting('pageLayout', layout.id as any)}
                                    className={`px-3 py-2 text-xs font-semibold rounded-md border transition-all ${
                                        localSettings.pageLayout === layout.id
                                            ? 'bg-primary text-white border-primary shadow-md'
                                            : 'bg-surface-soft text-text-primary border-border-default hover:border-primary/50'
                                    }`}
                                >
                                    <span className="block">{layout.label}</span>
                                    <span className="text-[10px] opacity-70 font-normal">{layout.w}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        {/* Sidebar Dimensions */}
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label htmlFor="sidebar-width" className="block text-sm font-medium text-text-secondary">Sidebar Width</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{localSettings.sidebarWidth}px</span>
                                        <button 
                                            onClick={() => updateLocalSetting('sidebarWidth', 256)}
                                            className="text-xs text-text-secondary hover:text-primary transition-colors"
                                            title="Reset to default (256px)"
                                        >
                                            <ArrowPathIcon className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                                <input
                                    id="sidebar-width"
                                    type="range"
                                    min="200"
                                    max="400"
                                    step="8"
                                    value={localSettings.sidebarWidth}
                                    onChange={(e) => updateLocalSetting('sidebarWidth', parseInt(e.target.value))}
                                    className="w-full accent-primary h-2 bg-surface-soft rounded-lg appearance-none cursor-pointer border border-border-default"
                                />
                            </div>
                            
                            {/* Header Height */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label htmlFor="header-height" className="block text-sm font-medium text-text-secondary">Header Height</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{localSettings.headerHeight}px</span>
                                        <button 
                                            onClick={() => updateLocalSetting('headerHeight', 64)}
                                            className="text-xs text-text-secondary hover:text-primary transition-colors"
                                            title="Reset to default (64px)"
                                        >
                                            <ArrowPathIcon className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                                <input
                                    id="header-height"
                                    type="range"
                                    min="50"
                                    max="120"
                                    step="2"
                                    value={localSettings.headerHeight}
                                    onChange={(e) => updateLocalSetting('headerHeight', parseInt(e.target.value))}
                                    className="w-full accent-primary h-2 bg-surface-soft rounded-lg appearance-none cursor-pointer border border-border-default"
                                />
                            </div>
                        </div>

                        {/* Sidebar Appearance (Theme Integration) */}
                        <div className="flex flex-col h-full justify-end">
                             <div className="flex items-center gap-2 mb-2 text-sm font-medium text-text-primary">
                                <SwatchIcon className="h-4 w-4" />
                                <span>Sidebar Color</span>
                             </div>
                             <ColorPickerControl 
                                label="Sidebar Background & Text"
                                bgVariable="--color-sidebar"
                                textVariable="--color-on-sidebar"
                                opacityVariable="--opacity-sidebar"
                                initialBgColor={currentSidebarColor}
                                initialTextColor={currentOnSidebarColor}
                                initialOpacity={currentSidebarOpacity}
                                onSave={handleSidebarColorUpdate}
                            />
                        </div>
                    </div>
                    
                    {/* Role Targeting Section */}
                    <div className="bg-surface-soft p-4 rounded-lg border border-border-default mt-4">
                        <h5 className="font-semibold text-text-primary mb-2 text-sm">Apply Dimensions To:</h5>
                        <div className="flex flex-wrap gap-2 mb-3">
                            <button
                                onClick={toggleAllRoles}
                                className={`px-2 py-1 text-xs font-medium rounded border ${targetRoles.length === ALL_ROLES.length ? 'bg-primary text-white border-primary' : 'bg-surface text-text-secondary border-border-default'}`}
                            >
                                All Roles
                            </button>
                            {ALL_ROLES.map(role => (
                                <button
                                    key={role}
                                    onClick={() => toggleRole(role)}
                                    className={`px-2 py-1 text-xs font-medium rounded border capitalize ${targetRoles.includes(role) ? 'bg-primary/10 text-primary border-primary' : 'bg-surface text-text-secondary border-border-default'}`}
                                >
                                    {role.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center justify-between">
                             <p className="text-xs text-text-secondary">{dimensionMessage && <span className={dimensionMessage.includes('Failed') ? 'text-danger' : 'text-success'}>{dimensionMessage}</span>}</p>
                             <button
                                onClick={handleApplyDimensions}
                                disabled={isApplyingDimensions || targetRoles.length === 0}
                                className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isApplyingDimensions ? 'Applying...' : 'Apply Dimensions to Selected Roles'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- Splash Screen Settings --- */}
                <div className="space-y-4 pt-4 border-t border-border-default">
                    <h4 className="text-md font-semibold text-text-primary">Splash Screen Media</h4>
                    <p className="text-xs text-text-secondary">Upload a logo, GIF, or Video to display while the app loads. Supports Image URLs or local files.</p>
                    
                    <div className="flex items-center gap-4">
                        {localSettings.splashLogo ? (
                            <div className="h-24 w-24 bg-black rounded-md overflow-hidden flex items-center justify-center border border-border-default">
                                {localSettings.splashLogo.startsWith('data:video') || localSettings.splashLogo.endsWith('.mp4') || localSettings.splashLogo.endsWith('.webm') ? (
                                    <video src={localSettings.splashLogo} autoPlay loop muted className="w-full h-full object-cover" />
                                ) : (
                                    <img src={localSettings.splashLogo} alt="Splash Preview" className="w-full h-full object-contain" />
                                )}
                            </div>
                        ) : (
                            <div className="h-24 w-24 bg-surface-soft rounded-md flex items-center justify-center border border-border-default border-dashed">
                                <span className="text-xs text-text-secondary">No Media</span>
                            </div>
                        )}
                        <div className="flex flex-col gap-2">
                            <input type="file" ref={splashInputRef} onChange={(e) => handleFileChange(e, 'splashLogo')} accept="image/*,video/*" className="hidden" />
                            <Button onClick={triggerSplashInput} variant="secondary">Upload Media</Button>
                            
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Or paste URL (gif/mp4/img)" 
                                    className="px-2 py-1 text-sm border border-border-default bg-background rounded-md"
                                    onChange={(e) => updateLocalSetting('splashLogo', e.target.value)}
                                />
                            </div>
                            
                            {localSettings.splashLogo && (
                                <button onClick={() => updateLocalSetting('splashLogo', null)} className="text-sm text-danger hover:underline text-left">Remove</button>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- Executive Dashboard Settings --- */}
                <div className="space-y-4 pt-4 border-t border-border-default">
                    <h4 className="text-md font-semibold text-text-primary">Executive Dashboard</h4>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label htmlFor="ticker-speed" className="block text-sm font-medium text-text-secondary">Flash News Speed</label>
                            <span className="text-xs font-bold text-primary">{localSettings.tickerSpeed} seconds</span>
                        </div>
                        <input 
                            id="ticker-speed" 
                            type="range" 
                            min="10" 
                            max="100" 
                            step="5" 
                            value={localSettings.tickerSpeed || 40} 
                            onChange={(e) => updateLocalSetting('tickerSpeed', parseInt(e.target.value))} 
                            className="w-full accent-primary" 
                        />
                        <p className="text-xs text-text-secondary mt-1">Controls how fast the news ticker scrolls across the screen.</p>
                    </div>
                </div>
                
                {/* --- Watermark Settings --- */}
                <div className="space-y-4 pt-4 border-t border-border-default">
                     <h4 className="text-md font-semibold text-text-primary">Watermark</h4>
                     <label className="flex items-center gap-3 cursor-pointer">
                        <div className="relative">
                            <input
                                type="checkbox"
                                className="sr-only"
                                checked={localSettings.watermarkEnabled}
                                onChange={(e) => updateLocalSetting('watermarkEnabled', e.target.checked)}
                            />
                            <div className={`block w-12 h-6 rounded-full transition-colors ${localSettings.watermarkEnabled ? 'bg-primary' : 'bg-surface-soft'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${localSettings.watermarkEnabled ? 'translate-x-6' : ''}`}></div>
                        </div>
                        <span className="font-medium text-text-primary">Enable Watermark</span>
                    </label>

                    {localSettings.watermarkEnabled && (
                        <div className="space-y-4 pl-8">
                            <div>
                                <label htmlFor="watermark-location" className="block text-sm font-medium text-text-secondary mb-1">Location</label>
                                <select id="watermark-location" value={localSettings.watermarkLocation} onChange={(e) => updateLocalSetting('watermarkLocation', e.target.value as any)} className="w-full px-3 py-2 border border-border-default bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-primary">
                                    <option value="none">None</option>
                                    <option value="sidebar">Sidebar</option>
                                    <option value="main">Main Content Area</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="watermark-opacity" className="block text-sm font-medium text-text-secondary mb-1">Opacity ({Math.round(localSettings.watermarkOpacity * 100)}%)</label>
                                <input id="watermark-opacity" type="range" min="0.05" max="0.5" step="0.01" value={localSettings.watermarkOpacity} onChange={(e) => updateLocalSetting('watermarkOpacity', parseFloat(e.target.value))} className="w-full accent-primary" />
                            </div>
                            <div>
                                <label htmlFor="watermark-size" className="block text-sm font-medium text-text-secondary mb-1">Size ({localSettings.watermarkSize}%)</label>
                                <input id="watermark-size" type="range" min="10" max="100" step="5" value={localSettings.watermarkSize} onChange={(e) => updateLocalSetting('watermarkSize', parseInt(e.target.value))} className="w-full accent-primary" />
                            </div>
                        </div>
                    )}
                </div>

                {/* --- Save Button --- */}
                <div className="flex justify-end pt-4 border-t border-border-default">
                    <div className="flex items-center gap-4">
                        {successMessage && <p className="text-sm text-success">{successMessage}</p>}
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Branding'}
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
};
