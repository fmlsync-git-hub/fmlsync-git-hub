import React, { useState, useEffect } from 'react';
import { getAllPassengers, getUsers } from '../services/firebase';
import { Passenger, User } from '../types';
import { ChartBarIcon } from '../components/icons';

interface OfficerStats {
    username: string;
    totalEntries: number;
    dailyEntries: number;
}

const Spinner: React.FC = () => (
    <div className="flex justify-center items-center py-16">
        <div className="flex items-center justify-center space-x-2">
            <div className="h-5 w-5 bg-primary rounded-full animate-pulse [animation-delay:-0.3s]"></div>
            <div className="h-5 w-5 bg-primary rounded-full animate-pulse [animation-delay:-0.15s]"></div>
            <div className="h-5 w-5 bg-primary rounded-full animate-pulse"></div>
        </div>
    </div>
);

const PerformanceScreen: React.FC = () => {
    const [stats, setStats] = useState<OfficerStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [passengers, users] = await Promise.all([
                    getAllPassengers(),
                    getUsers(),
                ]);
                
                const officers = users.filter(u => u.role === 'officer');
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const calculatedStats: OfficerStats[] = officers.map(officer => {
                    const officerEntries = passengers.filter(p => p.createdBy === officer.username);
                    
                    const dailyEntries = officerEntries.filter(p => {
                        if (!p.createdAt?.toDate) return false;
                        const createdAtDate = p.createdAt.toDate();
                        createdAtDate.setHours(0, 0, 0, 0);
                        return createdAtDate.getTime() === today.getTime();
                    }).length;

                    return {
                        username: officer.username,
                        totalEntries: officerEntries.length,
                        dailyEntries: dailyEntries,
                    };
                });
                
                // Sort by total entries descending
                calculatedStats.sort((a, b) => b.totalEntries - a.totalEntries);

                setStats(calculatedStats);
            } catch (err) {
                console.error("Failed to calculate performance stats:", err);
                setError("Could not load performance data. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, []);

    const renderContent = () => {
        if (isLoading) return <Spinner />;
        if (error) return <p className="text-center py-16 text-danger">{error}</p>;
        if (stats.length === 0) {
            return (
                 <div className="text-center py-16 text-text-secondary bg-surface rounded-lg shadow-md border border-border-default">
                    <ChartBarIcon className="w-12 h-12 text-border-default mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-text-primary">No Officer Data Found</h3>
                    <p className="text-text-secondary mt-1">There are no 'Officer' accounts to display performance for.</p>
                </div>
            );
        }

        return (
            <div className="bg-surface rounded-lg shadow-md border border-border-default overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border-default">
                        <thead className="bg-surface-soft">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Officer</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Total Entries</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Entries Today</th>
                            </tr>
                        </thead>
                        <tbody className="bg-surface divide-y divide-border-default">
                            {stats.map(officerStat => (
                                <tr key={officerStat.username} className="hover:bg-surface-soft transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-text-primary">{officerStat.username}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary font-semibold">{officerStat.totalEntries}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary font-semibold">{officerStat.dailyEntries}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-text-primary">Officer Performance</h2>
                <p className="mt-1 text-text-secondary">Track the number of personnel entries made by each officer.</p>
            </div>
            {renderContent()}
        </div>
    );
};

export default PerformanceScreen;