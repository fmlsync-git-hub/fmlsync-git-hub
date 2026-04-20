
// ... existing code ...
import React, { useState, useEffect, useMemo, memo } from 'react';
import { Passenger, Company, TicketData, PassengerCategory, User, UserSettings } from '../types';
import { listenToAccessiblePassengers, listenToAccessiblePassengersRtdb } from '../services/firebase';
import { useCompanies } from '../context/CompanyContext';
import { UsersIcon, CalendarIcon, DocumentWarningIcon, QueueListIcon, Squares2X2Icon, ChartPieIcon, Bars3Icon, ShieldCheckIcon, BellIcon } from '../components/icons/index';
import { SearchInput } from '../components/SearchInput';
import { useFormatters, getExpiryStatus } from '../hooks/useFormatters';
import { CollapsibleCard } from '../components/CollapsibleCard';
import { useDuplicateFilter } from '../hooks/useDuplicateFilter';
import { DuplicateToggle } from '../components/DuplicateToggle';
import { sendNotification, requestNotificationPermission, NotificationType } from '../src/services/notificationService';
import { NotificationBar } from '../components/NotificationBar';
import { NotificationListModal } from '../components/NotificationListModal';

// ... existing helper components (Spinner, PersonnelCard, etc.) ...

const Spinner: React.FC = () => (
    <div className="flex justify-center items-center h-full py-16">
        <div className="flex items-center justify-center space-x-2">
            <div className="h-5 w-5 bg-primary rounded-full animate-pulse [animation-delay:-0.3s]"></div>
            <div className="h-5 w-5 bg-primary rounded-full animate-pulse [animation-delay:-0.15s]"></div>
            <div className="h-5 w-5 bg-primary rounded-full animate-pulse"></div>
        </div>
    </div>
);

// ... existing PersonnelStatus components ...
interface PersonnelStatus {
    id: string;
    name: string;
    companyName: string;
    category: PassengerCategory;
    relevantFlight?: TicketData; 
    profilePhotoUrl?: string;
}

// ... existing interfaces CategorizedExpatriates, CategorizedLocals ...
interface CategorizedExpatriates {
    inCountry: PersonnelStatus[];
    inTransit: PersonnelStatus[];
    homeCountry: PersonnelStatus[];
}

interface CategorizedLocals {
    onSite: PersonnelStatus[];
    offSite: PersonnelStatus[];
    outsideCountry: PersonnelStatus[];
    inTransit: PersonnelStatus[];
}

