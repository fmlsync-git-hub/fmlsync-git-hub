import React, { useState, useEffect, useCallback } from 'react';
import { ActivityLog, User, UserSettings } from '../../types';
import { ClockIcon } from '../../components/icons';
import { useFormatters } from '../../hooks/useFormatters';

const Spinner: React.FC = () => (
    <div className="flex justify-center items-center py-16">
        <div className="flex items-center justify-center space-x-2">
            <div className="h-5 w-5 bg-primary rounded-full animate-pulse [animation-delay:-0.3s]"></div>
            <div className="h-5 w-5 bg-primary rounded-full animate-pulse [animation-delay:-0.15s]"></div>
            <div className="h-5 w-5 bg-primary rounded-full animate-pulse"></div>
        </div>
    </div>
);

interface ActivityLogsScreenProps {
    currentUser: User & UserSettings;
}

const ActivityLogsScreen: React.FC<ActivityLogsScreenProps> = ({ currentUser }) => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { formatTimestamp } = useFormatters();

    useEffect(() => {
        setIsLoading(true);
        setError(null);
        
        const fetchData = async () => {
            try {
                // Mock logs
                const mockLogs: ActivityLog[] = [
                    { id: '1', user: 'fmlsync', message: 'Logged in', timestamp: Date.now() - 1000 * 60 * 5 },
                    { id: '2', user: 'admin', message: 'Updated branding', timestamp: Date.now() - 1000 * 60 * 15 },
                ];
                setLogs(mockLogs);
                setIsLoading(false);
            } catch (e) {
                console.error("Error loading logs:", e);
                setError("Could not load activity logs.");
                setIsLoading(false);
            }
        };

        fetchData();
    }, [currentUser]);
    
    const renderContent = () => {
        if (isLoading) return <Spinner />;
        if (error) return <p className="text-center py-16 text-danger">{error}</p>;
        if (logs.length === 0) {
            return (
                <div className="text-center py-16 text-text-secondary bg-surface rounded-lg shadow-md border border-border-default">
                    <ClockIcon className="w-12 h-12 text-border-default mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-text-primary">No Activity Found</h3>
                    <p className="text-text-secondary mt-1">User actions will be logged and displayed here.</p>
                </div>
            );
        }

        return (
            <div className="bg-transparent md:bg-surface rounded-lg md:shadow-md md:border md:border-border-default overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="hidden md:table-header-group bg-surface-soft">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Timestamp</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">User</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="block md:table-row-group">
                            {logs.map(log => {
                                const tdBaseClasses = "px-4 py-3 md:px-6 md:py-4 block md:table-cell text-right md:text-left border-b md:border-b-0 border-border-default/50 relative before:content-[attr(data-label)] before:float-left before:font-bold md:before:content-none";
                                return (
                                <tr key={log.id} className="block md:table-row mb-4 md:mb-0 border md:border-b md:border-border-default rounded-lg shadow-sm md:shadow-none bg-surface">
                                    <td className={`${tdBaseClasses} text-sm text-text-secondary font-mono`} data-label="Timestamp">{formatTimestamp(log.timestamp)}</td>
                                    <td className={`${tdBaseClasses} text-sm font-semibold text-primary`} data-label="User">{log.user}</td>
                                    <td className={`${tdBaseClasses} text-sm text-text-primary`} data-label="Action">{log.message}</td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-text-primary">Activity Logs</h2>
                    <p className="mt-1 text-text-secondary">A record of user actions performed within the application.</p>
                </div>
            </div>
            {renderContent()}
        </div>
    );
};

export default ActivityLogsScreen;
