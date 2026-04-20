import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { THEMES, Theme } from '../themes';
import { db, deleteField, doc, setDoc, safeSnapshot } from '../services/firebase';

type ThemeName = keyof typeof THEMES;

// Define the shape of custom color overrides
interface CustomColors {
  '--color-background'?: string;
  '--color-surface'?: string;
  '--color-surface-soft'?: string;
}

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (name: ThemeName) => void;
  customColors: CustomColors;
  setCustomColor: (key: keyof CustomColors, value: string) => void;
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
    const saved = localStorage.getItem(`${storageKey}_customColors`);
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    // If a user-specific theme is passed, use it and stop listening for global changes.
    if (userTheme && THEMES[userTheme as ThemeName]) {
        setThemeState(userTheme as ThemeName);
        // User-specific themes don't have custom colors in this implementation, so we reset them.
        setCustomColorsState({});
        return; 
    }

    // Only set up listener if no userTheme is provided.
    const themeRef = doc(db, 'settings', storageKey);
    
    const unsubscribe = safeSnapshot(
      themeRef,
      (data: any) => {
        // We use localStorage now
      },
      (docSnap) => {
        return { name: theme, customColors };
      },
      { name: 'royalIndigo', customColors: {} },
      (error) => {
        console.error(`Error listening to theme settings ('${storageKey}'):`, error);
      }
    );

    return () => unsubscribe();
  }, [storageKey, userTheme]);

  useEffect(() => {
    const root = window.document.documentElement;
    
    // 1. Apply the base theme
    const selectedTheme: Theme = THEMES[theme];
    Object.entries(selectedTheme.colors).forEach(([key, value]) => {
      root.style.setProperty(key, String(value));
    });

    // 2. Apply custom color overrides
    Object.entries(customColors).forEach(([key, value]) => {
        if (typeof value === 'string') {
            root.style.setProperty(key, value);
        }
    });

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

  const resetCustomColors = () => {
      setCustomColorsState({});
      localStorage.removeItem(`${storageKey}_customColors`);
      // FIX: Reverted to using FieldValue.delete() to correctly remove the map field in Firestore, aligning with the fix in RootAppearanceScreen.
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