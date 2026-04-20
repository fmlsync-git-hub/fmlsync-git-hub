
import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { Screen } from '../types';

export type SpinnerStyle = 'pulse' | 'dots' | 'ring';
export type AnimationStyle = 'none' | 'fade' | 'slide';

export interface LoginScreenSettings {
    backgroundType: 'color' | 'image';
    backgroundColor: string; // The main background
    cardBackgroundColor: string; // The login box color
    inputBackgroundColor: string; // Input fields
    inputTextColor: string;
    buttonColor: string; // Primary button
    buttonTextColor: string;
    accentColor: string; // For spinners, decorations
    textColor: string; // Main headings
    textSecondaryColor: string; // Subtitles/labels
}

export interface BrandingSettings {
  appName: string;
  appLogo: string | null;
  brandColor: string; // Specific color for the logo/brand name
  dashboardTitle: string; 
  headerHeight: number; 
  sidebarWidth: number; 
  fontColor: string;
  backgroundColor: string;
  watermarkEnabled: boolean;
  watermarkOpacity: number;
  watermarkLocation: 'none' | 'sidebar' | 'main';
  watermarkSize: number;
  manualTitle: string;
  stickyHeaderEnabled: boolean;
  splashLogo: string | null; 
  tickerSpeed: number; 
  spinnerStyle: SpinnerStyle;
  animationStyle: AnimationStyle;
  featureFlags: { [key in Screen]?: boolean };
  pageLayout: 'full' | 'wide' | 'large' | 'boxed' | 'half';
  loginSettings: LoginScreenSettings;
}

interface BrandingContextType extends BrandingSettings {
  updateBranding: (settings: Partial<BrandingSettings>) => void;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

const defaultLoginSettings: LoginScreenSettings = {
    backgroundType: 'color',
    backgroundColor: '#0f172a', // Slate-900 like
    cardBackgroundColor: 'rgba(30, 41, 59, 0.7)', // Slate-800 with opacity
    inputBackgroundColor: 'rgba(15, 23, 42, 0.5)',
    inputTextColor: '#ffffff',
    buttonColor: '#4f46e5', // Indigo-600
    buttonTextColor: '#ffffff',
    accentColor: '#6366f1', // Indigo-500
    textColor: '#ffffff',
    textSecondaryColor: '#94a3b8', // Slate-400
};

const defaultSettings: BrandingSettings = {
  appName: 'FML-Ticketing',
  appLogo: null,
  brandColor: '#4f46e5', 
  dashboardTitle: 'EXECUTIVE COMMAND', 
  headerHeight: 64, 
  sidebarWidth: 256, 
  fontColor: '',
  backgroundColor: '',
  watermarkEnabled: false,
  watermarkOpacity: 0.1,
  watermarkLocation: 'none',
  watermarkSize: 50,
  manualTitle: 'FML Ticketing App: User Manual',
  stickyHeaderEnabled: true,
  splashLogo: null,
  tickerSpeed: 40, 
  spinnerStyle: 'pulse',
  animationStyle: 'fade',
  featureFlags: {},
  pageLayout: 'boxed',
  loginSettings: defaultLoginSettings
};


export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<BrandingSettings>(() => {
    const saved = localStorage.getItem('fml_branding_settings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  // Inject Dynamic CSS Variables for Layout
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--header-height', `${branding.headerHeight}px`);
    root.style.setProperty('--sidebar-width', `${branding.sidebarWidth}px`);
    document.body.style.setProperty('--header-height', `${branding.headerHeight}px`);
    document.body.style.setProperty('--sidebar-width', `${branding.sidebarWidth}px`);
  }, [branding.headerHeight, branding.sidebarWidth]);

  useEffect(() => {
    const defaultFavicon = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎫</text></svg>";
    document.title = branding.appName;
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    link.href = branding.appLogo || defaultFavicon;
  }, [branding.appName, branding.appLogo]);
  

  const updateBranding = (settings: Partial<BrandingSettings>) => {
    setBranding(prev => {
        const newSettings = { ...prev, ...settings };
        localStorage.setItem('fml_branding_settings', JSON.stringify(newSettings));
        return newSettings;
    });
  };

  const value = useMemo(() => ({ ...branding, updateBranding }), [branding]);

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = (): BrandingContextType => {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    return { 
        ...defaultSettings, 
        updateBranding: (s) => console.warn("updateBranding called outside of provider", s) 
    };
  }
  return context;
};
