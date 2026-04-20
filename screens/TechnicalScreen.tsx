import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LinkIcon, TrashIcon, XMarkIcon, ChartBarIcon, ChevronDownIcon, TicketIcon, EnvelopeIcon, PhoneIcon, WhatsappIcon, ChatBubbleLeftEllipsisIcon } from '../components/icons/index';
import { db, listenToAllPassengers, getUsers, updatePassenger, listenToTechnicalLinks, doc, onSnapshot, setDoc } from '../services/firebase';
import { Passenger, User, Company, TicketData, TicketStatus } from '../types';
import { useCompanies } from '../context/CompanyContext';
// FIX: Changed to a named import for useFormatters to resolve module loading issue.
import { useFormatters } from '../hooks/useFormatters';
import { CollapsibleCard } from '../components/CollapsibleCard';
import { ConfirmationModal } from '../components/ConfirmationModal';

// --- Reusable Components ---
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`bg-surface rounded-lg shadow-md border border-border-default transition-all duration-300 ${className || ''}`}>
        {children}
    </div>
);

type ButtonVariant = 'primary' | 'secondary' | 'danger';
const Button: React.FC<{ children: React.ReactNode; onClick?: (e?: React.MouseEvent) => void; className?: string; type?: 'button'|'submit'|'reset', disabled?: boolean; variant?: ButtonVariant }> = ({ children, onClick, className, type = 'button', disabled = false, variant = 'primary' }) => {
    const baseClasses = `px-4 py-2 rounded-md font-semibold shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2`;
    const variantClasses = {
        primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
        secondary: 'bg-surface-soft text-text-primary hover:bg-border-default focus:ring-primary',
        danger: 'bg-danger text-white hover:bg-red-700 focus:ring-danger'
    };
    const disabledClasses = disabled ? 'bg-neutral-600 text-neutral-400 cursor-not-allowed' : '';
    return <button type={type} onClick={onClick} disabled={disabled} className={`${baseClasses} ${variantClasses[variant]} ${className}`}>{children}</button>;
};

const Spinner: React.FC = () => (
    <div className="flex justify-center items-center py-16">
        <div className="flex items-center justify-center space-x-2">
            <div className="h-5 w-5 bg-primary rounded-full animate-pulse [animation-delay:-0.3s]"></div>
            <div className="h-5 w-5 bg-primary rounded-full animate-pulse [animation-delay:-0.15s]"></div>
            <div className="h-5 w-5 bg-primary rounded-full animate-pulse"></div>
        </div>
    </div>
);


interface TechnicalLink {
    id: string;
    name: string;
    url: string;
}

interface OfficerStats {
    username: string;
    totalEntries: number;
    dailyEntries: number;
    entries: Passenger[];
}

interface Flight {
    passenger: Passenger;
    ticket: TicketData;
}

const ContactButton: React.FC<{ href?: string; title: string; icon: React.ElementType; }> = ({ href, title, icon: Icon }) => {
    const enabled = !!href;
    const Component = enabled ? 'a' : 'button';
    return (
        <Component
            href={enabled ? href : undefined}
            target={enabled ? '_blank' : undefined}
            rel={enabled ? 'noopener noreferrer' : undefined}
            title={title}
            // @ts-ignore
            disabled={!enabled}
            className="p-2 text-text-secondary rounded-full transition-colors enabled:hover:bg-primary/10 enabled:hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <Icon className="h-5 w-5" />
        </Component>
    );
};

