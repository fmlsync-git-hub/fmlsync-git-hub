
// ... existing imports ...
import React, { useState, useEffect, useMemo } from 'react';
import { Passenger, User, UserSettings } from '../../types';
import { listenToPassengersByCompany } from '../../services/firebase';
import { UsersIcon, CheckCircleIcon, MapIcon, ClockIcon, DocumentWarningIcon, ShieldCheckIcon, TicketIcon } from '../../components/icons/index';
import { SearchInput } from '../../components/SearchInput';
import ClientPersonnelDetailModal from '../../components/ClientPersonnelDetailModal';
import { BatchTicketUploadModal } from '../../components/BatchTicketUploadModal';
import { useFormatters, getExpiryStatus } from '../../hooks/useFormatters';
import { determinePassengerStatus } from '../../hooks/usePersonnelStatus';
import { useCompanies } from '../../context/CompanyContext';

// ... existing StatWidget ...
const StatWidget: React.FC<{ 
    title: string; 
    value: string | number; 
    trendLabel?: string;
    trendType?: 'good' | 'bad' | 'neutral';
    icon: React.ElementType; 
}> = ({ title, value, trendLabel, trendType = 'neutral', icon: Icon }) => {
    let trendColor = "text-text-secondary";
    if (trendType === 'good') trendColor = "text-success";
    if (trendType === 'bad') trendColor = "text-danger";

    return (
        <div className="bg-surface p-6 rounded-xl shadow-sm border border-border-default hover:border-primary/50 transition-colors duration-200 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
                <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">{title}</p>
                <div className="p-2 bg-surface-soft rounded-lg text-primary">
                    <Icon className="h-5 w-5" />
                </div>
            </div>
            <div>
                <h3 className="text-4xl font-black text-text-primary leading-none tracking-tight">{value}</h3>
                {trendLabel && <p className={`text-xs font-bold mt-2 uppercase tracking-wide ${trendColor}`}>{trendLabel}</p>}
            </div>
        </div>
    );
};

// ... existing ComplianceBar ...
const ComplianceBar: React.FC<{ label: string; percentage: number }> = ({ label, percentage }) => {
    let colorClass = "bg-primary";
    if (percentage < 80) colorClass = "bg-danger";
    else if (percentage < 95) colorClass = "bg-warning";
    else colorClass = "bg-success";

    return (
        <div className="mb-4 last:mb-0">
            <div className="flex justify-between text-xs mb-1.5 font-bold uppercase tracking-wide">
                <span className="text-text-primary">{label}</span>
                <span className={percentage < 80 ? 'text-danger' : percentage < 95 ? 'text-warning' : 'text-success'}>{percentage}%</span>
            </div>
            <div className="w-full bg-surface-soft rounded-full h-2">
                <div className={`h-2 rounded-full ${colorClass} transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

// ... existing StatusBadge ...
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    let styles = "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    if (status === 'In-Transit') styles = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    else if (status.includes('On-Site') || status.includes('Country')) styles = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    else if (status.includes('Home') || status.includes('Off')) styles = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    
    return (
        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${styles}`}>
            {status}
        </span>
    );
};

interface ClientDashboardScreenProps {
    currentUser: User & UserSettings;
    onAddNew?: () => void;
}

