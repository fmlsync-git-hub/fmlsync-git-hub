import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { db, safeSnapshot, doc, setDoc } from '../services/firebase';

export type DateFormat = 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd';
export type TimeFormat = '12-hour' | '24-hour';

export interface DateTimeSettings {
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  timezone: string;
}

interface DateTimeContextType extends DateTimeSettings {
  updateDateTimeSettings: (settings: Partial<DateTimeSettings>) => void;
  timezones: string[];
}

const DateTimeContext = createContext<DateTimeContextType | undefined>(undefined);

const defaultSettings: DateTimeSettings = {
  dateFormat: 'dd/mm/yyyy',
  timeFormat: '12-hour',
  timezone: 'UTC',
};

const STORAGE_KEY = 'dateTimeSettings';

export const DateTimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<DateTimeSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  const timezones = useMemo(() => {
    try {
      // Modern way to get timezones
      // FIX: Cast `Intl` to `any` to bypass the TypeScript error. `supportedValuesOf` is a newer API and may not be in the project's TS lib definitions. The try/catch handles the runtime check.
      return (Intl as any).supportedValuesOf('timeZone');
    } catch (e) {
      // Fallback for older environments that might not support the above
      console.warn('Intl.supportedValuesOf is not available, using a fallback timezone list.');
      return ['UTC', 'GMT', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Australia/Sydney'];
    }
  }, []);

  useEffect(() => {
    // 1. Listen for Real-Time Settings from Firestore
    const unsubscribe = safeSnapshot(
      doc(db, 'settings', 'dateTimeSettings'),
      (data: any) => {
        if (data) {
          setSettings(prev => ({ ...prev, ...data }));
        }
      },
      (snap) => snap.exists() ? snap.data() : null,
      null
    );

    return () => unsubscribe();
  }, []);

  const updateDateTimeSettings = (newSettings: Partial<DateTimeSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    
    // Also call mock setDoc for compatibility
    setDoc(doc(db, 'settings', 'dateTimeSettings'), newSettings, { merge: true })
      .catch(error => console.error("Could not save dateTime settings:", error));
  };

  const value = useMemo(() => ({
    ...settings,
    updateDateTimeSettings,
    timezones
  }), [settings, timezones]);

  return (
    <DateTimeContext.Provider value={value}>
      {children}
    </DateTimeContext.Provider>
  );
};

export const useDateTime = (): DateTimeContextType => {
  const context = useContext(DateTimeContext);
  if (context === undefined) {
    throw new Error('useDateTime must be used within a DateTimeProvider');
  }
  return context;
};