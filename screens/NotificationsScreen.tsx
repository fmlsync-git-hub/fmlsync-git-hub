import React, { useState, useEffect } from 'react';
import { AutomatedNotificationLog } from '../types';
import { listenToNotificationLogs } from '../services/firebase';
import { BellIcon, CheckCircleIcon, DocumentWarningIcon, InformationCircleIcon } from '../components/icons/index';
// FIX: Changed to a named import for useFormatters to resolve module loading issue.
import { useFormatters } from '../hooks/useFormatters';

const Spinner: React.FC = () => (
    <div className="flex justify-center items-center py-10">
        <div className="flex items-center justify-center space-x-1.5">
            <div className="h-2 w-2 bg-primary rounded-full animate-pulse [animation-delay:-0.3s]"></div>
            <div className="h-2 w-2 bg-primary rounded-full animate-pulse [animation-delay:-0.15s]"></div>
            <div className="h-2 w-2 bg-primary rounded-full animate-pulse"></div>
        </div>
        <span className="ml-3 text-sm text-text-secondary">Loading logs...</span>
    </div>
);

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`bg-surface rounded-lg shadow-md border border-border-default ${className || ''}`}>
        {children}
    </div>
);

const getLogIcon = (status: AutomatedNotificationLog['status']) => {
    switch(status) {
        case 'success': return <CheckCircleIcon className="h-5 w-5 text-success" />;
        case 'warning': return <DocumentWarningIcon className="h-5 w-5 text-warning" />;
        case 'error': return <BellIcon className="h-5 w-5 text-danger" />;
        case 'info':
        default: return <InformationCircleIcon className="h-5 w-5 text-info" />;
    }
};

const NotificationsScreen: React.FC = () => {
    const [logs, setLogs] = useState<AutomatedNotificationLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { formatTimestamp } = useFormatters();

    useEffect(() => {
        setIsLoading(true);
        const unsubscribe = listenToNotificationLogs(100, (newLogs) => {
            setLogs(newLogs);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);
    
    const lastCheckTime = logs.length > 0 ? formatTimestamp(logs[0].timestamp) : 'Never';

    return (
        <div className="space-y-6">
             <div>
                <h2 className="text-3xl font-bold text-text-primary">Automated Notifications</h2>
                <p className="mt-1 text-text-secondary">This is a live log of the automated notification system that runs once every 24 hours.</p>
            </div>

            <Card className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-text-primary">System Status</h3>
                    <div className="text-right">
                        <p className="text-sm text-text-secondary">Last Automated Check</p>
                        <p className="font-semibold text-text-primary">{lastCheckTime}</p>
                    </div>
                </div>
            </Card>

            <Card>
                <div className="p-4 border-b border-border-default">
                     <h3 className="text-lg font-semibold text-text-primary">Activity Log</h3>
                     <p className="text-sm text-text-secondary">Showing the latest 100 entries from the notification service.</p>
                </div>
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    {isLoading ? <Spinner /> : logs.length > 0 ? (
                        <div className="space-y-3">
                            {logs.map(log => (
                                <div key={log.id} className="flex items-start gap-3 text-sm">
                                    <div className="pt-1 flex-shrink-0">{getLogIcon(log.status)}</div>
                                    <div className="min-w-0">
                                        <p className="text-text-primary break-words">{log.message}</p>
                                        <p className="text-xs text-text-secondary">{formatTimestamp(log.timestamp)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center py-10 text-text-secondary">No logs found. The automated system may not have run yet.</p>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default NotificationsScreen;