const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if ((parts || []).length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${(parts || [])[(parts || []).length - 1].charAt(0)}`.toUpperCase();
}

const PersonnelCard = memo<{ personnel: PersonnelStatus, status: string, onSelect: (passengerId: string) => void }>(({ personnel, status, onSelect }) => {
  const { formatDate } = useFormatters();
  return (
    <div 
        className="bg-surface-soft rounded-lg p-4 text-center border border-border-default hover:border-primary hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col items-center cursor-pointer"
        onClick={() => onSelect(personnel.id)}
    >
      {personnel.profilePhotoUrl ? (
        <img src={personnel.profilePhotoUrl} alt={personnel.name} className="w-16 h-16 rounded-full object-cover mb-3 flex-shrink-0 border-2 border-surface shadow-sm" />
      ) : (
        <div className="w-16 h-16 bg-primary/20 text-primary font-bold rounded-full flex items-center justify-center text-xl mb-3 flex-shrink-0 shadow-sm">
          {getInitials(personnel.name)}
        </div>
      )}
      <p className="font-semibold text-on-surface truncate w-full" title={personnel.name}>{personnel.name}</p>
      <p className="text-xs text-text-secondary truncate w-full">{personnel.companyName}</p>
      
      <span className={`mt-2 flex-shrink-0 px-2.5 py-1 text-xs font-bold rounded-full border ${
          personnel.category === PassengerCategory.Expatriate ? 'bg-indigo-500/10 text-indigo-500 border-indigo-200 dark:border-indigo-900' : 
          personnel.category === PassengerCategory.WalkIn ? 'bg-orange-500/10 text-orange-500 border-orange-200 dark:border-orange-900' :
          'bg-teal-500/10 text-teal-500 border-teal-200 dark:border-teal-900'
      }`}>
          {personnel.category}
      </span>
      
      { (status !== 'inCountry' && status !== 'onSite') && personnel.relevantFlight && (
          <div className="text-xs mt-3 pt-3 border-t border-border-default w-full">
            <p className="text-text-secondary font-mono">{personnel.relevantFlight.departureCity} &rarr; {personnel.relevantFlight.arrivalCity}</p>
            <p className="text-text-secondary font-medium mt-1">{formatDate(personnel.relevantFlight.travelDate)}</p>
          </div>
      )}
    </div>
  );
});

// ... existing PersonnelGrid, PersonnelList, PersonnelSimpleList ...
const PersonnelGrid = memo<{ personnel: PersonnelStatus[], status: string, onSelect: (passengerId: string) => void }>(({ personnel, status, onSelect }) => {
    if ((personnel || []).length === 0) {
      return (
        <div className="text-center py-12 text-text-secondary">
          No personnel found in this category.
        </div>
      );
    }
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {personnel.map(p => <PersonnelCard key={p.id} personnel={p} status={status} onSelect={onSelect} />)}
        </div>
    );
});

const PersonnelList = memo<{ personnel: PersonnelStatus[], status: string, onSelect: (passengerId: string) => void }>(({ personnel, status, onSelect }) => {
  const { formatDate } = useFormatters();
  if ((personnel || []).length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        No personnel found in this category.
      </div>
    );
  }

  return (
    <div className="space-y-3 p-1">
      {personnel.map(p => (
        <div 
            key={p.id} 
            className="p-3 bg-surface-soft rounded-lg border border-border-default flex items-start sm:items-center gap-4 cursor-pointer hover:bg-surface hover:shadow-md transition-all duration-200"
            onClick={() => onSelect(p.id)}
        >
          {p.profilePhotoUrl ? (
            <img src={p.profilePhotoUrl} alt={p.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 bg-primary/20 text-primary font-bold rounded-full flex items-center justify-center text-sm flex-shrink-0">
                {getInitials(p.name)}
            </div>
          )}
          <div className="flex-grow min-w-0">
            <p className="font-semibold text-on-surface">{p.name}</p>
            <p className="text-xs text-text-secondary">{p.companyName}</p>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between mt-2 sm:mt-0">
            { (status !== 'inCountry' && status !== 'onSite') && p.relevantFlight && (
              <div className="text-left sm:text-right text-xs">
                <p className="text-text-secondary font-mono">{p.relevantFlight.departureCity} &rarr; {p.relevantFlight.arrivalCity}</p>
                <p className="text-text-secondary font-medium">{formatDate(p.relevantFlight.travelDate)}</p>
              </div>
            )}
            <span className={`flex-shrink-0 px-2.5 py-1 text-xs font-bold rounded-full ${
              p.category === PassengerCategory.Expatriate ? 'bg-indigo-500/20 text-indigo-500' : 
              p.category === PassengerCategory.WalkIn ? 'bg-orange-500/20 text-orange-500' :
              'bg-teal-500/20 text-teal-500'
            }`}>
              {p.category}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
});

const PersonnelSimpleList = memo<{ personnel: PersonnelStatus[], status: string, onSelect: (passengerId: string) => void }>(({ personnel, status, onSelect }) => {
    const { formatDate } = useFormatters();
    if ((personnel || []).length === 0) {
        return (
            <div className="text-center py-12 text-text-secondary">
                No personnel found in this category.
            </div>
        );
    }
    const tdBaseClasses = "px-4 py-3 md:px-6 md:py-4 whitespace-nowrap block md:table-cell text-right md:text-left border-b md:border-b-0 border-border-default/50 relative before:content-[attr(data-label)] before:float-left before:font-bold md:before:content-none";

    return (
        <div className="bg-transparent md:bg-surface rounded-lg md:shadow-md md:border md:border-border-default overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="hidden md:table-header-group bg-surface-soft">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Company</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Category</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Flight Details</th>
                        </tr>
                    </thead>
                    <tbody className="block md:table-row-group">
                        {personnel.map(p => (
                            <tr key={p.id} onClick={() => onSelect(p.id)} className="block md:table-row mb-4 md:mb-0 border md:border-b md:border-border-default rounded-lg shadow-sm md:shadow-none bg-surface hover:bg-surface-soft/50 transition-colors cursor-pointer">
                                <td className={tdBaseClasses} data-label="Name">
                                    <div className="flex items-center gap-3 justify-end md:justify-start">
                                        {p.profilePhotoUrl ? (
                                            <img src={p.profilePhotoUrl} alt={p.name} className="w-8 h-8 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-8 h-8 bg-primary/20 text-primary font-bold rounded-full flex items-center justify-center text-xs flex-shrink-0">
                                                {getInitials(p.name)}
                                            </div>
                                        )}
                                        <span className="font-medium text-text-primary">{p.name}</span>
                                    </div>
                                </td>
                                <td className={`${tdBaseClasses} text-sm text-text-secondary`} data-label="Company">{p.companyName}</td>
                                <td className={`${tdBaseClasses} text-sm`} data-label="Category">
                                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${ 
                                        p.category === PassengerCategory.Expatriate ? 'bg-indigo-500/20 text-indigo-500' : 
                                        p.category === PassengerCategory.WalkIn ? 'bg-orange-500/20 text-orange-500' :
                                        'bg-teal-500/20 text-teal-500'
                                    }`}>
                                        {p.category}
                                    </span>
                                </td>
                                <td className={`${tdBaseClasses} text-sm text-text-secondary`} data-label="Flight Details">
                                    {(status !== 'inCountry' && status !== 'onSite') && p.relevantFlight ? (
                                        <div className="text-right md:text-left">
                                            <p className="font-mono">{p.relevantFlight.departureCity} &rarr; {p.relevantFlight.arrivalCity}</p>
                                            <p>{formatDate(p.relevantFlight.travelDate)}</p>
                                        </div>
                                    ) : 'N/A'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

// ... existing PersonnelStatusDashboard component ...
const PersonnelStatusDashboard: React.FC<{ passengers: Passenger[], companies: Company[], onSelectPersonnel: (passengerId: string) => void }> = ({ passengers, companies, onSelectPersonnel }) => {
    const [activeMainTab, setActiveMainTab] = useState<'expatriates' | 'locals' | 'walkIns'>('expatriates');
    const [activeSubTab, setActiveSubTab] = useState<string>('inCountry');
    const [searchQuery, setSearchQuery] = useState('');
    const [view, setView] = useState<'list' | 'grid' | 'simple'>(() => {
        return (localStorage.getItem('personnel-status-view') as 'list' | 'grid' | 'simple') || 'simple';
    });

    useEffect(() => {
        localStorage.setItem('personnel-status-view', view);
    }, [view]);

    useEffect(() => {
        if (activeMainTab === 'expatriates') {
            setActiveSubTab('inCountry');
        } else {
            setActiveSubTab('onSite');
        }
    }, [activeMainTab]);

    const getCompanyName = (companyId: string, companies: Company[]) => companies.find(c => c.id === companyId)?.name || 'Unknown';

    const parseLocalDate = (dateString: string): Date | null => {
        if (!dateString) return null;
        const parts = dateString.split('-').map(Number);
        if ((parts || []).length !== 3 || parts.some(isNaN)) return null;
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    const { expatriates, locals, walkIns } = useMemo(() => {
        return passengers.reduce((acc, p) => {
            if (p.category === PassengerCategory.Expatriate) {
                acc.expatriates.push(p);
            } else if (p.category === PassengerCategory.WalkIn) {
                acc.walkIns.push(p);
            } else {
                acc.locals.push(p);
            }
            return acc;
        }, { expatriates: [] as Passenger[], locals: [] as Passenger[], walkIns: [] as Passenger[] });
    }, [passengers]);

    const categorizedExpatriates = useMemo<CategorizedExpatriates>(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const result: CategorizedExpatriates = { inCountry: [], inTransit: [], homeCountry: [] };
        const localCities = ['accra', 'takoradi'];

        for (const p of expatriates) {
            const passport = p.passports?.[0];
            const name = passport ? `${passport.firstNames} ${passport.surname}` : (p.ghanaCardData ? `${p.ghanaCardData.firstNames} ${p.ghanaCardData.surname}` : 'Unknown');
            const personnelInfo: Omit<PersonnelStatus, 'relevantFlight'> = {
                id: p.id, name,
                companyName: getCompanyName(p.companyId, companies), category: p.category,
                profilePhotoUrl: p.profilePhotoUrl,
            };

            if (!p.tickets || p.tickets.length === 0) {
                result.inCountry.push(personnelInfo); continue;
            }

            const sortedTickets = p.tickets.map(t => ({ ...t, localTravelDate: parseLocalDate(t.travelDate) }))
                .filter(t => t.localTravelDate).sort((a, b) => b.localTravelDate!.getTime() - a.localTravelDate!.getTime());
            
            const transitTicket = sortedTickets.find(t => t.localTravelDate!.toDateString() === today.toDateString());
            if (transitTicket) {
                result.inTransit.push({ ...personnelInfo, relevantFlight: transitTicket }); continue;
            }
            
            const lastFlight = sortedTickets.find(t => t.localTravelDate! < today);
            if (!lastFlight) {
                result.inCountry.push(personnelInfo); continue;
            }

            const isArrivalLocal = lastFlight.arrivalCity && localCities.includes(lastFlight.arrivalCity.toLowerCase());
            if (isArrivalLocal) {
                result.inCountry.push({ ...personnelInfo, relevantFlight: lastFlight });
            } else {
                result.homeCountry.push({ ...personnelInfo, relevantFlight: lastFlight });
            }
        }
        Object.values(result).forEach(list => list.sort((a, b) => a.name.localeCompare(b.name)));
        return result;
    }, [expatriates, companies]);

    const categorizedLocals = useMemo<CategorizedLocals>(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const result: CategorizedLocals = { onSite: [], offSite: [], outsideCountry: [], inTransit: [] };
        const localCities = ['accra', 'takoradi', 'kumasi', 'tamale'];
        const workSiteCity = 'takoradi';
        
        for (const p of locals) {
            const passport = p.passports?.[0];
            const name = passport ? `${passport.firstNames} ${passport.surname}` : (p.ghanaCardData ? `${p.ghanaCardData.firstNames} ${p.ghanaCardData.surname}` : 'Unknown');
            const personnelInfo: Omit<PersonnelStatus, 'relevantFlight'> = {
                id: p.id, name,
                companyName: getCompanyName(p.companyId, companies), category: p.category,
                profilePhotoUrl: p.profilePhotoUrl,
            };

            if (!p.tickets || p.tickets.length === 0) {
                result.offSite.push(personnelInfo); continue;
            }

            const sortedTickets = p.tickets.map(t => ({ ...t, localTravelDate: parseLocalDate(t.travelDate) }))
                .filter(t => t.localTravelDate).sort((a, b) => b.localTravelDate!.getTime() - a.localTravelDate!.getTime());

            const transitTicket = sortedTickets.find(t => t.localTravelDate!.toDateString() === today.toDateString());
            if (transitTicket) {
                result.inTransit.push({ ...personnelInfo, relevantFlight: transitTicket }); continue;
            }
            
            const lastFlight = sortedTickets.find(t => t.localTravelDate! < today);
            if (!lastFlight || !lastFlight.arrivalCity) {
                result.offSite.push(personnelInfo); continue;
            }

            const arrivalCity = lastFlight.arrivalCity.toLowerCase().trim();
            if (arrivalCity === workSiteCity) {
                result.onSite.push({ ...personnelInfo, relevantFlight: lastFlight });
            } else if (localCities.includes(arrivalCity)) {
                result.offSite.push({ ...personnelInfo, relevantFlight: lastFlight });
            } else {
                result.outsideCountry.push({ ...personnelInfo, relevantFlight: lastFlight });
            }
        }
        Object.values(result).forEach(list => list.sort((a, b) => a.name.localeCompare(b.name)));
        return result;
    }, [locals, companies]);

    const categorizedWalkIns = useMemo<CategorizedLocals>(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const result: CategorizedLocals = { onSite: [], offSite: [], outsideCountry: [], inTransit: [] };
        const localCities = ['accra', 'takoradi', 'kumasi', 'tamale'];
        const workSiteCity = 'takoradi';
        
        for (const p of walkIns) {
            const passport = p.passports?.[0];
            const name = passport ? `${passport.firstNames} ${passport.surname}` : (p.ghanaCardData ? `${p.ghanaCardData.firstNames} ${p.ghanaCardData.surname}` : 'Unknown');
            const personnelInfo: Omit<PersonnelStatus, 'relevantFlight'> = {
                id: p.id, name,
                companyName: getCompanyName(p.companyId, companies), category: p.category,
                profilePhotoUrl: p.profilePhotoUrl,
            };

            if (!p.tickets || p.tickets.length === 0) {
                result.onSite.push(personnelInfo); continue;
            }

            const sortedTickets = p.tickets.map(t => ({ ...t, localTravelDate: parseLocalDate(t.travelDate) }))
                .filter(t => t.localTravelDate).sort((a, b) => b.localTravelDate!.getTime() - a.localTravelDate!.getTime());

            const transitTicket = sortedTickets.find(t => t.localTravelDate!.toDateString() === today.toDateString());
            if (transitTicket) {
                result.inTransit.push({ ...personnelInfo, relevantFlight: transitTicket }); continue;
            }
            
            const lastFlight = sortedTickets.find(t => t.localTravelDate! < today);
            if (!lastFlight || !lastFlight.arrivalCity) {
                result.onSite.push(personnelInfo); continue;
            }

            const arrivalCity = lastFlight.arrivalCity.toLowerCase().trim();
            if (arrivalCity === workSiteCity) {
                result.onSite.push({ ...personnelInfo, relevantFlight: lastFlight });
            } else if (localCities.includes(arrivalCity)) {
                result.offSite.push({ ...personnelInfo, relevantFlight: lastFlight });
            } else {
                result.outsideCountry.push({ ...personnelInfo, relevantFlight: lastFlight });
            }
        }
        Object.values(result).forEach(list => list.sort((a, b) => a.name.localeCompare(b.name)));
        return result;
    }, [walkIns, companies]);

    const currentList = useMemo(() => {
        if (activeMainTab === 'expatriates') {
            return categorizedExpatriates[activeSubTab as keyof CategorizedExpatriates] || [];
        } else if (activeMainTab === 'locals') {
            return categorizedLocals[activeSubTab as keyof CategorizedLocals] || [];
        } else {
            return categorizedWalkIns[activeSubTab as keyof CategorizedLocals] || [];
        }
    }, [activeMainTab, activeSubTab, categorizedExpatriates, categorizedLocals, categorizedWalkIns]);
    
    const filteredPersonnel = useMemo(() => {
        if (!searchQuery.trim()) {
            return currentList;
        }
        const lowercasedQuery = searchQuery.toLowerCase().trim();
        return currentList.filter(p => p.name.toLowerCase().includes(lowercasedQuery));
    }, [searchQuery, currentList]);

    const MainTabButton: React.FC<{ tab: 'expatriates' | 'locals' | 'walkIns'; label: string; count: number }> = ({ tab, label, count }) => (
        <button
            onClick={() => setActiveMainTab(tab)}
            className={`px-4 py-2 font-semibold rounded-lg text-base transition-all duration-200 transform hover:-translate-y-0.5 ${activeMainTab === tab ? 'bg-primary text-on-primary shadow-md' : 'text-text-primary hover:bg-surface'}`}
        >
            {label} <span className={`ml-2 px-2.5 py-1 rounded-full text-xs font-bold ${activeMainTab === tab ? 'bg-white/20' : 'bg-surface-soft'}`}>{count}</span>
        </button>
    );

    const SubTabButton: React.FC<{ tab: string; label: string; count: number; }> = ({ tab, label, count }) => (
        <button
            onClick={() => setActiveSubTab(tab)}
            className={`px-3 py-1.5 font-semibold rounded-md text-sm transition-colors ${activeSubTab === tab ? 'bg-primary/10 text-primary ring-1 ring-primary' : 'text-text-secondary hover:bg-surface-soft hover:text-text-primary'}`}
        >
            {label} <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs ${activeSubTab === tab ? 'bg-primary text-white' : 'bg-surface border border-border-default'}`}>{count}</span>
        </button>
    );

    return (
        <div className="bg-surface/50 rounded-lg p-1">
            {/* Main Tabs */}
            <div className="flex items-center gap-2 mb-4 p-2 bg-surface-soft rounded-xl shadow-inner border border-border-default">
                <MainTabButton tab="expatriates" label="Expatriates" count={expatriates.length} />
                <MainTabButton tab="locals" label="Locals" count={locals.length} />
                <MainTabButton tab="walkIns" label="Walk-ins" count={walkIns.length} />
            </div>

            {/* Sub-Tabs and Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 px-1">
                <div className="flex items-center gap-2 flex-wrap">
                    {activeMainTab === 'expatriates' ? (
                        <>
                            <SubTabButton tab="inCountry" label="In-Country" count={categorizedExpatriates.inCountry.length} />
                            <SubTabButton tab="inTransit" label="In-Transit" count={categorizedExpatriates.inTransit.length} />
                            <SubTabButton tab="homeCountry" label="Home-Country" count={categorizedExpatriates.homeCountry.length} />
                        </>
                    ) : activeMainTab === 'locals' ? (
                        <>
                            <SubTabButton tab="onSite" label="On-Site" count={categorizedLocals.onSite.length} />
                            <SubTabButton tab="offSite" label="Off-Site" count={categorizedLocals.offSite.length} />
                            <SubTabButton tab="outsideCountry" label="Outside Country" count={categorizedLocals.outsideCountry.length} />
                            <SubTabButton tab="inTransit" label="In-Transit" count={categorizedLocals.inTransit.length} />
                        </>
                    ) : (
                        <>
                            <SubTabButton tab="onSite" label="On-Site" count={categorizedWalkIns.onSite.length} />
                            <SubTabButton tab="offSite" label="Off-Site" count={categorizedWalkIns.offSite.length} />
                            <SubTabButton tab="outsideCountry" label="Outside Country" count={categorizedWalkIns.outsideCountry.length} />
                            <SubTabButton tab="inTransit" label="In-Transit" count={categorizedWalkIns.inTransit.length} />
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex-grow sm:w-56">
                        <SearchInput value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search personnel..."/>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1 p-1 bg-surface-soft rounded-lg border border-border-default">
                        <button onClick={() => setView('simple')} className={`p-1.5 rounded-md transition-colors ${view === 'simple' ? 'bg-primary text-on-primary shadow' : 'text-text-secondary hover:bg-border-default'}`} title="Simple List View">
                            <Bars3Icon className="h-5 w-5" />
                        </button>
                        <button onClick={() => setView('list')} className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-primary text-on-primary shadow' : 'text-text-secondary hover:bg-border-default'}`} title="Detailed List View">
                            <QueueListIcon className="h-5 w-5" />
                        </button>
                        <button onClick={() => setView('grid')} className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-primary text-on-primary shadow' : 'text-text-secondary hover:bg-border-default'}`} title="Thumbnail View">
                            <Squares2X2Icon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Content */}
            <div className="min-h-[200px]">
                {view === 'grid' 
                    ? <PersonnelGrid key={activeMainTab + activeSubTab} personnel={filteredPersonnel} status={activeSubTab} onSelect={onSelectPersonnel} />
                    : view === 'simple'
                    ? <PersonnelSimpleList key={activeMainTab + activeSubTab} personnel={filteredPersonnel} status={activeSubTab} onSelect={onSelectPersonnel} />
                    : <PersonnelList key={activeMainTab + activeSubTab} personnel={filteredPersonnel} status={activeSubTab} onSelect={onSelectPersonnel} />
                }
            </div>
        </div>
    )
}