const ClientDashboardScreen: React.FC<ClientDashboardScreenProps> = ({ currentUser, onAddNew }) => {
    const [passengers, setPassengers] = useState<Passenger[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [accessError, setAccessError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);
    const [error, setError] = useState<React.ReactNode | null>(null);
    const [isBatchUploadOpen, setIsBatchUploadOpen] = useState(false);
    const { companies } = useCompanies();
    const { formatDate } = useFormatters();

    const companyName = currentUser.companyId 
        ? companies.find(c => c.id === currentUser.companyId)?.name || currentUser.companyId.toUpperCase()
        : 'Client Portal';

    useEffect(() => {
        setPassengers([]);
        setIsLoading(true);
        setError(null);
        setAccessError(null);

        if (!currentUser.companyId) {
            setIsLoading(false);
            return;
        }
        
        const unsubscribe = listenToPassengersByCompany(
            currentUser.companyId, 
            (companyPassengers) => {
                setPassengers(companyPassengers);
                setIsLoading(false);
            },
            (error) => {
                if (error.code === 'permission-denied') {
                    setAccessError('Permission Denied: Your account does not have access to read company data. Please contact support.');
                }
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [currentUser.companyId]);

    // ... existing analytics logic ...
    const analytics = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const urgentFlightDate = new Date(today);
        urgentFlightDate.setDate(today.getDate() + 7); // Look ahead 7 days

        let stats = {
            totalPersonnel: passengers.length,
            inTransit: 0,
            onSite: 0,
            docHealth: {
                passports: { valid: 0, total: 0 },
                visas: { valid: 0, total: 0 },
            },
            upcomingFlights: [] as { passenger: string, date: string, route: string, timestamp: number }[],
        };

        passengers.forEach(p => {
            let statusInfo;
            try {
                statusInfo = determinePassengerStatus(p);
            } catch (e) {
                console.error("Error determining status for passenger", p, e);
                statusInfo = { status: 'Error', details: 'Error calculating status', sortOrder: 99 };
            }
            if (statusInfo.status === 'In-Transit') stats.inTransit++;
            if (statusInfo.status === 'On-Site' || statusInfo.status === 'In-Country') stats.onSite++;

            // Document Health
            const checkDoc = (dateStr: string, category: 'passports' | 'visas') => {
                stats.docHealth[category].total++;
                const status = getExpiryStatus(dateStr);
                if (status.days > 90) stats.docHealth[category].valid++;
            };

            if ((p.passports || []).length > 0) {
                checkDoc(p.passports[0].dateOfExpiry, 'passports');
            }
            p.visas.forEach(v => checkDoc(v.dateOfExpiry, 'visas'));

            // Flight Watch
            if (statusInfo.relevantFlight) {
                const flightDate = new Date(statusInfo.relevantFlight.travelDate);
                if (flightDate >= today && flightDate <= urgentFlightDate) {
                    const passport = p.passports.length > 0 ? p.passports[0] : null;
                    stats.upcomingFlights.push({
                        passenger: passport ? `${passport.firstNames} ${passport.surname}` : 'Unknown',
                        date: formatDate(statusInfo.relevantFlight.travelDate),
                        route: `${statusInfo.relevantFlight.departureCity} → ${statusInfo.relevantFlight.arrivalCity}`,
                        timestamp: flightDate.getTime()
                    });
                }
            }
        });
        
        stats.upcomingFlights.sort((a,b) => a.timestamp - b.timestamp);

        return stats;
    }, [passengers, formatDate]);

    const filteredPersonnel = useMemo(() => {
        if (!searchQuery.trim()) return passengers;
        const q = searchQuery.toLowerCase();
        return passengers.filter(p => {
            const passport = (p.passports || []).length > 0 ? p.passports[0] : null;
            if (!passport) return false;
            return `${passport.surname} ${passport.firstNames}`.toLowerCase().includes(q) ||
            passport.passportNumber?.toLowerCase().includes(q);
        });
    }, [passengers, searchQuery]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 relative z-10">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-text-secondary">Loading Dashboard...</p>
            </div>
        );
    }
    
    // Critical fix: Show visual error if companyID is missing
    if (!currentUser.companyId) {
        return (
            <div className="flex flex-col items-center justify-center h-96 relative z-10 p-6">
                <div className="p-6 bg-surface border border-danger/50 rounded-xl shadow-lg max-w-md text-center">
                    <DocumentWarningIcon className="w-12 h-12 text-danger mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-text-primary mb-2">Configuration Error</h3>
                    <p className="text-text-secondary mb-4">
                        Your account is not linked to a company profile.
                    </p>
                    <div className="text-xs bg-surface-soft p-2 rounded text-text-secondary font-mono">
                        User: {currentUser.username}<br/>
                        Role: {currentUser.role}
                    </div>
                </div>
            </div>
        );
    }

    if (accessError) {
        return (
            <div className="flex flex-col items-center justify-center h-96 relative z-10 p-6">
                <div className="p-6 bg-surface border border-danger/50 rounded-xl shadow-lg max-w-md text-center">
                    <ShieldCheckIcon className="w-12 h-12 text-danger mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-text-primary mb-2">Access Denied</h3>
                    <p className="text-text-secondary">{accessError}</p>
                </div>
            </div>
        );
    }

    const pptPercent = analytics.docHealth.passports.total === 0 ? 100 : Math.round((analytics.docHealth.passports.valid / analytics.docHealth.passports.total) * 100);
    const visaPercent = analytics.docHealth.visas.total === 0 ? 100 : Math.round((analytics.docHealth.visas.valid / analytics.docHealth.visas.total) * 100);

    return (
        // Added relative z-10 to force layer above background
        <div className="space-y-8 pb-8 relative z-10">
            {/* ... rest of the component (Header, Stats, Tables, Modal) unchanged ... */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border-default pb-6 bg-surface/50 p-4 rounded-xl backdrop-blur-sm">
                <div>
                    <h1 className="text-3xl font-black text-text-primary tracking-tight uppercase">{companyName}</h1>
                    <p className="text-text-secondary font-medium mt-1 tracking-wide text-sm">CLIENT PORTAL DASHBOARD</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-1">Total Personnel</p>
                        <p className="text-4xl font-black text-primary leading-none">{analytics.totalPersonnel}</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setIsBatchUploadOpen(true)}
                            className="px-4 py-3 bg-surface-soft text-text-primary font-bold rounded-xl shadow-md border border-border-default hover:bg-border-default transition-all flex items-center gap-2 uppercase tracking-widest text-xs"
                        >
                            <TicketIcon className="h-4 w-4" />
                            Batch Tickets
                        </button>
                        {onAddNew && (
                            <button 
                                onClick={onAddNew}
                                className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-dark transition-all hover:scale-105 active:scale-95 flex items-center gap-2 uppercase tracking-widest text-xs"
                            >
                                <span className="text-xl">+</span>
                                Add Personnel
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatWidget 
                    title="Active Team" 
                    value={analytics.totalPersonnel} 
                    icon={UsersIcon}
                    trendLabel="Registered Profiles"
                />
                <StatWidget 
                    title="In Transit" 
                    value={analytics.inTransit} 
                    icon={MapIcon}
                    trendLabel={analytics.inTransit > 0 ? "Currently Traveling" : "No Active Travel"}
                    trendType={analytics.inTransit > 0 ? 'good' : 'neutral'}
                />
                <StatWidget 
                    title="On Site / In Country" 
                    value={analytics.onSite} 
                    icon={CheckCircleIcon}
                    trendLabel="Available Workforce"
                    trendType="good"
                />
                <div className="bg-surface p-6 rounded-xl shadow-sm border border-border-default flex flex-col justify-center">
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4">Compliance Health</p>
                    <ComplianceBar label="Passports" percentage={pptPercent} />
                    <ComplianceBar label="Visas" percentage={visaPercent} />
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Personnel Table */}
                <div className="xl:col-span-2 bg-surface rounded-xl shadow-sm border border-border-default flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-border-default flex flex-col sm:flex-row justify-between items-center gap-4 bg-surface-soft/30">
                        <h3 className="font-bold text-text-primary text-lg flex items-center gap-2">
                            <UsersIcon className="h-5 w-5 text-primary" />
                            PERSONNEL STATUS
                        </h3>
                        <div className="w-full sm:w-64">
                            <SearchInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search name, passport..." />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border-default">
                            <thead className="bg-surface-soft">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-black text-text-secondary uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-text-secondary uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-4 text-center text-xs font-black text-text-secondary uppercase tracking-wider">Current Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-black text-text-secondary uppercase tracking-wider">Passport Expiry</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-default bg-surface">
                                {filteredPersonnel.slice(0, 10).map(p => {
                                    let statusInfo;
                                    try {
                                        statusInfo = determinePassengerStatus(p);
                                    } catch (e) {
                                        console.error("Error determining status for passenger", p, e);
                                        statusInfo = { status: 'Error', details: 'Error calculating status', sortOrder: 99 };
                                    }
                                    const passport = (p.passports || []).length > 0 ? p.passports[0] : null;
                                    const pptStatus = passport ? getExpiryStatus(passport.dateOfExpiry) : { text: 'No Passport', colorClass: 'text-text-secondary' };
                                    return (
                                        <tr key={p.id} className="hover:bg-surface-soft/50 transition-colors cursor-pointer group" onClick={() => setSelectedPassenger(p)}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-bold text-text-primary group-hover:text-primary transition-colors text-sm">{passport ? `${passport.surname}, ${passport.firstNames}` : 'Unknown'}</div>
                                                <div className="text-xs text-text-secondary font-mono mt-0.5">{passport ? passport.passportNumber : 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary font-medium">{p.category}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <StatusBadge status={statusInfo.status} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold font-mono">
                                                <span className={pptStatus.colorClass}>{pptStatus.text}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredPersonnel.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-text-secondary">
                                            {passengers.length === 0 
                                                ? (
                                                    <div className="flex flex-col items-center">
                                                        <span>No personnel records found.</span>
                                                        <span className="text-xs mt-2 text-text-secondary/50">
                                                            (Developers: Check browser console for Firestore Index link if new deployment)
                                                        </span>
                                                    </div>
                                                )
                                                : "No personnel found matching your search."
                                            }
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {filteredPersonnel.length > 10 && (
                        <div className="p-3 border-t border-border-default text-center bg-surface-soft/30">
                            <span className="text-xs font-bold text-text-secondary uppercase tracking-wide">Showing top 10 results</span>
                        </div>
                    )}
                </div>

                {/* Right Column: Upcoming Travel */}
                <div className="bg-surface rounded-xl shadow-sm border border-border-default flex flex-col overflow-hidden h-fit">
                    <div className="p-6 border-b border-border-default bg-surface-soft/30">
                        <h3 className="font-bold text-text-primary text-lg flex items-center gap-2">
                            <ClockIcon className="h-5 w-5 text-primary" />
                            UPCOMING TRAVEL
                        </h3>
                        <p className="text-xs text-text-secondary font-bold uppercase tracking-wide mt-1">Next 7 Days</p>
                    </div>
                    
                    <div className="p-0">
                        {analytics.upcomingFlights.length > 0 ? (
                            <div className="divide-y divide-border-default">
                                {analytics.upcomingFlights.map((f, i) => (
                                    <div key={i} className="p-4 flex items-center gap-4 hover:bg-surface-soft/30 transition-colors">
                                        <div className="bg-surface-soft border border-border-default p-2 rounded-lg text-center min-w-[60px]">
                                            <span className="block text-xs font-black text-text-secondary uppercase tracking-wider">{f.date.split('/')[1] || '---'}</span>
                                            <span className="block text-xl font-black text-primary leading-none mt-1">{f.date.split('/')[0]}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-text-primary text-sm truncate">{f.passenger}</p>
                                            <p className="text-xs font-medium text-text-secondary mt-1 flex items-center gap-1">
                                                <span className="truncate">{f.route}</span>
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 px-6">
                                <div className="bg-surface-soft rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                                    <ClockIcon className="h-8 w-8 text-text-secondary opacity-50" />
                                </div>
                                <p className="text-text-secondary font-medium">No flights scheduled for the next 7 days.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ClientPersonnelDetailModal
                isOpen={!!selectedPassenger}
                onClose={() => setSelectedPassenger(null)}
                passenger={selectedPassenger}
            />

            <BatchTicketUploadModal 
                isOpen={isBatchUploadOpen}
                onClose={() => setIsBatchUploadOpen(false)}
                allPassengers={passengers}
                onSuccess={() => {
                    setIsBatchUploadOpen(false);
                }}
            />
        </div>
    );
};

export default ClientDashboardScreen;