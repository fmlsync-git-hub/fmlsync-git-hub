
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Passenger, TicketData, Company, User, UserSettings } from '../types';
import { useDuplicateFilter } from '../hooks/useDuplicateFilter';
import { DuplicateToggle } from '../components/DuplicateToggle';
import { listenToAllPassengers, updatePassenger } from '../services/firebase';
import { useCompanies } from '../context/CompanyContext';
import { TicketIcon, GlobeAltIcon, BuildingOfficeIcon, ClockIcon, CheckBadgeIcon, ChevronDownIcon, QueueListIcon, Bars3Icon, CloudArrowUpIcon, TrashIcon, CheckCircleIcon } from '../components/icons/index';
import { SearchInput } from '../components/SearchInput';
import { EditTicketModal } from '../components/EditTicketModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { BatchTicketUploadModal } from '../components/BatchTicketUploadModal';
import { ManualTicketEntryModal } from '../components/ManualTicketEntryModal';
import { TicketIssuesPanel } from '../components/TicketIssuesPanel';
import { PlusIcon } from '../components/icons/index';
// FIX: Changed to a named import for useFormatters and included getFlightStatus to resolve module loading issue.
import { useFormatters, getFlightStatus } from '../hooks/useFormatters';

// --- Reusable Components ---

const Spinner: React.FC = () => (
    <div className="flex justify-center items-center h-64">
        <div className="flex items-center justify-center space-x-2">
            <div className="h-5 w-5 bg-primary rounded-full animate-pulse [animation-delay:-0.3s]"></div>
            <div className="h-5 w-5 bg-primary rounded-full animate-pulse [animation-delay:-0.15s]"></div>
            <div className="h-5 w-5 bg-primary rounded-full animate-pulse"></div>
        </div>
    </div>
);

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`bg-surface rounded-lg shadow-md border border-border-default ${className || ''}`}>
        {children}
    </div>
);

const Button: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string; variant?: 'primary' | 'secondary' | 'danger' }> = ({ children, onClick, className, variant = 'primary' }) => {
    const baseClasses = `px-3 py-1.5 rounded-md text-sm font-semibold shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2`;
    const variantClasses = {
        primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
        secondary: 'bg-surface-soft text-text-primary hover:bg-border-default focus:ring-primary',
        danger: 'bg-danger text-white hover:bg-red-700 focus:ring-danger'
    };
    return <button onClick={onClick} className={`${baseClasses} ${variantClasses[variant]} ${className}`}>{children}</button>;
};

const DataField: React.FC<{ label: string, value?: string | number | null }> = ({ label, value }) => (
    <div>
        <p className="text-xs font-medium text-text-secondary uppercase">{label}</p>
        <p className="text-base text-text-primary truncate" title={String(value)}>{value || 'N/A'}</p>
    </div>
);


interface Flight {
    passenger: Passenger;
    ticket: TicketData;
}

const CompanyLogo: React.FC<{ company: Company | undefined; className?: string }> = ({ company, className }) => {
    if (!company) return null;
    const LogoComponent = company.logo;
    if (typeof LogoComponent === 'string') {
        return <img src={LogoComponent} alt={`${company.name} logo`} className={className} />;
    }
    return <LogoComponent className={className} title={`${company.name} logo`} />;
};


interface TravelManagementScreenProps {
    currentUser?: User & UserSettings;
}

const getPrimaryPassport = (passenger?: Passenger) => {
    if (!passenger || !passenger.passports || passenger.passports.length === 0) return null;
    return passenger.passports[0];
}