interface Alert {
    id: string;
    passenger: Passenger;
    title: string;
    message: string;
    type: 'flight' | 'document';
}

interface AlertsSectionProps {
    upcomingFlights: { passenger: Passenger, ticket: TicketData, localTravelDate: Date | null }[];
    expiringDocuments: { passenger: Passenger, docType: string, expiryDate: string, status: any }[];
    onSelectPassenger: (passenger: Passenger) => void;
}

const AlertsSection: React.FC<AlertsSectionProps & { isExpanded: boolean; onToggle: () => void }> = ({ upcomingFlights, expiringDocuments, onSelectPassenger, isExpanded, onToggle }) => {
    // Combine them into a list of alerts
    const alerts = [
        ...upcomingFlights.map(f => ({
            id: `flight-${f.passenger.id}-${f.ticket.travelDate}`,
            passenger: f.passenger,
            title: 'Upcoming Flight',
            message: `${f.passenger.passports && f.passenger.passports.length > 0 ? `${f.passenger.passports[0].surname}, ${f.passenger.passports[0].firstNames}` : 'Unknown'} has a flight on ${f.localTravelDate?.toLocaleDateString()}`,
            type: 'flight' as const
        })),
        ...expiringDocuments.map(d => ({
            id: `doc-${d.passenger.id}-${d.docType}`,
            passenger: d.passenger,
            title: 'Document Expiry',
            message: `${d.passenger.passports && d.passenger.passports.length > 0 ? `${d.passenger.passports[0].surname}, ${d.passenger.passports[0].firstNames}` : 'Unknown'}'s ${d.docType} expires in ${d.status.days} days`,
            type: 'document' as const
        }))
    ];

    return (
        <CollapsibleCard
            isExpanded={isExpanded}
            onToggle={onToggle}
            title={
                <div className="flex items-start justify-between w-full">
                    <div>
                        <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">Notifications or Alerts</h3>
                        <p className="text-3xl font-bold text-on-surface mt-1">{alerts.length}</p>
                    </div>
                    <div className="p-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/30">
                        <BellIcon className="h-7 w-7 text-white" />
                    </div>
                </div>
            }
        >
            <div className="space-y-2 max-h-64 overflow-y-auto -mt-4">
                {alerts.length > 0 ? alerts.map(alert => (
                    <div 
                        key={alert.id} 
                        onClick={() => onSelectPassenger(alert.passenger)}
                        className="p-3 bg-surface-soft rounded-lg border border-border-default cursor-pointer hover:bg-surface hover:shadow transition-all duration-200"
                    >
                        <p className="font-semibold text-on-surface">{alert.title}</p>
                        <p className="text-sm text-text-secondary">{alert.message}</p>
                    </div>
                )) : <p className="text-sm text-text-secondary">No alerts at this time.</p>}
            </div>
        </CollapsibleCard>
    );
};

