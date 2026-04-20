
import React, { useState, useEffect } from 'react';
import { useCompanies } from '../../context/CompanyContext';
import { Passenger, ActivityLog, DuplicateAlert } from '../../types';
import { UsersIcon, BuildingOfficeIcon, UserGroupIcon, ClockIcon, ExclamationTriangleIcon } from '../../components/icons';
import { RootScreen } from './RootApp';
import { useFormatters } from '../../hooks/useFormatters';
import { DEFAULT_USERS } from '../../services/users';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType; }> = ({ title, value, icon: Icon }) => (
    <div className="bg-surface p-6 rounded-lg shadow-md border border-border-default">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-text-secondary uppercase tracking-wider">{title}</p>
                <p className="text-3xl font-bold text-text-primary mt-1">{value}</p>
            </div>
            <div className="p-3 rounded-full bg-primary/20 text-primary">
                <Icon className="h-7 w-7" />
            </div>
        </div>
    </div>
);

const RootDashboardScreen: React.FC<{ onNavigate: (screen: RootScreen) => void }> = ({ onNavigate }) => {
    const [passengers, setPassengers] = useState<Passenger[]>([]);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [duplicateAlerts, setDuplicateAlerts] = useState<DuplicateAlert[]>([]);
    const [totalUsers, setTotalUsers] = useState(DEFAULT_USERS.length);
    const [isLoading, setIsLoading] = useState(true);
    const { companies } = useCompanies();
    const { formatTimestamp } = useFormatters();
    
    useEffect(() => {
        // Mock data fetching
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // In a real app, these would be API calls to your new backend
                const mockPassengers: Passenger[] = JSON.parse(localStorage.getItem('fml_passengers') || '[]');
                const mockLogs: ActivityLog[] = [
                    { id: '1', user: 'fmlsync', message: 'Logged in', timestamp: Date.now() - 1000 * 60 * 5 },
                    { id: '2', user: 'admin', message: 'Updated branding', timestamp: Date.now() - 1000 * 60 * 15 },
                ];
                setPassengers(mockPassengers);
                setActivityLogs(mockLogs);
                setDuplicateAlerts([]);
            } catch (error) {
                console.error("Failed to load root dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-text-primary">Root Dashboard</h2>
                <p className="mt-1 text-on-background-secondary">Overall application status and activity overview.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Users" value={totalUsers} icon={UsersIcon} />
                <StatCard title="Total Companies" value={companies.length} icon={BuildingOfficeIcon} />
                <StatCard title="Total Personnel" value={passengers.length} icon={UserGroupIcon} />
            </div>

            {duplicateAlerts.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
                        <div>
                            <p className="font-bold text-red-700 dark:text-red-400">Duplicate Data Detected!</p>
                            <p className="text-sm text-red-600 dark:text-red-300">There are {duplicateAlerts.length} pending duplicate alerts that need your attention.</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => onNavigate('duplicates')}
                        className="w-full sm:w-auto px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-bold shadow-lg"
                    >
                        Resolve Now
                    </button>
                </div>
            )}

            <div className="bg-surface p-6 rounded-lg shadow-md border border-border-default">
                 <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <ClockIcon className="h-6 w-6 text-text-secondary" />
                    Recent Activity
                </h3>
                {isLoading ? <p>Loading logs...</p> : (
                    <div className="space-y-3">
                        {activityLogs.length > 0 ? activityLogs.map(log => (
                            <div key={log.id} className="flex justify-between items-center p-3 bg-surface-soft rounded-md">
                                <div>
                                    <span className="font-semibold text-primary">{log.user}</span>
                                    <span className="text-text-primary"> {log.message}</span>
                                </div>
                                <span className="text-sm text-text-secondary font-mono flex-shrink-0 ml-4">
                                    {formatTimestamp(log.timestamp)}
                                </span>
                            </div>
                        )) : (
                            <p className="text-text-secondary text-center py-8">No recent activity found.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RootDashboardScreen;