const TravelManagementScreen: React.FC<TravelManagementScreenProps> = ({ currentUser }) => {
    const [passengers, setPassengers] = useState<Passenger[]>([]);
    const { showDuplicates, setShowDuplicates, filterDuplicates, duplicateIds } = useDuplicateFilter();
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'all' | 'issues'>('all');
    const [flightType, setFlightType] = useState<'international' | 'local'>('international');
    const [searchQuery, setSearchQuery] = useState('');
    const { companies } = useCompanies();
    const [view, setView] = useState<'detailed' | 'simple'>(() => {
        return (localStorage.getItem('travel-management-view') as 'detailed' | 'simple') || 'simple';
    });

    useEffect(() => {
        localStorage.setItem('travel-management-view', view);
    }, [view]);

    // State for modals
    const [editingFlight, setEditingFlight] = useState<Flight | null>(null);
    const [deletingFlight, setDeletingFlight] = useState<Flight | null>(null); // Single delete
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Batch Upload Modal
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    
    // Manual Entry Modal
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);

    // Bulk Actions
    const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    
    useEffect(() => {
        setIsLoading(true);
        const unsubscribe = listenToAllPassengers((allPassengers) => {
            setPassengers(allPassengers);
            setIsLoading(false);
        });
        
        return () => unsubscribe();
    }, []);

    const handleDelete = async () => {
        if (!deletingFlight) return;
        setIsDeleting(true);
        const { passenger, ticket } = deletingFlight;
        const newTickets = passenger.tickets.filter(t => t.id !== ticket.id);
        try {
            await updatePassenger(passenger.id, { tickets: newTickets });
            setDeletingFlight(null);
        } catch (err) {
            console.error("Failed to delete ticket:", err);
            // Optionally, set an error message to display to the user
        } finally {
            setIsDeleting(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedTicketIds.size === 0) return;
        setIsDeleting(true);

        try {
            // Group tickets by passenger to batch updates
            const passengerUpdates = new Map<string, TicketData[]>();

            // Find all affected passengers and their remaining tickets
            allFlights.forEach(flight => {
                if (selectedTicketIds.has(flight.ticket.id)) {
                    // This ticket needs to be removed
                    if (!passengerUpdates.has(flight.passenger.id)) {
                        // Initialize with current tickets minus the selected ones
                        passengerUpdates.set(flight.passenger.id, flight.passenger.tickets.filter(t => !selectedTicketIds.has(t.id)));
                    } else {
                        // We already processed this passenger, the logic above covers all tickets for a passenger at once
                        // but since we iterate flights, we might hit the same passenger multiple times.
                        // Actually, filtering `flight.passenger.tickets` once is enough.
                    }
                }
            });

            const promises = Array.from(passengerUpdates.entries()).map(([passengerId, remainingTickets]) => 
                updatePassenger(passengerId, { tickets: remainingTickets })
            );

            await Promise.all(promises);
            setSelectedTicketIds(new Set());
            setIsBulkDeleting(false);

        } catch (error) {
            console.error("Bulk delete failed", error);
            alert("Failed to delete some tickets.");
        } finally {
            setIsDeleting(false);
        }
    };

    const toggleTicketSelection = (ticketId: string) => {
        const newSelection = new Set(selectedTicketIds);
        if (newSelection.has(ticketId)) {
            newSelection.delete(ticketId);
        } else {
            newSelection.add(ticketId);
        }
        setSelectedTicketIds(newSelection);
    };

    const handleSelectAll = (flights: Flight[]) => {
        if (selectedTicketIds.size === flights.length) {
            setSelectedTicketIds(new Set());
        } else {
            setSelectedTicketIds(new Set(flights.map(f => f.ticket.id)));
        }
    };


    const allFlights = useMemo<Flight[]>(() => {
        const basePassengers = filterDuplicates<Passenger>(passengers);
        return basePassengers.flatMap(p => {
            if (!p || !p.tickets) return [];
            return p.tickets.map(t => ({
                passenger: p,
                ticket: t
            }));
        }).filter(flight => flight && flight.ticket && flight.ticket.travelDate);
    }, [passengers, filterDuplicates]);

    const isLocalFlight = (flight: Flight): boolean => {
        const localCities = ['accra', 'takoradi', 'kumasi', 'tamale'];
        const departure = flight.ticket.departureCity?.toLowerCase().trim();
        const arrival = flight.ticket.arrivalCity?.toLowerCase().trim();
        return !!(departure && arrival && localCities.includes(departure) && localCities.includes(arrival));
    };

    const filteredFlightsByType = useMemo(() => {
        if (flightType === 'local') {
            return allFlights.filter(isLocalFlight);
        }
        return allFlights.filter(f => !isLocalFlight(f));
    }, [allFlights, flightType]);

    const upcomingFlights = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return filteredFlightsByType
            .filter(f => {
                if (!f.ticket.travelDate) return false;
                // FIX: Parse date string as local time to avoid timezone issues.
                const dateParts = f.ticket.travelDate.split('-').map(Number);
                if (dateParts.length !== 3 || dateParts.some(isNaN)) return false;
                const travelDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
                return travelDate >= today;
            })
            .sort((a, b) => {
                const partsA = a.ticket.travelDate.split('-').map(Number);
                const dateA = new Date(partsA[0], partsA[1] - 1, partsA[2]);
                const partsB = b.ticket.travelDate.split('-').map(Number);
                const dateB = new Date(partsB[0], partsB[1] - 1, partsB[2]);
                return dateA.getTime() - dateB.getTime();
            });
    }, [filteredFlightsByType]);

    const pastFlights = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return filteredFlightsByType
            .filter(f => {
                if (!f.ticket.travelDate) return false;
                // FIX: Parse date string as local time to avoid timezone issues.
                const dateParts = f.ticket.travelDate.split('-').map(Number);
                if (dateParts.length !== 3 || dateParts.some(isNaN)) return false;
                const travelDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
                return travelDate < today;
            })
            .sort((a, b) => {
                const partsA = a.ticket.travelDate.split('-').map(Number);
                const dateA = new Date(partsA[0], partsA[1] - 1, partsA[2]);
                const partsB = b.ticket.travelDate.split('-').map(Number);
                const dateB = new Date(partsB[0], partsB[1] - 1, partsB[2]);
                return dateB.getTime() - dateA.getTime();
            });
    }, [filteredFlightsByType]);
    
    const allTimeFlights = useMemo(() => {
        return [...filteredFlightsByType].sort((a, b) => {
            const partsA = a.ticket.travelDate.split('-').map(Number);
            const dateA = new Date(partsA[0], partsA[1] - 1, partsA[2]);
            const partsB = b.ticket.travelDate.split('-').map(Number);
            const dateB = new Date(partsB[0], partsB[1] - 1, partsB[2]);
            return dateB.getTime() - dateA.getTime(); // newest first
        });
    }, [filteredFlightsByType]);
    
    const getCompany = (companyId: string): Company | undefined => companies.find(c => c.id === companyId);

    const flightsToDisplay = useMemo(() => {
        let tabFiltered;
        switch (activeTab) {
            case 'upcoming':
                tabFiltered = upcomingFlights;
                break;
            case 'past':
                tabFiltered = pastFlights;
                break;
            case 'all':
                tabFiltered = allTimeFlights;
                break;
            default:
                tabFiltered = [];
        }
        
        if (!searchQuery.trim()) {
            return tabFiltered;
        }

        const lowercasedQuery = searchQuery.toLowerCase();
        return tabFiltered.filter(flight => {
            const passengerName = `${getPrimaryPassport(flight.passenger)?.firstNames || 'Unknown'} ${getPrimaryPassport(flight.passenger)?.surname || 'Unknown'}`;
            return (
                passengerName.toLowerCase().includes(lowercasedQuery) ||
                (flight.ticket.airline || '').toLowerCase().includes(lowercasedQuery) ||
                (flight.ticket.departureCity || '').toLowerCase().includes(lowercasedQuery) ||
                (flight.ticket.arrivalCity || '').toLowerCase().includes(lowercasedQuery)
            );
        });
    }, [activeTab, upcomingFlights, pastFlights, allTimeFlights, searchQuery]);

    const FlightTypeButton: React.FC<{
        type: 'international' | 'local';
        label: string;
        icon: React.FC<React.SVGProps<SVGSVGElement>>;
    }> = ({ type, label, icon: Icon }) => {
        const count = type === 'international' 
            ? allFlights.filter(f => !isLocalFlight(f)).length 
            : allFlights.filter(isLocalFlight).length;
        return (
            <button
                onClick={() => setFlightType(type)}
                className={`flex items-center gap-2 px-3 py-1.5 font-semibold rounded-md text-sm transition-colors ${
                    flightType === type
                    ? 'bg-indigo-500 text-white shadow'
                    : 'text-text-secondary hover:bg-surface-soft'
                }`}
            >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${flightType === type ? 'bg-white/20' : 'bg-surface'}`}>{count}</span>
            </button>
        );
    };

    const TabButton: React.FC<{
        tab: 'upcoming' | 'past' | 'all' | 'issues';
        label: string;
        icon: React.FC<React.SVGProps<SVGSVGElement>>;
    }> = ({ tab, label, icon: Icon }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-3 py-1.5 font-semibold rounded-md text-sm transition-colors ${
                activeTab === tab 
                ? 'bg-primary text-white shadow' 
                : 'text-text-secondary hover:bg-surface-soft'
            }`}
        >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
            {tab !== 'issues' && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${activeTab === tab ? 'bg-white/20' : 'bg-surface'}`}>
                    {tab === 'upcoming' ? upcomingFlights.length : tab === 'past' ? pastFlights.length : allTimeFlights.length}
                </span>
            )}
        </button>
    );

    const FlightListItem: React.FC<{ flight: Flight; onEdit: () => void; onDelete: () => void; }> = ({ flight, onEdit, onDelete }) => {
        const [isExpanded, setIsExpanded] = useState(false);
        const { formatDate } = useFormatters();
        const company = getCompany(flight.passenger.companyId);
        const status = getFlightStatus(flight.ticket.travelDate);
        const passengerName = `${getPrimaryPassport(flight.passenger)?.surname || 'Unknown'}, ${getPrimaryPassport(flight.passenger)?.firstNames || 'Unknown'}`;
        const isSelected = selectedTicketIds.has(flight.ticket.id);

        return (
            <Card className={`p-0 overflow-hidden ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
                <div className="w-full text-left p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-colors">
                    <div className="flex items-center gap-4 flex-grow min-w-0">
                        <div 
                            className="flex-shrink-0 cursor-pointer p-1"
                            onClick={(e) => { e.stopPropagation(); toggleTicketSelection(flight.ticket.id); }}
                        >
                             <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-text-secondary hover:border-primary'}`}>
                                {isSelected && <CheckCircleIcon className="w-4 h-4 text-white" />}
                            </div>
                        </div>
                        <CompanyLogo company={company} className="h-10 w-10 flex-shrink-0" />
                        <div className="min-w-0 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                            <p className="font-bold text-text-primary truncate" title={passengerName}>{passengerName}</p>
                            <p className="text-sm text-text-secondary">{flight.ticket.airline || 'N/A Airline'}</p>
                        </div>
                    </div>
                    <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2 sm:gap-4 flex-shrink-0 sm:ml-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                        <div className="block sm:hidden text-left">
                            <p className="font-mono text-text-primary text-sm">{flight.ticket.departureCity || '???'} &rarr; {flight.ticket.arrivalCity || '???'}</p>
                            <p className="text-sm text-text-secondary">{formatDate(flight.ticket.travelDate)}</p>
                        </div>
                        <div className="hidden sm:block text-right">
                            <p className="font-mono text-text-primary">{flight.ticket.departureCity || '???'} &rarr; {flight.ticket.arrivalCity || '???'}</p>
                            <p className="text-sm text-text-secondary">{formatDate(flight.ticket.travelDate)}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 ${status.bgClass} ${status.colorClass} rounded-full`}>{status.text}</span>
                        <ChevronDownIcon className={`h-5 w-5 text-text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                </div>
                {isExpanded && (
                    <div className="p-4 border-t border-border-default bg-surface-soft/30">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <DataField label="Passenger" value={`${getPrimaryPassport(flight.passenger)?.firstNames || 'Unknown'} ${getPrimaryPassport(flight.passenger)?.surname || 'Unknown'}`} />
                            <DataField label="Company" value={company?.name} />
                            <DataField label="Ticket No." value={flight.ticket.ticketNumber} />
                            <DataField label="Travel Date" value={formatDate(flight.ticket.travelDate)} />
                            <DataField label="Route" value={`${flight.ticket.departureCity || 'N/A'} to ${flight.ticket.arrivalCity || 'N/A'}`} />
                            <DataField label="Airline" value={flight.ticket.airline} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button onClick={onEdit} variant="secondary">Edit</Button>
                            <Button onClick={onDelete} variant="danger">Delete</Button>
                        </div>
                    </div>
                )}
            </Card>
        );
    };
    
    const renderContent = () => {
        if (activeTab === 'issues') {
            return <TicketIssuesPanel allPassengers={passengers} companies={companies} currentUser={currentUser} />;
        }

        if (flightsToDisplay.length === 0) {
            return (
                <div className="text-center py-16 bg-surface rounded-lg border border-border-default">
                     <TicketIcon className="w-12 h-12 text-border-default mx-auto mb-4" />
                     <h3 className="text-xl font-semibold text-text-primary">
                        {searchQuery ? `No flights found for "${searchQuery}"` : `No ${activeTab} ${flightType} flights found.`}
                    </h3>
                     <p className="text-text-secondary mt-1">Check back later or adjust the filters.</p>
                </div>
            );
        }

        if (view === 'simple') {
            const tdBaseClasses = "px-4 py-3 md:px-6 md:py-4 whitespace-nowrap block md:table-cell text-right md:text-left border-b md:border-b-0 border-border-default/50 relative before:content-[attr(data-label)] before:float-left before:font-bold md:before:content-none";
            const isAllSelected = selectedTicketIds.size > 0 && selectedTicketIds.size === flightsToDisplay.length;

            return (
                <div className="bg-transparent md:bg-surface rounded-lg md:shadow-md md:border md:border-border-default overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full table-fixed">
                            <thead className="hidden md:table-header-group bg-surface-soft">
                                <tr>
                                    <th scope="col" className="w-12 px-6 py-3">
                                        <div 
                                            className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${isAllSelected ? 'bg-primary border-primary' : 'border-text-secondary hover:border-primary'}`}
                                            onClick={() => handleSelectAll(flightsToDisplay)}
                                        >
                                            {isAllSelected && <CheckCircleIcon className="w-4 h-4 text-white" />}
                                        </div>
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-[25%]">Passenger</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-[15%]">Company</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-[25%]">Route</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-[15%]">Travel Date</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-[10%]">Status</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider w-[10%]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="block md:table-row-group">
                                {flightsToDisplay.map(flight => {
                                    const company = getCompany(flight.passenger.companyId);
                                    const status = getFlightStatus(flight.ticket.travelDate);
                                    const passengerName = `${getPrimaryPassport(flight.passenger)?.surname || 'Unknown'}, ${getPrimaryPassport(flight.passenger)?.firstNames || 'Unknown'}`;
                                    const isSelected = selectedTicketIds.has(flight.ticket.id);

                                    return (
                                        <tr key={`${flight.passenger.id}-${flight.ticket.id}`} className={`block md:table-row mb-4 md:mb-0 border md:border-b md:border-border-default rounded-lg shadow-sm md:shadow-none ${isSelected ? 'bg-primary/5' : 'bg-surface'}`}>
                                            <td className={`${tdBaseClasses} md:w-12 md:text-center`}>
                                                 <div className="flex items-center gap-2 md:justify-center">
                                                    <span className="md:hidden text-sm font-bold">Select:</span>
                                                    <div 
                                                        className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-text-secondary hover:border-primary'}`}
                                                        onClick={() => toggleTicketSelection(flight.ticket.id)}
                                                    >
                                                        {isSelected && <CheckCircleIcon className="w-4 h-4 text-white" />}
                                                    </div>
                                                 </div>
                                            </td>
                                            <td className={tdBaseClasses} data-label="Passenger">
                                                <p className="font-medium text-text-primary truncate" title={passengerName}>{passengerName}</p>
                                                <p className="text-sm text-text-secondary">{flight.ticket.airline || 'N/A Airline'}</p>
                                            </td>
                                            <td className={tdBaseClasses} data-label="Company">
                                                <div className="flex items-center gap-2 justify-end md:justify-start">
                                                    <CompanyLogo company={company} className="h-6 w-6 hidden md:block" />
                                                    <span className="text-sm text-text-secondary truncate">{company?.name}</span>
                                                </div>
                                            </td>
                                            <td className={`${tdBaseClasses} font-mono text-sm text-text-secondary truncate`} data-label="Route">{flight.ticket.departureCity || '???'} &rarr; {flight.ticket.arrivalCity || '???'}</td>
                                            <td className={`${tdBaseClasses} text-sm text-text-secondary`} data-label="Travel Date">{formatDate(flight.ticket.travelDate)}</td>
                                            <td className={tdBaseClasses} data-label="Status">
                                                <span className={`text-xs font-bold px-2 py-1 ${status.bgClass} ${status.colorClass} rounded-full whitespace-nowrap`}>{status.text}</span>
                                            </td>
                                            <td className={`${tdBaseClasses} text-right text-sm font-medium space-x-2`} data-label="Actions">
                                                <Button onClick={() => setEditingFlight(flight)} variant="secondary" className="!px-2 !py-1 !text-xs">Edit</Button>
                                                <Button onClick={() => setDeletingFlight(flight)} variant="danger" className="!px-2 !py-1 !text-xs">Delete</Button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )
        }
        
        return (
            <div className="space-y-3">
                {flightsToDisplay.map((flight) => (
                    <FlightListItem
                        key={`${flight.passenger.id}-${flight.ticket.id}`}
                        flight={flight}
                        onEdit={() => setEditingFlight(flight)}
                        onDelete={() => setDeletingFlight(flight)}
                    />
                ))}
            </div>
        );
    }

    const { formatDate } = useFormatters();

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-text-primary">Travel Management</h2>
                        <p className="text-text-secondary">View, edit, or delete passenger flight schedules.</p>
                    </div>
                    <div className="flex gap-2">
                        <DuplicateToggle 
                            showDuplicates={showDuplicates} 
                            onToggle={() => setShowDuplicates(!showDuplicates)} 
                            duplicateCount={duplicateIds.size}
                            currentUser={currentUser}
                        />
                        {selectedTicketIds.size > 0 && (
                            <Button onClick={() => setIsBulkDeleting(true)} variant="danger" className="flex items-center gap-2 animate-fadeIn">
                                <TrashIcon className="h-5 w-5" />
                                <span>Delete ({selectedTicketIds.size})</span>
                            </Button>
                        )}
                        <Button onClick={() => setIsManualModalOpen(true)} className="flex items-center gap-2 shadow-lg" variant="secondary">
                            <PlusIcon className="h-5 w-5" />
                            <span>Manual Entry</span>
                        </Button>
                        <Button onClick={() => setIsBatchModalOpen(true)} className="flex items-center gap-2 shadow-lg">
                            <CloudArrowUpIcon className="h-5 w-5" />
                            <span>Batch Upload Tickets</span>
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border-default pb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <FlightTypeButton type="international" label="International" icon={GlobeAltIcon} />
                        <FlightTypeButton type="local" label="Local" icon={BuildingOfficeIcon} />
                    
                        <div className="border-l border-border-default h-6 mx-2 hidden sm:block"></div>

                        <TabButton tab="all" label="All Tickets" icon={TicketIcon} />
                        <TabButton tab="upcoming" label="Upcoming" icon={ClockIcon} />
                        <TabButton tab="past" label="Past" icon={CheckBadgeIcon} />
                        <div className="border-l border-border-default h-6 mx-2 hidden sm:block"></div>
                        <TabButton tab="issues" label="Issues & Uploads" icon={QueueListIcon} />
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="flex-grow sm:flex-grow-0 sm:w-64">
                            <SearchInput 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search flights..."
                            />
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-1 p-1 bg-surface-soft rounded-lg">
                            <button onClick={() => setView('detailed')} className={`p-1.5 rounded-md transition-colors ${view === 'detailed' ? 'bg-primary text-on-primary shadow' : 'text-text-secondary hover:bg-border-default'}`} title="Detailed View">
                                <QueueListIcon className="h-5 w-5" />
                            </button>
                            <button onClick={() => setView('simple')} className={`p-1.5 rounded-md transition-colors ${view === 'simple' ? 'bg-primary text-on-primary shadow' : 'text-text-secondary hover:bg-border-default'}`} title="Simple List View">
                                <Bars3Icon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
                
                {selectedTicketIds.size > 0 && (
                    <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-md flex justify-between items-center animate-slideIn">
                        <span className="font-semibold text-sm">{selectedTicketIds.size} tickets selected</span>
                        <button onClick={() => setSelectedTicketIds(new Set())} className="text-xs hover:underline">Clear Selection</button>
                    </div>
                )}

                {isLoading ? <Spinner /> : renderContent()}
            </div>
            
            <EditTicketModal
                isOpen={!!editingFlight}
                onClose={() => setEditingFlight(null)}
                flight={editingFlight}
                onSave={() => { /* Real-time listener handles updates */ }}
            />
            
            <BatchTicketUploadModal
                isOpen={isBatchModalOpen}
                onClose={() => setIsBatchModalOpen(false)}
                allPassengers={passengers}
                onSuccess={() => {/* Real-time handles update */}}
            />

            <ManualTicketEntryModal
                isOpen={isManualModalOpen}
                onClose={() => setIsManualModalOpen(false)}
                allPassengers={passengers}
                onSuccess={() => {/* Real-time handles update */}}
            />

            <ConfirmationModal
                isOpen={!!deletingFlight}
                onClose={() => setDeletingFlight(null)}
                onConfirm={handleDelete}
                title="Confirm Ticket Deletion"
                confirmText="Delete"
                isConfirming={isDeleting}
            >
                <p>
                  Are you sure you want to delete this ticket for <strong className="text-text-primary">{getPrimaryPassport(deletingFlight?.passenger)?.firstNames || 'Unknown'} {getPrimaryPassport(deletingFlight?.passenger)?.surname || 'Unknown'}</strong>?
                </p>
                <p className="mt-2 text-sm">
                    Route: <strong>{deletingFlight?.ticket.departureCity} &rarr; {deletingFlight?.ticket.arrivalCity}</strong> on <strong>{deletingFlight && formatDate(deletingFlight.ticket.travelDate)}</strong>.
                </p>
                <p className="mt-2 text-sm">This action is permanent and cannot be undone.</p>
            </ConfirmationModal>

             <ConfirmationModal
                isOpen={isBulkDeleting}
                onClose={() => setIsBulkDeleting(false)}
                onConfirm={handleBulkDelete}
                title={`Delete ${selectedTicketIds.size} Tickets`}
                confirmText="Delete All"
                isConfirming={isDeleting}
                confirmVariant="danger"
            >
                <p>
                  Are you sure you want to delete <strong className="text-danger">{selectedTicketIds.size} selected tickets</strong>?
                </p>
                <p className="mt-2 text-sm">This action will remove flight data from multiple passenger profiles permanently and cannot be undone.</p>
            </ConfirmationModal>
        </>
    );
};

export default TravelManagementScreen;
