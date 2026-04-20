import { toast } from 'sonner';
import { addInAppNotification, markNotificationAsRead } from './firebase';
import { InAppNotification } from '../types';

export type NotificationType = 
  | 'FLIGHT_24_72_HOURS'
  | 'FLIGHT_6_12_HOURS'
  | 'FLIGHT_0_2_HOURS'
  | 'DOC_EXPIRY_30_90_DAYS'
  | 'DOC_EXPIRY_0_29_DAYS'
  | 'NEW_DOCUMENT'
  | 'FLIGHT_SCHEDULE_CHANGE'
  | 'PROFILE_UPDATE_REQUIRED';

export class NotificationService {
    private static registration: ServiceWorkerRegistration | null = null;
    private static isInitialized = false;

    static async init() {
        if (this.isInitialized) return;
        
        if ('serviceWorker' in navigator) {
            try {
                this.registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered for notifications');
            } catch (err) {
                console.warn('Service Worker registration failed. Background notifications may be limited.', err);
            }
        }
        
        this.isInitialized = true;
    }

    static checkPermission = () => {
        if (!('Notification' in window)) return false;
        return Notification.permission === 'granted';
    };

    static requestPermission = async () => {
        if (!('Notification' in window)) {
            console.warn('This browser does not support desktop notifications.');
            return false;
        }
        
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    };

    /**
     * Shows a browser notification if permissions are granted.
     * Also checks visibility to avoid redundant alerts when tab is focused.
     */
    static showBrowserNotification(title: string, body: string, link?: string) {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }

        // Only show browser alert if the page is hidden (multi-device/background support)
        if (document.visibilityState === 'hidden') {
            const options: NotificationOptions = {
                body,
                icon: '/logo.png',
                badge: '/logo.png',
                tag: 'fml-notification',
                renotify: true,
                data: { link }
            };

            if (this.registration) {
                this.registration.showNotification(title, options);
            } else {
                new Notification(title, options);
            }
        }
    }

    /**
     * Creates a multi-device synced notification in Firestore.
     */
    static async notify(userId: string, title: string, body: string, type: InAppNotification['type'] = 'info', link?: string) {
        // 1. Show local toast immediately if this belongs to current user
        // (Handled by the root listener usually, but we can do it here too)
        
        // 2. Persist to Firestore for Multi-Device Sync
        return await addInAppNotification({
            userId,
            title,
            body,
            type,
            link,
            read: false
        });
    }

    static sendTestNotification = (type: NotificationType, username: string) => {
        this.notify(username, 'Test Notification', `This is a test notification for ${type}.`, 'info');
    };

    static async markAsRead(id: string) {
        return await markNotificationAsRead(id);
    }
}

// Keep legacy exports for compatibility where used, but point to service
export const checkNotificationPermission = NotificationService.checkPermission;
export const requestNotificationPermission = NotificationService.requestPermission;
export const sendTestNotification = (type: NotificationType) => {
    // Note: this legacy version doesn't know the current user easily without context
    console.warn("Legacy sendTestNotification called. Use NotificationService.notify instead.");
};
export const sendNotification = (title: string, body: string, type: string) => {
    toast(title, { description: body });
    NotificationService.showBrowserNotification(title, body);
};
