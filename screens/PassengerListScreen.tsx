
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Company, Passenger, PassengerCategory, User, UserSettings } from '../types';
import { useDuplicateFilter } from '../hooks/useDuplicateFilter';
import { DuplicateToggle } from '../components/DuplicateToggle';
// FIX: Removed unused 'firebase' import and imported 'QueryDocumentSnapshot' type directly.
import { getPassengersByCompanyPaginated, deletePassenger, type QueryDocumentSnapshot, listenToRtdb } from '../services/firebase';
import { ChecklistComplianceModal } from '../components/ChecklistComplianceModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ArrowLeftIcon, QueueListIcon, Squares2X2Icon, ChevronDownIcon } from '../components/icons/index';
import { SearchInput } from '../components/SearchInput';
// FIX: Changed to a named import for useFormatters to resolve module loading issue.
import { useFormatters, getExpiryStatus } from '../hooks/useFormatters';

// --- Reusable Components ---
const Spinner: React.FC = () => (
    <div className="flex justify-center items-center py-16">
        <div className="flex items-center justify-center space-x-2">
            <div className="h-5 w-5 bg-primary rounded-full animate-pulse [animation-delay:-0.3s]"></div>
            <div className="h-5 w-5 bg-primary rounded-full animate-pulse [animation-delay:-0.15s]"></div>
            <div className="h-5 w-5 bg-primary rounded-full animate-pulse"></div>
        </div>
    </div>
);

