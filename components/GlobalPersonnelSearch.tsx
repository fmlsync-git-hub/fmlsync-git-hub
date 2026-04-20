
import React, { useState, useEffect, useMemo } from 'react';
import { Passenger, User, UserSettings } from '../types';
import { listenToAccessiblePassengers } from '../services/firebase';
import { useCompanies } from '../context/CompanyContext';
import { SearchInput } from './SearchInput';

interface GlobalPersonnelSearchProps {
    onSelectPassenger: (passenger: Passenger) => void;
    currentUser?: User & UserSettings;
}

const GlobalPersonnelSearch: React.FC<GlobalPersonnelSearchProps> = ({ onSelectPassenger, currentUser }) => {
    const [allPassengers, setAllPassengers] = useState<Passenger[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const { companies } = useCompanies();

    useEffect(() => {
        if (!currentUser) return;
        
        // Use the smart listener that handles role-based access automatically
        const unsubscribe = listenToAccessiblePassengers(currentUser, (passengers) => {
            setAllPassengers(passengers);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser]);

    const searchResults = useMemo(() => {
        if (!searchQuery.trim() || searchQuery.trim().length < 2) {
            return [];
        }
        const query = searchQuery.toLowerCase().trim();
        return allPassengers.filter(p => {
            const passport = p.passports && p.passports.length > 0 ? p.passports[0] : null;
            const fullName = `${passport?.firstNames || ''} ${passport?.surname || ''}`.toLowerCase();
            const passportNumber = passport?.passportNumber?.toLowerCase() || '';
            const ghanaCardNumber = p.ghanaCardData?.cardNumber?.toLowerCase() || '';
            const hasVisaMatch = p.visas.some(v => v.visaNumber?.toLowerCase().includes(query));

            return fullName.includes(query) ||
                   passportNumber.includes(query) ||
                   ghanaCardNumber.includes(query) ||
                   hasVisaMatch;
        });
    }, [searchQuery, allPassengers]);
    
    const getCompanyName = (companyId: string) => companies.find(c => c.id === companyId)?.name || 'Unknown';

    if (!currentUser) return null;

    return (
        <div className="w-full max-w-lg mx-auto relative">
            <SearchInput
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search any personnel by name, passport, etc..."
            />
            {searchQuery.trim().length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-surface rounded-lg shadow-lg border border-border-default z-20 max-h-80 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-4 text-center text-text-secondary">Loading...</div>
                    ) : searchResults.length > 0 ? (
                        <ul>
                            {searchResults.slice(0, 10).map(p => ( // Limit to 10 results for performance
                                <li key={p.id}
                                    onClick={() => {
                                        onSelectPassenger(p);
                                        setSearchQuery(''); // clear search on select
                                    }}
                                    className="p-4 hover:bg-surface-soft cursor-pointer border-b border-border-default last:border-b-0"
                                >
                                    <p className="font-semibold text-text-primary">{p.passports && p.passports.length > 0 ? `${p.passports[0].firstNames} ${p.passports[0].surname}` : 'No Passport'}</p>
                                    <p className="text-sm text-text-secondary">{getCompanyName(p.companyId)} - Passport: {p.passports && p.passports.length > 0 ? (p.passports[0].passportNumber || 'N/A') : 'N/A'}</p>
                                </li>
                            ))}
                        </ul>
                    ) : searchQuery.trim().length >= 2 ? (
                        <div className="p-4 text-center text-text-secondary">No results found.</div>
                    ) : (
                         <div className="p-4 text-center text-text-secondary">Keep typing to search...</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalPersonnelSearch;