const BookingStatusTicketList: React.FC<{ flights: Flight[]; companies: Company[] }> = ({ flights, companies }) => {
    const getCompanyName = (companyId: string): string => companies.find(c => c.id === companyId)?.name || 'Unknown';
    const cleanPhoneNumber = (num: string = '') => num.replace(/[^0-9]/g, '');

    return (
        <div className="space-y-3">
            {flights.map(({ passenger, ticket }) => {
                const phone = cleanPhoneNumber(passenger.contactData.phone);
                return (
                    <div key={ticket.id} className="p-3 bg-surface rounded-md border border-border-default flex flex-col sm:flex-row justify-between items-start gap-3">
                        <div className="flex-grow">
                            <p className="font-semibold text-text-primary">{passenger.passports && passenger.passports.length > 0 ? `${passenger.passports[0].firstNames} ${passenger.passports[0].surname}` : 'Unknown'}</p>
                            <p className="text-sm text-text-secondary">{getCompanyName(passenger.companyId)}</p>
                            <p className="text-sm text-text-secondary font-mono mt-1">{ticket.departureCity} &rarr; {ticket.arrivalCity}</p>
                        </div>
                        <div className="flex items-center gap-1 self-end sm:self-center">
                            <ContactButton href={passenger.contactData.email ? `mailto:${passenger.contactData.email}` : undefined} title="Send Email" icon={EnvelopeIcon} />
                            <ContactButton href={phone ? `https://wa.me/${phone}` : undefined} title="Send WhatsApp" icon={WhatsappIcon} />
                            <ContactButton href={phone ? `tel:${phone}` : undefined} title="Call Phone" icon={PhoneIcon} />
                            <ContactButton href={phone ? `sms:${phone}` : undefined} title="Send SMS" icon={ChatBubbleLeftEllipsisIcon} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


const TechnicalScreen: React.FC = () => {
    // --- Link State ---
    const [links, setLinks] = useState<TechnicalLink[]>([]);
    const [newLinkName, setNewLinkName] = useState('');
    const [newLinkUrl, setNewLinkUrl] = useState('');
    const [linkError, setLinkError] = useState('');
    const [isFormVisible, setIsFormVisible] = useState(false);

    // --- Performance State ---
    const [stats, setStats] = useState<OfficerStats[]>([]);
    const [passengers, setPassengers] = useState<Passenger[]>([]);
    const [isStatsLoading, setIsStatsLoading] = useState(true);
    const [statsError, setStatsError] = useState<string | null>(null);
    const [expandedOfficer, setExpandedOfficer] = useState<string | null>(null);
    const { companies } = useCompanies();
    const { formatTimestamp } = useFormatters();
    
    // Accordion State
    const [expandedPanel, setExpandedPanel] = useState<'weblinks' | 'booking' | 'entries' | null>(null);
    const handleTogglePanel = (panel: 'weblinks' | 'booking' | 'entries') => {
        setExpandedPanel(prev => (prev === panel ? null : panel));
    };
    
    // Booking Status State
    const [expandedStatus, setExpandedStatus] = useState<TicketStatus | null>(null);
    const [isDeleteOnHoldModalOpen, setIsDeleteOnHoldModalOpen] = useState(false);
    const [isDeletingOnHold, setIsDeletingOnHold] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);
    const handleStatusClick = (status: TicketStatus) => {
        setExpandedStatus(prev => prev === status ? null : status);
    };


    // --- Link useEffect ---
    useEffect(() => {
        const unsubscribe = listenToTechnicalLinks(setLinks);
        return () => unsubscribe();
    }, []);

    // --- Performance and Passenger Data useEffect ---
    useEffect(() => {
        setIsStatsLoading(true);
        setStatsError(null);

        const processData = (passengersData: Passenger[], users: User[]) => {
            const officers = users.filter(u => u.role === 'officer');
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const calculatedStats: OfficerStats[] = officers.map(officer => {
                const officerEntries = passengersData.filter(p => p.createdBy === officer.username);
                
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
                    entries: officerEntries.sort((a,b) => b.createdAt.toDate() - a.createdAt.toDate()),
                };
            });
            
            calculatedStats.sort((a, b) => b.totalEntries - a.totalEntries);
            setStats(calculatedStats);
        };

        let unsubscribe: (() => void) | undefined;
        const fetchData = async () => {
            try {
                const users = await getUsers();
                
                unsubscribe = listenToAllPassengers((passengersData) => {
                    setPassengers(passengersData); // For booking status component
                    processData(passengersData, users); // For performance stats
                    setIsStatsLoading(false); // Set loading to false once first data comes in
                });

            } catch (err) {
                console.error("Failed to fetch initial user data or set up listener:", err);
                setStatsError("Could not load performance data. Please try again.");
                setIsStatsLoading(false);
            }
        };

        fetchData();

        // Cleanup subscription on unmount
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []);
    
    const bookingStatusStats = useMemo(() => {
        const stats: { [key in TicketStatus]: Flight[] } = {
            'Reserved': [],
            'Pending confirmation': [],
            'Issued': [],
            'on-hold': [],
        };

        passengers.forEach(p => {
            p.tickets.forEach(t => {
                const flight = { passenger: p, ticket: t };
                const status = t.status || 'Issued'; // Default to 'Issued'
                if (stats[status]) {
                    stats[status].push(flight);
                }
            });
        });
        return stats;
    }, [passengers]);


    // --- Handlers ---
    const showMessage = (setter: React.Dispatch<React.SetStateAction<string | null>>, message: string) => {
        setter(message);
        setTimeout(() => setter(null), 4000);
    };

    const handleDeleteOnHoldTickets = async () => {
        setIsDeletingOnHold(true);
        setActionError(null);
        setActionSuccess(null);

        try {
            const passengersToUpdate = passengers.filter(p =>
                p.tickets.some(t => t.status === 'on-hold')
            );

            if (passengersToUpdate.length === 0) {
                showMessage(setActionSuccess, 'No on-hold tickets found to delete.');
                setIsDeleteOnHoldModalOpen(false);
                setIsDeletingOnHold(false);
                return;
            }

            const updatePromises: Promise<void>[] = [];

            passengersToUpdate.forEach(passenger => {
                const updatedTickets = passenger.tickets.filter(t => t.status !== 'on-hold');
                updatePromises.push(updatePassenger(passenger.id, { tickets: updatedTickets }));
            });

            await Promise.all(updatePromises);

            showMessage(setActionSuccess, `Successfully deleted ${bookingStatusStats['on-hold'].length} on-hold ticket(s).`);

        } catch (err) {
            console.error("Failed to delete on-hold tickets:", err);
            showMessage(setActionError, err instanceof Error ? err.message : 'Failed to delete on-hold tickets.');
        } finally {
            setIsDeletingOnHold(false);
            setIsDeleteOnHoldModalOpen(false);
        }
    };


    const handleAddLink = (e: React.FormEvent) => {
        e.preventDefault();
        setLinkError('');
        if (!newLinkName.trim() || !newLinkUrl.trim()) {
            setLinkError('Both link name and URL are required.');
            return;
        }

        try {
            new URL(newLinkUrl);
        } catch (_) {
            setLinkError('Please enter a valid URL (e.g., https://example.com).');
            return;
        }

        const newLink: TechnicalLink = {
            id: Date.now().toString(),
            name: newLinkName.trim(),
            url: newLinkUrl.trim(),
        };

        const updatedLinks = [...links, newLink].sort((a, b) => a.name.localeCompare(b.name));
        setDoc(doc(db, 'settings', 'technicalLinks'), { list: updatedLinks })
            .then(() => {
                setNewLinkName('');
                setNewLinkUrl('');
                setIsFormVisible(false); // Close form on success
            })
            .catch(err => {
                console.error("Failed to save new link:", err);
                setLinkError("Could not save the link.");
            });
    };

    const handleDeleteLink = (id: string) => {
        const updatedLinks = links.filter(link => link.id !== id);
        setDoc(doc(db, 'settings', 'technicalLinks'), { list: updatedLinks })
            .catch(err => {
                console.error("Failed to delete link:", err);
                setLinkError("Could not delete the link.");
            });
    };
    
    // --- Performance Handlers & Helpers ---
    const toggleExpand = (username: string) => {
        setExpandedOfficer(prev => (prev === username ? null : username));
    };

    const getCompanyName = (companyId: string): string => companies.find(c => c.id === companyId)?.name || 'Unknown';

    const inputClasses = "p-2 border border-border-default bg-background rounded-md text-text-primary placeholder:text-text-secondary focus:ring-1 focus:ring-primary focus:outline-none w-full";
    
    const renderEntriesDoneContent = () => {
        if (isStatsLoading) return <Spinner />;
        if (statsError) return <p className="text-center py-16 text-danger">{statsError}</p>;
        if (stats.length === 0) {
            return (
                 <div className="text-center py-16 text-text-secondary">
                    <ChartBarIcon className="w-12 h-12 text-border-default mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-text-primary">No Officer Data Found</h3>
                    <p className="text-text-secondary mt-1">There are no 'Officer' accounts to display performance for.</p>
                </div>
            );
        }

        return (
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="hidden md:table-header-group bg-surface-soft">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Officer</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Total Entries</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Entries Today</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Expand</span></th>
                        </tr>
                    </thead>
                    <tbody className="block md:table-row-group">
                        {stats.map(officerStat => {
                            const tdBaseClasses = "px-4 py-3 md:px-6 md:py-4 whitespace-nowrap block md:table-cell text-right md:text-left border-b md:border-b-0 border-border-default/50 relative before:content-[attr(data-label)] before:float-left before:font-bold md:before:content-none";
                            
                            return (
                            <React.Fragment key={officerStat.username}>
                                <tr onClick={() => toggleExpand(officerStat.username)} className="block md:table-row mb-4 md:mb-0 border md:border-b md:border-border-default rounded-lg shadow-sm md:shadow-none bg-surface hover:bg-surface-soft/50 transition-colors cursor-pointer">
                                    <td className={tdBaseClasses} data-label="Officer"><span className="font-medium text-text-primary">{officerStat.username}</span></td>
                                    <td className={`${tdBaseClasses} text-sm text-text-primary font-semibold`} data-label="Total Entries">{officerStat.totalEntries}</td>
                                    <td className={`${tdBaseClasses} text-sm text-text-primary font-semibold`} data-label="Entries Today">{officerStat.dailyEntries}</td>
                                    <td className={`${tdBaseClasses} text-right`} data-label="">
                                        <ChevronDownIcon className={`h-5 w-5 text-text-secondary transition-transform inline-block ${expandedOfficer === officerStat.username ? 'rotate-180' : ''}`} />
                                    </td>
                                </tr>
                                {expandedOfficer === officerStat.username && (
                                    <tr className="block md:table-row">
                                        <td colSpan={4} className="block md:table-cell p-4 bg-surface-soft/30 -mt-4 mb-4 md:mt-0 md:mb-0">
                                            {officerStat.entries.length > 0 ? (
                                                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                                    {officerStat.entries.map(p => (
                                                        <div key={p.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm p-2 bg-surface rounded-md border border-border-default">
                                                            <div className="font-medium text-text-primary truncate sm:w-1/3">{p.passports && p.passports.length > 0 ? `${p.passports[0].surname}, ${p.passports[0].firstNames}` : 'Unknown'}</div>
                                                            <div className="text-text-secondary truncate sm:w-1/3 sm:text-center">{getCompanyName(p.companyId)}</div>
                                                            <div className="text-text-secondary font-mono truncate sm:w-1/3 sm:text-right">{formatTimestamp(p.createdAt)}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-center text-text-secondary text-sm py-4">This officer has not made any entries yet.</p>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        )})}
                    </tbody>
                </table>
            </div>
        );
    };
    
    const StatusCard: React.FC<{
        title: string; 
        count: number; 
        colorClass: string; 
        isExpanded: boolean;
        onClick: () => void;
    }> = ({title, count, colorClass, isExpanded, onClick}) => (
        <button 
            onClick={onClick}
            className={`p-4 rounded-lg text-center w-full transition-all duration-200 border-2 ${isExpanded ? 'bg-surface-soft border-primary' : 'bg-surface-soft border-transparent hover:border-primary/50'}`}
        >
            <p className="text-sm font-medium text-text-secondary">{title}</p>
            <p className={`text-3xl font-bold ${colorClass}`}>{count}</p>
        </button>
    );


    return (
        <>
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold text-text-primary">Technical Section</h2>
                    <p className="mt-1 text-text-secondary">Manage technical weblinks and view application statistics.</p>
                </div>

                {actionError && <div className="bg-danger/10 text-danger p-3 rounded-md text-sm text-center font-semibold">{actionError}</div>}
                {actionSuccess && <div className="bg-success/10 text-success p-3 rounded-md text-sm text-center font-semibold">{actionSuccess}</div>}

                <CollapsibleCard 
                    title="Technical Weblinks" 
                    icon={LinkIcon} 
                    isExpanded={expandedPanel === 'weblinks'} 
                    onToggle={() => handleTogglePanel('weblinks')}
                >
                     <div className="flex justify-end mb-4">
                        {!isFormVisible && (
                            <Button onClick={() => setIsFormVisible(true)}>Add New Link</Button>
                        )}
                    </div>
                    {isFormVisible && (
                        <div className="mb-4">
                            <form onSubmit={handleAddLink} className="space-y-4 bg-surface-soft p-4 rounded-md">
                                <div>
                                    <label htmlFor="link-name" className="block text-sm font-medium text-text-secondary mb-1">Link Name</label>
                                    <input id="link-name" type="text" value={newLinkName} onChange={(e) => setNewLinkName(e.target.value)} placeholder="e.g., Airline Check-in" className={inputClasses}/>
                                </div>
                                <div>
                                    <label htmlFor="link-url" className="block text-sm font-medium text-text-secondary mb-1">Link URL</label>
                                    <input id="link-url" type="url" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} placeholder="https://example.com" className={inputClasses}/>
                                </div>
                                {linkError && <p className="text-danger text-sm">{linkError}</p>}
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button variant="secondary" onClick={() => setIsFormVisible(false)}>Cancel</Button>
                                    <Button type="submit">Add Link</Button>
                                </div>
                            </form>
                        </div>
                    )}
                    {links.length > 0 ? (
                         <div className="divide-y divide-border-default">
                            {links.map(link => (
                                <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="block p-4 hover:bg-surface-soft/50 transition-colors cursor-pointer group">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0 flex-grow">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-text-primary truncate group-hover:text-primary transition-colors" title={link.name}>{link.name}</p>
                                                <p className="text-sm text-text-secondary truncate" title={link.url}>{link.url}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteLink(link.id);}} className="p-2 text-text-secondary hover:text-danger rounded-md transition-colors z-10 relative" title="Delete Link">
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    ) : !isFormVisible && (
                        <p className="text-sm text-center py-8 text-text-secondary">No technical links have been added yet.</p>
                    )}
                </CollapsibleCard>
                
                <CollapsibleCard 
                    title={
                        <div className="flex justify-between items-center w-full flex-wrap gap-2">
                            <span>Booking Status</span>
                            <Button 
                                variant="danger" 
                                onClick={(e) => {
                                    e.stopPropagation(); // prevent card from toggling
                                    setIsDeleteOnHoldModalOpen(true);
                                }}
                                disabled={bookingStatusStats['on-hold'].length === 0 || isDeletingOnHold}
                                className="!text-xs !py-1 !px-2"
                            >
                                {isDeletingOnHold ? 'Deleting...' : `Delete All On-Hold (${bookingStatusStats['on-hold'].length})`}
                            </Button>
                        </div>
                    }
                    icon={TicketIcon}
                    isExpanded={expandedPanel === 'booking'}
                    onToggle={() => handleTogglePanel('booking')}
                >
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <StatusCard title="Reserved" count={bookingStatusStats['Reserved'].length} colorClass="text-info" isExpanded={expandedStatus === 'Reserved'} onClick={() => handleStatusClick('Reserved')} />
                        <StatusCard title="Pending Confirmation" count={bookingStatusStats['Pending confirmation'].length} colorClass="text-warning" isExpanded={expandedStatus === 'Pending confirmation'} onClick={() => handleStatusClick('Pending confirmation')} />
                        <StatusCard title="Issued" count={bookingStatusStats['Issued'].length} colorClass="text-success" isExpanded={expandedStatus === 'Issued'} onClick={() => handleStatusClick('Issued')} />
                        <StatusCard title="On-Hold" count={bookingStatusStats['on-hold'].length} colorClass="text-danger" isExpanded={expandedStatus === 'on-hold'} onClick={() => handleStatusClick('on-hold')} />
                    </div>
                    
                     {expandedStatus && (
                        <div className="mt-6">
                            <h4 className="font-semibold text-text-primary mb-3">Tickets with status: <span className="text-primary">{expandedStatus}</span></h4>
                            {bookingStatusStats[expandedStatus].length > 0 ? (
                                 <BookingStatusTicketList flights={bookingStatusStats[expandedStatus]} companies={companies} />
                            ) : (
                                <p className="text-sm text-text-secondary text-center py-8 bg-surface-soft rounded-md">No tickets with this status.</p>
                            )}
                        </div>
                    )}

                </CollapsibleCard>

                <CollapsibleCard 
                    title="Entries Done" 
                    icon={ChartBarIcon}
                    isExpanded={expandedPanel === 'entries'}
                    onToggle={() => handleTogglePanel('entries')}
                >
                    {renderEntriesDoneContent()}
                </CollapsibleCard>

            </div>
            <ConfirmationModal
                isOpen={isDeleteOnHoldModalOpen}
                onClose={() => setIsDeleteOnHoldModalOpen(false)}
                onConfirm={handleDeleteOnHoldTickets}
                title="Confirm Deletion of On-Hold Tickets"
                confirmText="Delete All"
                isConfirming={isDeletingOnHold}
                confirmVariant="danger"
            >
                <p>
                    Are you sure you want to permanently delete all tickets with an <strong className="text-danger">"on-hold"</strong> status?
                </p>
                <p className="mt-2 text-sm">
                    This will affect <strong className="text-text-primary">{bookingStatusStats['on-hold'].length}</strong> ticket(s) across multiple personnel. This action cannot be undone.
                </p>
            </ConfirmationModal>
        </>
    );
};

export default TechnicalScreen;