type ButtonVariant = 'primary' | 'secondary';
const Button: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string; variant?: ButtonVariant; disabled?: boolean; }> = ({ children, onClick, className, variant = 'primary', disabled = false }) => {
    const baseClasses = `px-4 py-2 rounded-md font-semibold shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`;
    const variantClasses = {
        primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
        secondary: 'bg-surface-soft text-text-primary hover:bg-border-default focus:ring-primary',
    };
    return <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${variantClasses[variant]} ${className}`}>{children}</button>;
};

const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <Button onClick={onClick} variant="secondary" className="mb-4">
        <span className="flex items-center gap-2">
            <ArrowLeftIcon />
            Back to Clients
        </span>
    </Button>
);

const CompanyLogo: React.FC<{ company: Company; className?: string }> = ({ company, className }) => {
    const LogoComponent = company.logo;
    if (typeof LogoComponent === 'string') {
        return <img src={LogoComponent} alt={`${company.name} logo`} className={className} />;
    }
    return <LogoComponent className={className} title={`${company.name} logo`} />;
};


// --- Main Screen Component ---

interface PassengerListScreenProps {
  company: Company;
  onBack: () => void;
  onAddNew: () => void;
  onSelectPassenger: (passenger: Passenger) => void;
  onEditPassenger: (passenger: Passenger) => void;
  currentUser: User & UserSettings;
}

interface PassengerCardProps {
    passenger: Passenger;
    onSelect: (p: Passenger) => void;
    onEdit: (p: Passenger) => void;
    onDelete: (p: Passenger) => void;
    isExpanded: boolean;
    onToggle: () => void;
}

const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

const PassengerCard = React.memo(({ passenger, onSelect, onEdit, onDelete, isExpanded, onToggle }: PassengerCardProps) => {
    const status = getExpiryStatus((passenger.passports || []).length > 0 ? passenger.passports[0].dateOfExpiry : '');
    return (
        <div className="bg-surface rounded-lg shadow-md border border-border-default flex flex-col justify-between transition-all hover:shadow-lg hover:-translate-y-0.5">
            <div className="p-4 cursor-pointer" onClick={onToggle}>
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4 min-w-0">
                        {passenger.profilePhotoUrl ? (
                            <img src={passenger.profilePhotoUrl} alt="Profile" className="h-12 w-12 rounded-full object-cover flex-shrink-0" />
                        ) : (
                             <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl flex-shrink-0">
                                {getInitials((passenger.passports || []).length > 0 ? `${passenger.passports[0].firstNames} ${passenger.passports[0].surname}` : '??')}
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="font-bold text-text-primary text-lg truncate">{(passenger.passports || []).length > 0 ? `${passenger.passports[0].surname}, ${passenger.passports[0].firstNames}` : 'No Passport'}</p>
                            <p className="text-sm text-text-secondary">{passenger.category}</p>
                        </div>
                    </div>
                    <ChevronDownIcon className={`h-5 w-5 text-text-secondary transition-transform flex-shrink-0 ml-2 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
                {isExpanded && (
                    <>
                        <p className="text-sm text-text-secondary mt-2 font-mono truncate">
                            <span className="font-sans font-medium">Passport:</span> {(passenger.passports || []).length > 0 ? (passenger.passports[0].passportNumber || 'N/A') : 'N/A'}
                        </p>
                        <div className="mt-2">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${status.bgClass} ${status.colorClass}`}>
                                {status.text}
                            </span>
                        </div>
                    </>
                )}
            </div>
            {isExpanded && (
                <div className="flex justify-end gap-2 mt-2 border-t border-border-default p-3 bg-surface-soft/50 rounded-b-lg">
                    <button onClick={(e) => { e.stopPropagation(); onDelete(passenger) }} className="px-3 py-1 text-sm font-semibold text-danger hover:bg-danger/10 rounded-md transition-colors">Delete</button>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(passenger) }} className="px-3 py-1 text-sm font-semibold text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-colors">Edit</button>
                    <button onClick={(e) => { e.stopPropagation(); onSelect(passenger) }} className="px-3 py-1 text-sm font-semibold text-primary hover:bg-primary/10 rounded-md transition-colors">View</button>
                </div>
            )}
        </div>
    );
});


interface PassengerListItemProps {
    passenger: Passenger;
    onSelect: (p: Passenger) => void;
    onEdit: (p: Passenger) => void;
    onDelete: (p: Passenger) => void;
    isExpanded: boolean;
    onToggle: () => void;
}

const PassengerListItem = React.memo(({ passenger, onSelect, onEdit, onDelete, isExpanded, onToggle }: PassengerListItemProps) => {
    const status = getExpiryStatus((passenger.passports || []).length > 0 ? passenger.passports[0].dateOfExpiry : '');
    // Use w-full and fixed layout parent to prevent overflow. 
    // Removed whitespace-nowrap from tdBaseClasses to allow content to fit or truncate properly.
    const tdBaseClasses = "px-4 py-3 md:px-6 md:py-4 block md:table-cell text-right md:text-left border-b md:border-b-0 border-border-default/50 relative before:content-[attr(data-label)] before:float-left before:font-bold md:before:content-none";
    
    return (
        <tr className="block md:table-row mb-4 md:mb-0 border md:border-b md:border-border-default rounded-lg shadow-sm md:shadow-none bg-surface">
            <td className={`${tdBaseClasses} cursor-pointer md:cursor-auto`} data-label="Name" onClick={onToggle}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3 w-full min-w-0">
                    {passenger.profilePhotoUrl ? (
                        <img src={passenger.profilePhotoUrl} alt="Profile" className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                         <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base flex-shrink-0">
                            {getInitials((passenger.passports || []).length > 0 ? `${passenger.passports[0].firstNames} ${passenger.passports[0].surname}` : '??')}
                        </div>
                    )}
                    <div className="min-w-0 truncate">
                        <div className="text-sm font-medium text-text-primary truncate" title={(passenger.passports || []).length > 0 ? `${passenger.passports[0].surname}, ${passenger.passports[0].firstNames}` : 'No Passport'}>{(passenger.passports || []).length > 0 ? `${passenger.passports[0].surname}, ${passenger.passports[0].firstNames}` : 'No Passport'}</div>
                    </div>
                </div>
                <ChevronDownIcon className={`md:hidden h-5 w-5 text-text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </td>
            <td className={`${tdBaseClasses} ${isExpanded ? 'block' : 'hidden'} md:table-cell text-sm text-text-secondary`} data-label="Category">{passenger.category}</td>
            <td className={`${tdBaseClasses} ${isExpanded ? 'block' : 'hidden'} md:table-cell text-sm text-text-secondary font-mono`} data-label="Passport No.">{(passenger.passports || []).length > 0 ? (passenger.passports[0].passportNumber || 'N/A') : 'N/A'}</td>
            <td className={`${tdBaseClasses} ${isExpanded ? 'block' : 'hidden'} md:table-cell text-sm`} data-label="Passport Expiry">
                <span className={`${status.bgClass} ${status.colorClass} px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap`}>
                    {status.text}
                </span>
            </td>
            <td className={`${tdBaseClasses} ${isExpanded ? 'block' : 'hidden'} md:table-cell text-right text-sm font-medium`} data-label="Actions">
              <div className="flex justify-end gap-2">
                  <button onClick={(e) => { e.stopPropagation(); onSelect(passenger); }} className="text-primary hover:text-primary-dark">View</button>
                  <button onClick={(e) => { e.stopPropagation(); onEdit(passenger); }} className="text-indigo-400 hover:text-indigo-300">Edit</button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(passenger); }} className="text-danger hover:text-red-700">Delete</button>
              </div>
            </td>
        </tr>
    );
});


