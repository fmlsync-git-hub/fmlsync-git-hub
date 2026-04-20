import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    Bell, 
    BellOff, 
    CheckCircle, 
    AlertTriangle, 
    Info, 
    Mail,
    Check,
    Trash2,
    Clock,
    X
} from 'lucide-react';
import { listenToUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '../services/firebase';
import { NotificationService } from '../services/notificationService';
import { InAppNotification, User } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface NotificationCenterProps {
    currentUser: User;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ currentUser }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<InAppNotification[]>([]);
    const [isNotificationEnabled, setIsNotificationEnabled] = useState(NotificationService.checkPermission());
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 1. Listen for new notifications
    useEffect(() => {
        if (!currentUser?.username) return;

        const unsubscribe = listenToUserNotifications(currentUser.username, (newNotifications) => {
            // Check for new unread notifications compared to previous state to trigger browser alerts
            const previousUnreadIds = new Set(notifications.filter(n => !n.read).map(n => n.id));
            
            newNotifications.forEach(notif => {
                if (!notif.read && !previousUnreadIds.has(notif.id)) {
                    // This is a "new" unread notification
                    // Filter out very old ones that might just be loading for the first time
                    const secondsAgo = (Date.now() - (notif.timestamp?.toMillis?.() || Date.now())) / 1000;
                    if (secondsAgo < 60) {
                         NotificationService.showBrowserNotification(notif.title, notif.body, notif.link);
                    }
                }
            });

            setNotifications(newNotifications);
            setUnreadCount(newNotifications.filter(n => !n.read).length);
        });

        return () => unsubscribe();
    }, [currentUser?.username, notifications]);

    // Cleanup dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleTogglePermission = async () => {
        const granted = await NotificationService.requestPermission();
        setIsNotificationEnabled(granted);
        if (granted) {
            toast.success('Browser notifications enabled');
        }
    };

    const handleMarkAsRead = async (id: string) => {
        await markNotificationAsRead(id);
    };

    const handleMarkAllAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
        if (unreadIds.length > 0) {
            await markAllNotificationsAsRead(currentUser.username, unreadIds);
            toast.success('All notifications marked as read');
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await deleteNotification(id);
    };

    const getTypeIcon = (type: InAppNotification['type']) => {
        switch (type) {
            case 'success': return <CheckCircle className="h-5 w-5 text-success" />;
            case 'warning': return <AlertTriangle className="h-5 w-5 text-warning" />;
            case 'error': return <AlertTriangle className="h-5 w-5 text-danger" />;
            case 'message': return <Mail className="h-5 w-5 text-primary" />;
            default: return <Info className="h-5 w-5 text-info" />;
        }
    };

    const handleNotificationClick = (notif: InAppNotification) => {
        if (!notif.read) {
            handleMarkAsRead(notif.id);
        }
        if (notif.link) {
            window.location.hash = notif.link;
            setIsOpen(false);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded-full transition-all relative ${isOpen ? 'bg-primary/10 text-primary' : 'text-on-header hover:bg-on-header/5'}`}
            >
                {isNotificationEnabled ? <Bell className="h-6 w-6" /> : <BellOff className="h-6 w-6 opacity-50" />}
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white ring-2 ring-header">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface rounded-xl shadow-2xl border border-border-default z-[100] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 bg-surface-soft border-b border-border-default flex justify-between items-center">
                            <h3 className="font-bold text-text-primary">Notifications</h3>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={handleMarkAllAsRead}
                                    className="text-xs text-primary hover:underline font-semibold"
                                >
                                    Mark all read
                                </button>
                                <button 
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 hover:bg-border-default rounded-md lg:hidden"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="max-h-[400px] overflow-y-auto divide-y divide-border-default">
                            {notifications.length === 0 ? (
                                <div className="p-10 text-center text-text-secondary flex flex-col items-center gap-3">
                                    <Bell className="h-10 w-10 opacity-20" />
                                    <p>No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map((notif) => (
                                    <div 
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`px-4 py-3 flex gap-3 hover:bg-surface-soft transition-colors cursor-pointer relative group ${!notif.read ? 'bg-primary/5' : ''}`}
                                    >
                                        <div className="mt-1 shrink-0">
                                            {getTypeIcon(notif.type)}
                                        </div>
                                        <div className="flex-1 space-y-1 overflow-hidden">
                                            <div className="flex justify-between items-start">
                                                <h4 className={`text-sm font-bold truncate ${!notif.read ? 'text-primary' : 'text-text-primary'}`}>
                                                    {notif.title}
                                                </h4>
                                                <span className="text-[10px] text-text-secondary whitespace-nowrap flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {notif.timestamp ? formatDistanceToNow(notif.timestamp?.toMillis?.() || Date.now(), { addSuffix: true }) : 'Just now'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-text-secondary line-clamp-2">
                                                {notif.body}
                                            </p>
                                        </div>
                                        
                                        {!notif.read && (
                                            <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
                                        )}

                                        <button 
                                            onClick={(e) => handleDelete(e, notif.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-text-secondary hover:text-danger transition-all hover:bg-danger/10 rounded-md"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer / Permission Toggle */}
                        <div className="p-3 bg-surface-soft border-t border-border-default">
                            <button
                                onClick={handleTogglePermission}
                                className={`w-full py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${isNotificationEnabled ? 'bg-success/10 text-success border border-success/20' : 'bg-primary text-white hover:bg-primary-dark shadow-sm'}`}
                            >
                                {isNotificationEnabled ? (
                                    <><Check className="h-4 w-4" /> System Alerts Enabled</>
                                ) : (
                                    <><Bell className="h-4 w-4" /> Enable Browser Alerts</>
                                )}
                            </button>
                            {!isNotificationEnabled && (
                                <p className="text-[10px] text-text-secondary mt-2 text-center">
                                    Get alerts even when you're away from the dashboard.
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
