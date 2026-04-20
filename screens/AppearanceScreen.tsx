import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { THEMES } from '../themes';
import { CheckCircleIcon } from '../components/icons/index';
import { ColorPickerControl } from '../components/ColorPickerControl';
import { listenToThemePresets } from '../services/firebase';
import { ThemePreset } from '../types';

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

const AppearanceScreen: React.FC = () => {
    const { 
        theme: activeTheme, 
        setTheme, 
        customColors, 
        setCustomColor, 
        resetCustomColors 
    } = useTheme();

    const [presets, setPresets] = useState<ThemePreset[]>([]);

    useEffect(() => {
        const unsubscribe = listenToThemePresets(setPresets);
        return () => unsubscribe();
    }, []);

    const activeThemeColors = THEMES[activeTheme].colors;

    // Helper to get current or default
    const getVal = (key: keyof typeof customColors) => customColors[key] || activeThemeColors[key as keyof typeof activeThemeColors];

    const currentBgColor = rgbStringToHex(getVal('--color-background'));
    
    const currentSurfaceColor = rgbStringToHex(getVal('--color-surface'));
    const currentOnSurfaceColor = rgbStringToHex(getVal('--color-on-surface'));
    const currentSurfaceOpacity = getVal('--opacity-surface') || '1';

    const currentSidebarColor = rgbStringToHex(getVal('--color-sidebar'));
    const currentOnSidebarColor = rgbStringToHex(getVal('--color-on-sidebar') || getVal('--color-on-surface')); 
    const currentSidebarOpacity = getVal('--opacity-sidebar') || '1';

    const currentHeaderColor = rgbStringToHex(getVal('--color-header'));
    const currentOnHeaderColor = rgbStringToHex(getVal('--color-on-header') || getVal('--color-on-surface'));
    const currentHeaderOpacity = getVal('--opacity-header') || '1';


    const updateColors = (updates: { [key: string]: string }) => {
        Object.entries(updates).forEach(([key, value]) => {
            // Casting key to 'any' here because the context interface isn't strictly typed for every CSS var
            // but setCustomColor accepts the keys.
            setCustomColor(key as any, value);
        });
    };
    
    const applyPreset = (preset: ThemePreset) => {
        // We apply the preset colors as custom color overrides
        Object.entries(preset.colors).forEach(([key, value]) => {
            setCustomColor(key as any, value);
        });
    };

    const hasCustomColors = Object.keys(customColors).length > 0;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-on-background">Change Appearance</h2>
                <p className="mt-1 text-text-secondary">Select a theme or customize colors individually. Your choices will be saved for your next visit.</p>
            </div>

            {presets.length > 0 && (
                <div className="bg-surface p-6 rounded-lg shadow-md border border-border-default">
                    <h3 className="text-lg font-semibold text-on-surface mb-4">Community Presets</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {presets.map(preset => (
                            <button 
                                key={preset.id} 
                                onClick={() => applyPreset(preset)}
                                className="p-3 bg-surface-soft rounded-lg border border-border-default flex items-center gap-3 hover:border-primary transition-all hover:shadow-md text-left"
                            >
                                <div className="w-10 h-10 rounded-full border border-border-default overflow-hidden flex-shrink-0 flex">
                                    <div className="w-1/2 h-full" style={{ backgroundColor: `rgb(${preset.colors['--color-background'] || '0 0 0'})` }}></div>
                                    <div className="w-1/2 h-full" style={{ backgroundColor: `rgb(${preset.colors['--color-primary'] || '0 0 0'})` }}></div>
                                </div>
                                <div>
                                    <span className="font-medium text-text-primary block">{preset.name}</span>
                                    <span className="text-xs text-text-secondary">Click to apply</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-surface p-6 rounded-lg shadow-md border border-border-default">
                <h3 className="text-lg font-semibold text-on-surface">Custom Color Overrides</h3>
                <p className="text-sm text-text-secondary mt-1 mb-4">Fine-tune colors and opacity. These settings override the selected theme.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                     <ColorPickerControl 
                        label="Dashboard Background"
                        bgVariable="--color-background"
                        initialBgColor={currentBgColor}
                        onSave={updateColors}
                     />
                     <ColorPickerControl 
                        label="Card & Surface"
                        bgVariable="--color-surface"
                        textVariable="--color-on-surface"
                        opacityVariable="--opacity-surface"
                        initialBgColor={currentSurfaceColor}
                        initialTextColor={currentOnSurfaceColor}
                        initialOpacity={currentSurfaceOpacity}
                        onSave={updateColors}
                     />
                     <ColorPickerControl 
                        label="Sidebar"
                        bgVariable="--color-sidebar"
                        textVariable="--color-on-sidebar"
                        opacityVariable="--opacity-sidebar"
                        initialBgColor={currentSidebarColor}
                        initialTextColor={currentOnSidebarColor}
                        initialOpacity={currentSidebarOpacity}
                        onSave={updateColors}
                     />
                     <ColorPickerControl 
                        label="Top Bar"
                        bgVariable="--color-header"
                        textVariable="--color-on-header"
                        opacityVariable="--opacity-header"
                        initialBgColor={currentHeaderColor}
                        initialTextColor={currentOnHeaderColor}
                        initialOpacity={currentHeaderOpacity}
                        onSave={updateColors}
                     />
                </div>
                 {hasCustomColors && (
                    <div className="mt-4 text-right">
                        <button onClick={resetCustomColors} className="text-sm font-semibold text-primary hover:text-primary-dark">
                            Reset to Theme Defaults
                        </button>
                    </div>
                )}
            </div>

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
                            onClick={() => setTheme(key as keyof typeof THEMES)}
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
                            
                            <div className="h-40 p-4 space-y-2 opacity-80">
                                <div className="h-6 rounded w-full" style={{ background: 'var(--preview-surface)' }}></div>
                                <div className="flex items-center gap-2">
                                     <div className="h-8 rounded-full w-8 flex-shrink-0" style={{ background: 'var(--preview-primary)' }}></div>
                                     <div className="space-y-1 w-full">
                                        <div className="h-2.5 rounded-full w-3/4" style={{ background: 'var(--preview-text-primary)' }}></div>
                                        <div className="h-2.5 rounded-full w-1/2" style={{ background: 'var(--preview-text-secondary)' }}></div>
                                     </div>
                                </div>
                                <div className="h-12 rounded w-full" style={{ background: 'var(--preview-surface)' }}></div>
                            </div>

                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AppearanceScreen;