// --- Main Dashboard Screen Component ---
interface DashboardScreenProps {
    onSelectPassenger: (passenger: Passenger) => void;
    currentUser?: User & UserSettings; // Make optional but expect it
}

type SortOption = 'name_asc' | 'name_desc' | 'date_asc' | 'date_desc';

const DashboardScreen: React.FC<DashboardScreenProps> = ({ onSelectPassenger, currentUser }) => {
    const [passengers, setPassengers] = useState<Passenger[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [accessError, setAccessError] = useState<string | null>(null);
    const { companies } = useCompanies();
    const [clientSearch, setClientSearch] = useState('');
    const { formatDate, formatTime } = useFormatters();
    const [expandedPanel, setExpandedPanel] = useState<string | null>(null);
    const [sortOption, setSortOption] = useState<SortOption>('name_asc');
    const [selectedNotificationType, setSelectedNotificationType] = useState<NotificationType | null>(null);

    const { showDuplicates, setShowDuplicates, filterDuplicates, duplicateIds } = useDuplicateFilter();

    const filteredPassengers = useMemo(() => {
        return filterDuplicates<Passenger>(passengers);
    }, [passengers, filterDuplicates]);

    const handleTogglePanel = (panelId: string) => {
        setExpandedPanel(prev => (prev === panelId ? null : panelId));
    };

    useEffect(() => {
        if (currentUser) {
            setIsLoading(true);
            setAccessError(null);
            
            // 1. Primary Firestore Listener
            const unsubscribeFirestore = listenToAccessiblePassengers(
                currentUser, 
                (allPassengers) => {
                    setPassengers(allPassengers);
                    setIsLoading(false);
                },
                (error) => {
                    if (error.code === 'permission-denied') {
                        setAccessError('Permission Denied: Your account does not have access to read passenger data. Please contact the administrator to deploy Firestore Security Rules.');
                    }
                    setIsLoading(false);
                }
            );

            // 2. Realtime Database Fallback/Fast Listener
            const unsubscribeRtdb = listenToAccessiblePassengersRtdb(
                currentUser,
                (allPassengers) => {
                    if (allPassengers && allPassengers.length > 0) {
                        setPassengers(allPassengers);
                        setIsLoading(false);
                    }
                }
            );

            return () => {
                unsubscribeFirestore();
                unsubscribeRtdb();
            };
        }
    }, [currentUser]);

    const filteredClients = useMemo(() => {
        let results = [...filteredPassengers]; // Use filteredPassengers instead of passengers

        if (clientSearch.trim()) {
            const lowercasedQuery = clientSearch.toLowerCase();
            results = results.filter(p => {
                const passport = p.passports && p.passports.length > 0 ? p.passports[0] : null;
                if (!passport) return false;
                return `${passport.surname}, ${passport.firstNames}`.toLowerCase().includes(lowercasedQuery) ||
                       `${passport.firstNames} ${passport.surname}`.toLowerCase().includes(lowercasedQuery);
            });
        }
        
        // Sorting logic
        switch (sortOption) {
            case 'name_asc':
                results.sort((a, b) => {
                    const pA = a.passports && a.passports.length > 0 ? `${a.passports[0].surname} ${a.passports[0].firstNames}` : '';
                    const pB = b.passports && b.passports.length > 0 ? `${b.passports[0].surname} ${b.passports[0].firstNames}` : '';
                    return pA.localeCompare(pB);
                });
                break;
            case 'name_desc':
                results.sort((a, b) => {
                    const pA = a.passports && a.passports.length > 0 ? `${a.passports[0].surname} ${a.passports[0].firstNames}` : '';
                    const pB = b.passports && b.passports.length > 0 ? `${b.passports[0].surname} ${b.passports[0].firstNames}` : '';
                    return pB.localeCompare(pA);
                });
                break;
            case 'date_desc':
                results.sort((a, b) => (b.createdAt?.toDate?.().getTime() || 0) - (a.createdAt?.toDate?.().getTime() || 0));
                break;
            case 'date_asc':
                results.sort((a, b) => (a.createdAt?.toDate?.().getTime() || 0) - (b.createdAt?.toDate?.().getTime() || 0));
                break;
        }

        return results;
    }, [filteredPassengers, clientSearch, sortOption]);

    const upcomingFlights = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thirtyDaysFromNow = new Date(today);
        thirtyDaysFromNow.setDate(today.getDate() + 30);
    
        const parseLocalDate = (dateString: string): Date | null => {
            if (!dateString) return null;
            const parts = dateString.split('-').map(Number);
            if ((parts || []).length !== 3 || parts.some(isNaN)) return null;
            return new Date(parts[0], parts[1] - 1, parts[2]);
        }
    
        return filteredPassengers.flatMap(p =>
            p.tickets
                .map(t => ({ 
                    passenger: p, 
                    ticket: t, 
                    localTravelDate: parseLocalDate(t.travelDate),
                    passengerName: p.passports?.[0] ? `${p.passports[0].firstNames} ${p.passports[0].surname}` : (p.ghanaCardData ? `${p.ghanaCardData.firstNames} ${p.ghanaCardData.surname}` : 'Unknown')
                }))
                .filter(item => {
                    if (!item.localTravelDate) return false;
                    return item.localTravelDate >= today && item.localTravelDate <= thirtyDaysFromNow;
                })
        ).sort((a, b) => a.localTravelDate!.getTime() - b.localTravelDate!.getTime());
    }, [filteredPassengers]);

    const expiringDocuments = useMemo(() => {
        return filteredPassengers.flatMap(p => {
            const docs = [];
            const passport = p.passports && p.passports.length > 0 ? p.passports[0] : null;
            if (passport) {
                const passportStatus = getExpiryStatus(passport.dateOfExpiry);
                if (passportStatus.days <= 90) {
                    docs.push({ passenger: p, docType: 'Passport', expiryDate: passport.dateOfExpiry, status: passportStatus });
                }
            }
            if (p.ghanaCardData) {
                const ghanaCardStatus = getExpiryStatus(p.ghanaCardData.dateOfExpiry);
                 if (ghanaCardStatus.days <= 90) {
                    docs.push({ passenger: p, docType: 'Ghana Card', expiryDate: p.ghanaCardData.dateOfExpiry, status: ghanaCardStatus });
                }
            }
            p.visas.forEach(v => {
                const status = getExpiryStatus(v.dateOfExpiry);
                if (status.days <= 90) docs.push({ passenger: p, docType: `Visa (${v.country})`, expiryDate: v.dateOfExpiry, status });
            });
            p.permits.forEach(pm => {
                const status = getExpiryStatus(pm.dateOfExpiry);
                if (status.days <= 90) docs.push({ passenger: p, docType: `Permit (${pm.type || 'N/A'})`, expiryDate: pm.dateOfExpiry, status });
            });
            return docs;
        }).sort((a, b) => a.status.days - b.status.days);
    }, [filteredPassengers]);
    
    const getCompanyName = (companyId: string) => companies.find(c => c.id === companyId)?.name || 'Unknown';

    const handleViewProfile = (passengerId: string) => {
        const passengerData = passengers.find(p => p.id === passengerId);
        if (passengerData) {
            onSelectPassenger(passengerData);
        }
    };


    if (isLoading) {
        return <Spinner />;
    }

    if (accessError) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] p-6 text-center">
                <div className="bg-danger/10 p-6 rounded-xl border border-danger/30 max-w-lg">
                    <ShieldCheckIcon className="h-16 w-16 text-danger mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-text-primary mb-2">Access Restricted</h3>
                    <p className="text-text-secondary">{accessError}</p>
                    <p className="text-xs text-text-secondary mt-4 bg-background p-2 rounded">
                        If you are the developer, ensure you have deployed the updated <code>firestore.rules</code> file.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-on-surface">Dashboard Overview</h2>
                    <p className="text-sm text-text-secondary">Summary of personnel, flights, and document status.</p>
                </div>
                <DuplicateToggle 
                    showDuplicates={showDuplicates} 
                    onToggle={setShowDuplicates} 
                    duplicateCount={duplicateIds.size} 
                    currentUser={currentUser}
                />
            </div>

            <NotificationBar 
                onNotificationClick={setSelectedNotificationType} 
                passengers={passengers}
            />

            {selectedNotificationType && (
                <NotificationListModal 
                    type={selectedNotificationType} 
                    passengers={passengers}
                    onClose={() => setSelectedNotificationType(null)} 
                />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AlertsSection 
                    upcomingFlights={upcomingFlights} 
                    expiringDocuments={expiringDocuments} 
                    onSelectPassenger={onSelectPassenger}
                    isExpanded={expandedPanel === 'alerts'}
                    onToggle={() => handleTogglePanel('alerts')}
                />
                <CollapsibleCard
                    isExpanded={expandedPanel === 'personnel'}
                    onToggle={() => handleTogglePanel('personnel')}
                    title={
                        <div className="flex items-start justify-between w-full">
                            <div>
                                <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">Active Personnel</h3>
                                <p className="text-3xl font-bold text-on-surface mt-1">{(filteredPassengers || []).length.toString()}</p>
                            </div>
                            <div className="p-3 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/30">
                                <UsersIcon className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    }
                >
                    <div className="text-sm text-on-surface space-y-4 -mt-4">
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="flex-grow">
                                <SearchInput
                                    value={clientSearch}
                                    onChange={(e) => setClientSearch(e.target.value)}
                                    placeholder="Search personnel by name..."
                                />
                            </div>
                            <div className="flex-shrink-0">
                                <label htmlFor="client-sort-select" className="sr-only">Sort by</label>
                                <select 
                                    id="client-sort-select" 
                                    value={sortOption} 
                                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                                    className="w-full sm:w-auto px-3 py-2 border bg-background border-border-default rounded-md focus:outline-none focus:ring-1 focus:ring-primary h-full"
                                >
                                    <option value="name_asc">Alphabetical (A-Z)</option>
                                    <option value="name_desc">Alphabetical (Z-A)</option>
                                    <option value="date_desc">Date Created (Newest)</option>
                                    <option value="date_asc">Date Created (Oldest)</option>
                                </select>
                            </div>
                        </div>
                        <ul className="max-h-64 overflow-y-auto space-y-2 pr-2">
                            {((filteredClients || []).length > 0) ? filteredClients.map(p => {
                                const statuses: { label: string; status: ReturnType<typeof getExpiryStatus> }[] = [];
                                const passport = p.passports?.[0];

                                if (passport?.dateOfExpiry) {
                                    statuses.push({
                                        label: 'Passport',
                                        status: getExpiryStatus(passport.dateOfExpiry)
                                    });
                                }

                                if (p.ghanaCardData?.dateOfExpiry) {
                                    statuses.push({
                                        label: 'Ghana Card',
                                        status: getExpiryStatus(p.ghanaCardData.dateOfExpiry)
                                    });
                                }

                               return (
                                   <li key={p.id} onClick={() => onSelectPassenger(p)} className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 p-3 bg-surface-soft rounded-lg border border-border-default cursor-pointer hover:bg-surface hover:shadow transition-all duration-200">
                                        <div>
                                           <p className="font-semibold text-on-surface">
                                               {passport ? `${passport.surname}, ${passport.firstNames}` : (p.ghanaCardData ? `${p.ghanaCardData.surname}, ${p.ghanaCardData.firstNames}` : 'Unknown')}
                                           </p>
                                           <p className="text-xs text-text-secondary">{getCompanyName(p.companyId)}</p>
                                        </div>
                                        <div className="flex self-stretch sm:self-center flex-col items-end gap-1 sm:flex-row sm:gap-2">
                                            {((statuses || []).length > 0) ? (
                                                statuses.map(({ label, status }) => {
                                                    const shortLabel = label === 'Passport' ? 'P' : 'GC';
                                                    return (
                                                        <div key={label} title={`${label} Expiry: ${status.text}`} className={`px-2 py-1 text-xs font-medium rounded-full border ${status.bgClass} ${status.colorClass} border-current/20`}>
                                                            {`${shortLabel}: ${status.text}`}
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="px-2 py-1 text-xs font-medium rounded-full bg-surface-soft text-text-secondary border border-border-default">
                                                    No Date
                                                </div>
                                            )}
                                        </div>
                                   </li>
                                );
                            }) : <p className="text-center text-text-secondary py-4">No active personnel found.</p>}
                        </ul>
                    </div>
                </CollapsibleCard>
                
                <CollapsibleCard
                    isExpanded={expandedPanel === 'flights'}
                    onToggle={() => handleTogglePanel('flights')}
                    title={
                        <div className="flex items-start justify-between w-full">
                            <div>
                                <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">Upcoming Flights</h3>
                                <p className="text-3xl font-bold text-on-surface mt-1">{(upcomingFlights || []).length.toString()}</p>
                            </div>
                            <div className="p-3 rounded-full bg-purple-500 shadow-lg shadow-purple-500/30">
                                <CalendarIcon className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    }
                >
                    <div className="text-sm text-on-surface -mt-4">
                        <ul className="max-h-80 overflow-y-auto space-y-2 pr-2">
                           {((upcomingFlights || []).length > 0) ? upcomingFlights.map((item, idx) => {
                               const diffDays = Math.ceil((item.localTravelDate!.getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
                               let urgency, urgencyClass;
                               if (diffDays === 0) {
                                   urgency = 'Today';
                                   urgencyClass = 'bg-fuchsia-600 text-white'; // Magenta
                               } else if (diffDays > 0 && diffDays <= 3) {
                                   urgency = 'Urgent';
                                   urgencyClass = 'bg-orange-500 text-white'; // Orange
                               } else {
                                   urgency = 'Upcoming';
                                   urgencyClass = 'bg-green-600 text-white'; // Green
                               }
                               return (
                                   <li key={`${item.passenger.id}-${idx}`} onClick={() => onSelectPassenger(item.passenger)} className="p-3 bg-surface-soft rounded-lg border border-border-default cursor-pointer hover:bg-surface hover:shadow transition-all duration-200">
                                       <div className="flex justify-between items-start">
                                           <div>
                                               <p className="font-semibold text-on-surface truncate">
                                                   {item.passenger.passports?.[0] ? `${item.passenger.passports[0].surname}, ${item.passenger.passports[0].firstNames.split(' ')[0]}` : (item.passenger.ghanaCardData ? `${item.passenger.ghanaCardData.surname}, ${item.passenger.ghanaCardData.firstNames.split(' ')[0]}` : 'Unknown')}
                                               </p>
                                               <p className="text-xs text-text-secondary">{item.ticket.departureCity || 'N/A'} &rarr; {item.ticket.arrivalCity || 'N/A'}</p>
                                           </div>
                                           <div className={`flex-shrink-0 ml-2 px-2 py-1 text-xs font-bold rounded-full ${urgencyClass} shadow-sm`}>
                                               {urgency}
                                           </div>
                                       </div>
                                       <div className="mt-2 text-right">
                                            <p className="font-mono text-base text-primary-dark dark:text-primary-light font-medium">{formatDate(item.ticket.travelDate)} {formatTime(item.ticket.travelTime)}</p>
                                       </div>
                                   </li>
                               );
                           }) : <p className="text-center text-text-secondary py-4">No upcoming flights in the next 30 days.</p>}
                        </ul>
                    </div>
                </CollapsibleCard>
                
                 <CollapsibleCard
                    isExpanded={expandedPanel === 'expiries'}
                    onToggle={() => handleTogglePanel('expiries')}
                    title={
                         <div className="flex items-start justify-between w-full">
                            <div>
                                <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">Document Expiry</h3>
                                <p className="text-3xl font-bold text-on-surface mt-1">{(expiringDocuments || []).length.toString()}</p>
                            </div>
                            <div className="p-3 rounded-full bg-danger shadow-lg shadow-red-500/30">
                                <DocumentWarningIcon className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    }
                >
                    <div className="text-sm text-on-surface -mt-4">
                        <ul className="max-h-80 overflow-y-auto space-y-2 pr-2">
                           {((expiringDocuments || []).length > 0) ? expiringDocuments.map((item, idx) => (
                               <li key={`${item.passenger.id}-${idx}`} onClick={() => onSelectPassenger(item.passenger)} className="flex items-center gap-4 p-3 bg-surface-soft rounded-lg border border-border-default cursor-pointer hover:bg-surface hover:shadow transition-all duration-200">
                                   <div className={`flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full ${item.status.bgClass}`}>
                                       <div className={item.status.colorClass}>{item.status.icon}</div>
                                   </div>
                                   <div className="flex-grow min-w-0">
                                       <p className="font-semibold text-on-surface truncate">{item.docType}</p>
                                       <p className="text-xs text-text-secondary truncate">
                                           {item.passenger.passports?.[0] ? `${item.passenger.passports[0].surname}, ${item.passenger.passports[0].firstNames.split(' ')[0]}` : (item.passenger.ghanaCardData ? `${item.passenger.ghanaCardData.surname}, ${item.passenger.ghanaCardData.firstNames.split(' ')[0]}` : 'Unknown')}
                                       </p>
                                   </div>
                                   <div className={`text-right ${item.status.colorClass} font-bold flex-shrink-0`}>
                                        {item.status.text}
                                   </div>
                               </li>
                           )) : <p className="text-center text-text-secondary py-4">No documents expiring or expired in the next 90 days.</p>}
                        </ul>
                    </div>
                </CollapsibleCard>
            </div>
            
            <CollapsibleCard
                icon={ChartPieIcon}
                isExpanded={expandedPanel === 'status'}
                onToggle={() => handleTogglePanel('status')}
                title={
                    <div>
                        <h3 className="text-xl font-semibold text-on-surface">Personnel Status</h3>
                        <p className="text-sm text-text-secondary mt-1">Live overview of personnel location based on travel data.</p>
                    </div>
                }
            >
                <PersonnelStatusDashboard passengers={filteredPassengers} companies={companies} onSelectPersonnel={handleViewProfile} />
            </CollapsibleCard>
        </div>
    );
};

export default DashboardScreen;