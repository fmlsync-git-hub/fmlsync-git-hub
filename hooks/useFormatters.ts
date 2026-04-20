import React from 'react';
import { useDateTime } from '../context/DateTimeContext';
import { CheckCircleIcon, DocumentWarningIcon, XCircleIcon } from '../components/icons/index';


const toDate = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Date) return date;
    if (date.toDate) return date.toDate(); // Firestore Timestamp
    
    if (typeof date === 'string') {
        // Handle 'YYYY-MM-DD' strings safely, interpreting as local midnight, not UTC midnight.
        const parts = date.split('-').map(Number);
        if (parts.length === 3 && !parts.some(isNaN)) {
            return new Date(parts[0], parts[1] - 1, parts[2]);
        }
        // Fallback for other string formats that JS can parse
        const parsed = new Date(date);
        return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
}

export const getExpiryStatus = (dateString: string): { text: string; colorClass: string; bgClass: string; days: number, icon: React.ReactNode } => {
    if (!dateString) return { text: 'No Date', colorClass: 'text-text-secondary', bgClass: 'bg-surface-soft', days: Infinity, icon: null };
    
    const dateParts = dateString.split('-').map(Number);
    if (dateParts.length !== 3 || dateParts.some(isNaN)) {
        // FIX: Replaced JSX with React.createElement to fix TS errors in a .ts file.
        return { text: 'Invalid Date', colorClass: 'text-danger', bgClass: 'bg-danger/10', days: -Infinity, icon: React.createElement(XCircleIcon, { className: "h-5 w-5" }) };
    }
    const expiryDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);

    const today = new Date();
    today.setHours(0,0,0,0);

    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // FIX: Moved iconClass declaration before it is used to prevent 'used before defined' error.
    const iconClass = "h-5 w-5 inline-block mr-1";
    // FIX: Replaced JSX with React.createElement to fix TS errors in a .ts file.
    if (diffDays < 0) return { text: 'Expired', colorClass: 'text-white', bgClass: 'bg-danger', days: diffDays, icon: React.createElement(XCircleIcon, { className: iconClass }) };
    if (diffDays <= 90) return { text: `Expires in ${diffDays}d`, colorClass: 'text-amber-800', bgClass: 'bg-amber-100', days: diffDays, icon: React.createElement(DocumentWarningIcon, { className: iconClass }) };
    return { text: 'Valid', colorClass: 'text-success', bgClass: 'bg-success/10', days: diffDays, icon: React.createElement(CheckCircleIcon, { className: iconClass }) };
};

export const getFlightStatus = (dateString: string) => {
    const dateParts = dateString.split('-').map(Number);
    if (dateParts.length !== 3 || dateParts.some(isNaN)) {
        return { text: 'Invalid Date', colorClass: 'text-danger', bgClass: 'bg-danger text-white' };
    }
    const travelDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = travelDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { text: 'Completed', colorClass: 'text-text-secondary', bgClass: 'bg-surface' };
    }
    if (diffDays === 0) {
        return { text: 'Today', colorClass: 'text-white', bgClass: 'bg-fuchsia-600' };
    }
    if (diffDays > 0 && diffDays <= 3) {
        return { text: 'Urgent', colorClass: 'text-white', bgClass: 'bg-orange-500' };
    }
    return { text: 'Upcoming', colorClass: 'text-white', bgClass: 'bg-green-600' };
};


// FIX: Changed to a named export to resolve module loading issues across the app.
export const useFormatters = () => {
  const { dateFormat, timeFormat, timezone } = useDateTime();

  const getLocaleForDateFormat = () => {
    switch (dateFormat) {
      case 'mm/dd/yyyy': return 'en-US';
      case 'yyyy-mm-dd': return 'en-CA'; // This locale consistently uses yyyy-mm-dd
      case 'dd/mm/yyyy':
      default:
        return 'en-GB';
    }
  };

  const formatDate = (date: any): string => {
    const dateObj = toDate(date);
    if (!dateObj) return 'N/A';

    try {
      // Check if timezone is valid before using it
      new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
      return dateObj.toLocaleDateString(getLocaleForDateFormat(), { timeZone: timezone });
    } catch (e) {
        console.warn(`Invalid timezone "${timezone}" for formatDate, falling back to local timezone.`, e);
        return dateObj.toLocaleDateString(getLocaleForDateFormat());
    }
  };

  const formatTime = (time: any): string => {
    if (!time || typeof time !== 'string') return '';
    const [hour, minute] = time.split(':').map(Number);
    if (isNaN(hour) || isNaN(minute)) return '';

    const date = new Date();
    date.setHours(hour, minute);

    const options: Intl.DateTimeFormatOptions = {
        hour12: timeFormat === '12-hour',
        hour: '2-digit',
        minute: '2-digit',
    };

    try {
        // Check if timezone is valid before using it, but don't apply it to time-only formatting
        // as it can shift the time, just use it for validation.
        new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
        return date.toLocaleTimeString('en-US', options);
    } catch (e) {
        console.warn(`Invalid timezone "${timezone}" for formatTime, falling back to local timezone.`);
        return date.toLocaleTimeString('en-US', options);
    }
  };


  const formatTimestamp = (date: any): string => {
    const dateObj = toDate(date);
    if (!dateObj) return 'N/A';
    
    const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        hour12: timeFormat === '12-hour',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    };

    try {
        // Check if timezone is valid
        new Intl.DateTimeFormat(getLocaleForDateFormat(), options).format();
        return dateObj.toLocaleString(getLocaleForDateFormat(), options);
    } catch (e) {
        console.warn(`Invalid timezone "${timezone}" for formatTimestamp, falling back to local timezone.`, e);
        // Remove timezone from options for fallback
        const {timeZone, ...fallbackOptions} = options;
        return dateObj.toLocaleString(getLocaleForDateFormat(), fallbackOptions);
    }
  };

  return { formatDate, formatTimestamp, formatTime };
};