const PassengerListScreen: React.FC<PassengerListScreenProps> = ({ 
  company, 
  onBack, 
  onAddNew, 
  onSelectPassenger, 
  onEditPassenger,
  currentUser
}) => {
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const { showDuplicates, setShowDuplicates, filterDuplicates, duplicateIds = new Set() } = useDuplicateFilter();
  const [allPassengersForCompliance, setAllPassengersForCompliance] = useState<Passenger[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('passenger-view') as 'list' | 'grid') || 'list';
  });
  const [passengerToDelete, setPassengerToDelete] = useState<Passenger | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filter, setFilter] = useState<'all' | PassengerCategory>(PassengerCategory.Expatriate);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Accordion state
  const [expandedPassengerId, setExpandedPassengerId] = useState<string | null>(null);

  const handleToggleExpand = (passengerId: string) => {
    setExpandedPassengerId(prevId => (prevId === passengerId ? null : passengerId));
  };


  const fetchPassengers = useCallback(async (loadMore = false) => {
    if (!loadMore) {
        setIsLoading(true);
        setPassengers([]);
        setLastVisible(null);
        setHasMore(true);
    } else {
        if (!hasMore) return;
        setIsLoadingMore(true);
    }
    setError(null);

    try {
        const { 
            passengers: newPassengers = [], 
            lastVisible: newLastVisible = null, 
            hasMore: moreToLoad = false 
        } = await getPassengersByCompanyPaginated({
            companyId: company.id,
            limitNum: 20,
            startAfterDoc: loadMore && lastVisible ? lastVisible : undefined,
        });
        
        // This is a workaround for the compliance report needing all data.
        if (!loadMore) {
            setAllPassengersForCompliance(newPassengers);
        } else {
            setAllPassengersForCompliance(prev => [...prev, ...newPassengers]);
        }
        
        setPassengers(prev => loadMore ? [...prev, ...newPassengers] : newPassengers);
        setLastVisible(newLastVisible);
        setHasMore(moreToLoad);
    } catch (err: any) {
        console.error("Failed to fetch passengers:", err);
        if (err.message && err.message.includes('requires an index')) {
            const matches = err.message.match(/(https?:\/\/[^\s]+)/g);
            const link = matches ? matches[0] : null;
            if (link) {
                setError(
                    <div className="flex flex-col items-center gap-2">
                        <span>The query requires a Firestore index.</span>
                        <a 
                            href={link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="bg-primary text-white px-4 py-2 rounded-md font-bold hover:bg-primary-dark transition-colors text-sm"
                        >
                            Create Index
                        </a>
                    </div>
                );
            } else {
                setError("The query requires a Firestore index. Please check the console for the creation link.");
            }
        } else {
            setError("Could not load passenger data.");
        }
    } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
    }
  }, [company.id, lastVisible, hasMore]);

  useEffect(() => {
    fetchPassengers(false);

    // Listen to RTDB for real-time updates of this company's passengers
    // This is much more efficient than listening to the global passengers path.
    const unsubscribe = listenToRtdb(`passengers_by_company/${company.id}`, (data) => {
        if (data) {
            const companyPassengers = Object.values(data) as Passenger[];
            
            // Only update if we have data
            if (companyPassengers.length > 0) {
                setPassengers(companyPassengers);
                setAllPassengersForCompliance(companyPassengers);
                setIsLoading(false);
            }
        }
    });

    return () => unsubscribe();
  }, [company.id]);


  const handleDeleteClick = useCallback((passenger: Passenger) => {
    setPassengerToDelete(passenger);
  }, []);

  const handleConfirmDelete = async () => {
    if (!passengerToDelete) return;

    setIsDeleting(true);
    setError(null);
    try {
        await deletePassenger(passengerToDelete.id);
        setPassengers(prev => prev.filter(p => p.id !== passengerToDelete.id)); // Optimistic update
        setPassengerToDelete(null);
    } catch (err) {
        setError("Failed to delete personnel. Please try again.");
        console.error(err);
    } finally {
        setIsDeleting(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('passenger-view', view);
  }, [view]);

  const filteredPassengers = useMemo(() => {
    const basePassengers = filterDuplicates<Passenger>(passengers);
    const categoryFiltered = filter === 'all'
      ? basePassengers
      : basePassengers.filter(p => p.category === filter);

    if (!searchQuery.trim()) {
      return categoryFiltered;
    }

    const lowercasedQuery = searchQuery.toLowerCase();
    return categoryFiltered.filter(p => {
        const fullName = (p.passports || []).length > 0 ? `${p.passports[0].firstNames} ${p.passports[0].surname}`.toLowerCase() : '';
        const passportNumber = (p.passports || []).length > 0 ? (p.passports[0].passportNumber?.toLowerCase() || '') : '';
        return fullName.includes(lowercasedQuery) || passportNumber.includes(lowercasedQuery);
    });
  }, [passengers, filter, searchQuery, filterDuplicates]);


  const FilterButton: React.FC<{
    value: 'all' | PassengerCategory;
    label: string;
  }> = ({ value, label }) => {
    const count = useMemo(() => {
        if (value === 'all') return allPassengersForCompliance.length;
        return allPassengersForCompliance.filter(p => p.category === value).length;
    }, [allPassengersForCompliance, value]);
      
    return (
        <button
            onClick={() => setFilter(value)}
            className={`px-3 py-1.5 font-semibold rounded-md text-sm transition-colors ${
                filter === value 
                ? 'bg-primary text-white shadow' 
                : 'text-text-secondary hover:bg-surface-soft'
            }`}
        >
            {label} <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs ${filter === value ? 'bg-white/20' : 'bg-surface'}`}>{count}</span>
        </button>
    );
  };

  const onSelectPassengerCB = useCallback(onSelectPassenger, [onSelectPassenger]);
  const onEditPassengerCB = useCallback(onEditPassenger, [onEditPassenger]);

  const renderContent = () => {
    if (isLoading) return <Spinner />;
    if (error) return <div className="text-center py-16 text-danger">{error}</div>;

    if (filteredPassengers.length === 0) {
      return (
        <div className="text-center py-12 text-text-secondary bg-surface rounded-lg shadow-md border border-border-default">
            {searchQuery ? `No personnel found for your search "${searchQuery}".` : `No personnel found for this company${filter !== 'all' ? ` in the '${filter}' category` : ''}.`}
        </div>
      );
    }

    if (view === 'grid') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPassengers.map(p => (
            <PassengerCard 
                key={p.id} 
                passenger={p} 
                onSelect={onSelectPassengerCB} 
                onEdit={onEditPassengerCB} 
                onDelete={handleDeleteClick}
                isExpanded={expandedPassengerId === p.id}
                onToggle={() => handleToggleExpand(p.id)}
            />
          ))}
        </div>
      );
    }

    // LIST VIEW: Using table-fixed and w-full to ensure responsiveness
    return (
       <div className="bg-transparent md:bg-surface rounded-lg md:shadow-md md:border md:border-border-default overflow-hidden">
         <div className="overflow-x-auto">
            <table className="min-w-full table-fixed">
              <thead className="hidden md:table-header-group bg-surface-soft">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-[35%]">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-[15%]">Category</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-[15%]">Passport No.</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-[15%]">Passport Expiry</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider w-[20%]">Actions</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group">
                {filteredPassengers.map((p) => (
                    <PassengerListItem 
                        key={p.id} 
                        passenger={p} 
                        onSelect={onSelectPassengerCB} 
                        onEdit={onEditPassengerCB} 
                        onDelete={handleDeleteClick}
                        isExpanded={expandedPassengerId === p.id}
                        onToggle={() => handleToggleExpand(p.id)}
                    />
                ))}
              </tbody>
            </table>
          </div>
       </div>
    );
  };

  return (
    <>
      <BackButton onClick={onBack} />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
              <CompanyLogo company={company} className="h-12 w-12" />
              <div>
                  <h2 className="text-3xl font-bold text-text-primary">{company.name}</h2>
                  <p className="text-text-secondary">Personnel Management</p>
              </div>
          </div>
        <div className="flex gap-2 flex-shrink-0 items-center">
          <DuplicateToggle 
              showDuplicates={showDuplicates} 
              onToggle={() => setShowDuplicates(!showDuplicates)} 
              duplicateCount={(duplicateIds?.size) || 0}
              currentUser={currentUser}
          />
          <div className="flex items-center gap-1 p-1 bg-surface-soft rounded-lg">
              <button onClick={() => setView('list')} className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-primary text-white shadow' : 'text-text-secondary hover:bg-border-default'}`} title="List View">
                  <QueueListIcon className="h-5 w-5" />
              </button>
              <button onClick={() => setView('grid')} className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-primary text-white shadow' : 'text-text-secondary hover:bg-border-default'}`} title="Grid View">
                  <Squares2X2Icon className="h-5 w-5" />
              </button>
          </div>
          <Button onClick={() => setIsModalOpen(true)} variant="secondary">Compliance Report</Button>
          <Button onClick={onAddNew}>Add New Personnel</Button>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
            <FilterButton value={PassengerCategory.Expatriate} label="Expatriates" />
            <FilterButton value={PassengerCategory.Local} label="Local" />
            <FilterButton value={PassengerCategory.WalkIn} label="Walk-ins" />
            <FilterButton value="all" label="View All" />
        </div>
        <div className="flex-grow min-w-[250px] sm:max-w-xs">
            <SearchInput 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or passport..."
            />
        </div>
      </div>

      <div className="mt-4">
        {renderContent()}
      </div>

       {hasMore && !isLoading && !searchQuery && (
          <div className="mt-6 text-center">
              <Button onClick={() => fetchPassengers(true)} disabled={isLoadingMore} variant="secondary">
                  {isLoadingMore ? 'Loading...' : 'Load More'}
              </Button>
          </div>
       )}
      
      <ChecklistComplianceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        passengers={allPassengersForCompliance} 
        company={company} 
      />
      <ConfirmationModal
        isOpen={!!passengerToDelete}
        onClose={() => setPassengerToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Confirm Deletion"
        confirmText="Delete"
        isConfirming={isDeleting}
      >
        <p>
          Are you sure you want to delete the profile for <strong className="text-text-primary">{passengerToDelete?.passports && passengerToDelete.passports.length > 0 ? `${passengerToDelete.passports[0].firstNames} ${passengerToDelete.passports[0].surname}` : 'Unknown'}</strong>?
        </p>
        <p className="mt-2 text-sm">This action is permanent and cannot be undone.</p>
        {typeof error === 'string' && <p className="mt-2 text-sm text-danger">{error}</p>}
      </ConfirmationModal>
    </>
  );
};

export default PassengerListScreen;
