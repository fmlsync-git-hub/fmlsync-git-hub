
import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { THEMES, Theme } from '../themes';
import { db, deleteField, doc, onSnapshot, setDoc } from '../services/firebase';

type ThemeName = keyof typeof THEMES;

// Define the shape of custom color overrides
interface CustomColors {
  '--color-background'?: string;
  '--color-background-margin'?: string;
  '--image-background-margin'?: string; // New: For pattern images
  '--opacity-background-pattern'?: string; // New: For pattern opacity
  '--color-surface'?: string;
  '--color-surface-soft'?: string;
  '--color-sidebar'?: string;
  '--color-header'?: string;
  '--color-on-sidebar'?: string;
  '--color-on-header'?: string;
  '--opacity-surface'?: string;
  '--opacity-sidebar'?: string;
  '--opacity-header'?: string;
  '--color-on-surface'?: string;
  '--color-on-background'?: string;
  '--color-on-background-secondary'?: string;
  '--color-primary'?: string;
  '--color-on-primary'?: string;
  '--color-input-bg'?: string;
  '--color-input-text'?: string;
  '--color-text-secondary'?: string;
  '--opacity-surface-soft'?: string;
  '--opacity-input'?: string;
}

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (name: ThemeName) => void;
  customColors: CustomColors;
  setCustomColor: (key: keyof CustomColors, value: string) => void;
  setCustomColors: (colors: CustomColors) => void;
  resetCustomColors: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  storageKey?: string; // e.g., 'theme' or 'developerTheme'
  userTheme?: string;
}


export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, storageKey = 'theme', userTheme }) => {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const saved = localStorage.getItem(`${storageKey}_name`);
    return (saved && THEMES[saved as ThemeName]) ? (saved as ThemeName) : 'royalIndigo';
  });
  const [customColors, setCustomColorsState] = useState<CustomColors>(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_customColors`);
      const parsed = saved ? JSON.parse(saved) : {};
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (e) {
      console.error("Error parsing custom colors from localStorage:", e);
      return {};
    }
  });

  useEffect(() => {
    // 1. Set the Base Theme
    if (userTheme && THEMES[userTheme as ThemeName]) {
        setThemeState(userTheme as ThemeName);
    }

    // 2. Listener for Global/Developer Overrides
    const themeRef = doc(db, 'settings', storageKey);
    
    const unsubscribe = onSnapshot(themeRef, docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.name && THEMES[data.name as ThemeName]) {
          setThemeState(data.name as ThemeName);
          localStorage.setItem(`${storageKey}_name`, data.name);
        }
        if (data.customColors) {
          setCustomColorsState(data.customColors);
          localStorage.setItem(`${storageKey}_customColors`, JSON.stringify(data.customColors));
        }
      }
    }, error => {
        console.error(`Error listening to theme settings ('${storageKey}'):`, error);
    });

    return () => unsubscribe();
  }, [storageKey, userTheme]);

  useEffect(() => {
    const root = window.document.documentElement;
    const body = document.body;
    
    // 1. Apply the Base Theme Variables
    const selectedTheme: Theme = THEMES[theme];
    Object.entries(selectedTheme.colors).forEach(([key, value]) => {
      root.style.setProperty(key, String(value));
    });

    // 2. Apply Custom Color Overrides
    Object.entries(customColors).forEach(([key, value]) => {
        if (typeof value === 'string') {
            root.style.setProperty(key, value);
        }
    });

    // 3. Handle Margin Background Image specifically on the body
    if (customColors['--image-background-margin']) {
        body.style.backgroundImage = `url(${customColors['--image-background-margin']})`;
        root.style.setProperty('--opacity-background-pattern', customColors['--opacity-background-pattern'] || '1');
    } else {
        body.style.backgroundImage = '';
        root.style.setProperty('--opacity-background-pattern', '0');
    }

  }, [theme, customColors]);

  const setTheme = (name: ThemeName) => {
    setThemeState(name);
    localStorage.setItem(`${storageKey}_name`, String(name));
    setDoc(doc(db, 'settings', storageKey), { name }, { merge: true })
      .catch(error => console.error("Could not save theme:", error));
  };

  const setCustomColor = (key: keyof CustomColors, value: string) => {
      const newCustomColors = { ...customColors, [key]: value };
      setCustomColorsState(newCustomColors);
      localStorage.setItem(`${storageKey}_customColors`, JSON.stringify(newCustomColors));
      setDoc(doc(db, 'settings', storageKey), { customColors: newCustomColors }, { merge: true })
        .catch(error => console.error("Could not save custom color:", error));
  };

  const setCustomColors = (colors: CustomColors) => {
      setCustomColorsState(colors);
      localStorage.setItem(`${storageKey}_customColors`, JSON.stringify(colors));
      setDoc(doc(db, 'settings', storageKey), { customColors: colors }, { merge: true })
        .catch(error => console.error("Could not save custom colors:", error));
  };

  const resetCustomColors = () => {
      setCustomColorsState({});
      localStorage.removeItem(`${storageKey}_customColors`);
      setDoc(doc(db, 'settings', storageKey), { 
        customColors: deleteField()
      }, { merge: true })
        .catch(error => console.error("Could not reset custom colors:", error));
  };


  const value = useMemo(() => ({ 
      theme, 
      setTheme,
      customColors,
      setCustomColor,
      setCustomColors,
      resetCustomColors 
  }), [theme, customColors, storageKey]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
