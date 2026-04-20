import React, { useState, useEffect, useMemo } from 'react';
import { Checklist, Company, Passenger } from '../types';
import { getChecklists } from '../services/firebase';
import { CheckCircleIcon, XCircleIcon, DocumentWarningIcon, XMarkIcon } from '../components/icons/index';
import { SearchInput } from '../components/SearchInput';

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-border-default p-4">
                    <h3 className="text-xl font-semibold text-text-primary">{title}</h3>
                     <button onClick={onClose} className="text-text-secondary hover:text-danger p-1 rounded-full transition-colors">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};

const Spinner: React.FC = () => (
    <div className="flex justify-center items-center py-8">
        <div className="flex items-center justify-center space-x-2">
            <div className="h-4 w-4 bg-primary rounded-full animate-pulse [animation-delay:-0.3s]"></div>
            <div className="h-4 w-4 bg-primary rounded-full animate-pulse [animation-delay:-0.15s]"></div>
            <div className="h-4 w-4 bg-primary rounded-full animate-pulse"></div>
        </div>
    </div>
);

const getExpiryStatusSimple = (dateString: string): 'valid' | 'expiring' | 'expired' | 'missing' => {
    if (!dateString) return 'missing';

    // FIX: Parse date string as local time to avoid timezone discrepancies.
    const dateParts = dateString.split('-').map(Number);
     if (dateParts.length !== 3 || dateParts.some(isNaN)) {
        return 'missing'; // Or handle as an error, but 'missing' is safer here.
    }
    const expiryDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'expired';
    if (diffDays <= 90) return 'expiring';
    return 'valid';
};

const checkCompliance = (passenger: Passenger, documentType: string): 'ok' | 'warning' | 'missing' => {
    const docType = documentType.toLowerCase().trim();

    if (docType.includes('passport')) {
        const status = getExpiryStatusSimple(passenger.passports.length > 0 ? passenger.passports[0].dateOfExpiry : '');
        if (status === 'expired' || status === 'missing') return 'missing';
        if (status === 'expiring') return 'warning';
        return 'ok';
    }

    if (docType.includes('ghana card')) {
        if (!passenger.ghanaCardData || !passenger.ghanaCardData.cardNumber) return 'missing';
        const status = getExpiryStatusSimple(passenger.ghanaCardData.dateOfExpiry);
        if (status === 'expired' || status === 'missing') return 'missing';
        if (status === 'expiring') return 'warning';
        return 'ok';
    }

    if (docType.includes('visa')) {
        if (!passenger.visas || passenger.visas.length === 0) return 'missing';
        const statuses = passenger.visas.map(v => getExpiryStatusSimple(v.dateOfExpiry));
        if (statuses.some(s => s === 'valid')) return 'ok';
        if (statuses.some(s => s === 'expiring')) return 'warning';
        return 'missing';
    }

    if (docType.includes('permit')) {
        if (!passenger.permits || passenger.permits.length === 0) return 'missing';
        const permitType = docType.replace('permit', '').trim();
        
        const relevantPermits = permitType
            ? passenger.permits.filter(p => p.type?.toLowerCase().includes(permitType))
            : passenger.permits;

        if (relevantPermits.length === 0) return 'missing';

        const statuses = relevantPermits.map(p => getExpiryStatusSimple(p.dateOfExpiry));
        if (statuses.some(s => s === 'valid')) return 'ok';
        if (statuses.some(s => s === 'expiring')) return 'warning';
        return 'missing';
    }

    if (docType.includes('ticket')) {
        return passenger.tickets && passenger.tickets.length > 0 ? 'ok' : 'missing';
    }
    
    return 'missing'; 
};

interface ChecklistComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  passengers: Passenger[];
  company: Company;
}

export const ChecklistComplianceModal: React.FC<ChecklistComplianceModalProps> = ({ isOpen, onClose, passengers, company }) => {
    const [checklists, setChecklists] = useState<Checklist[]>([]);
    const [selectedChecklistId, setSelectedChecklistId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            setSelectedChecklistId('');
            setSearchQuery('');
            getChecklists()
                .then(data => {
                    const sortedData = data.sort((a,b) => a.activityName.localeCompare(b.activityName));
                    setChecklists(sortedData);
                    if (sortedData.length > 0) {
                        setSelectedChecklistId(sortedData[0].id);
                    }
                })
                .catch(err => console.error("Failed to load checklists", err))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen]);

    const selectedChecklist = useMemo(() => {
        return checklists.find(c => c.id === selectedChecklistId);
    }, [checklists, selectedChecklistId]);

    const categoryFilteredPassengers = useMemo(() => {
        if (!selectedChecklist) return [];
        return passengers.filter(p => {
            if (!selectedChecklist.category || selectedChecklist.category === 'All') {
                return true; // Include all if checklist is for 'All' or category is not defined
            }
            return p.category === selectedChecklist.category;
        });
    }, [passengers, selectedChecklist]);

    const complianceData = useMemo(() => {
        if (!selectedChecklist) return [];
        
        const lowercasedQuery = searchQuery.toLowerCase().trim();
        const searchFilteredPassengers = lowercasedQuery
            ? categoryFilteredPassengers.filter(p => `${p.passports.length > 0 ? p.passports[0].firstNames : ''} ${p.passports.length > 0 ? p.passports[0].surname : ''}`.toLowerCase().includes(lowercasedQuery))
            : categoryFilteredPassengers;

        return searchFilteredPassengers.map(passenger => {
            const compliance = selectedChecklist.requiredDocuments.reduce((acc, doc) => {
                acc[doc] = checkCompliance(passenger, doc);
                return acc;
            }, {} as Record<string, 'ok' | 'warning' | 'missing'>);
            return {
                passengerName: `${passenger.passports.length > 0 ? passenger.passports[0].firstNames : ''} ${passenger.passports.length > 0 ? passenger.passports[0].surname : ''}`,
                compliance
            };
        });
    }, [categoryFilteredPassengers, selectedChecklist, searchQuery]);

    const renderStatusIcon = (status: 'ok' | 'warning' | 'missing') => {
        const iconClassName = "w-6 h-6 mx-auto";
        switch (status) {
            case 'ok': return <CheckCircleIcon title="Valid" className={`${iconClassName} text-success`} />;
            case 'warning': return <DocumentWarningIcon title="Expiring Soon" className={`${iconClassName} text-warning`} />;
            case 'missing': return <XCircleIcon title="Missing or Expired" className={`${iconClassName} text-danger`} />;
            default: return null;
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Checklist Compliance Report for ${company.name}`}>
            {isLoading ? <Spinner /> : (
                <div>
                    <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center flex-wrap">
                        <div className="w-full sm:w-auto sm:min-w-[250px]">
                            <label htmlFor="checklist-select" className="block text-sm font-medium text-text-secondary mb-1">Select Checklist:</label>
                            <select
                                id="checklist-select"
                                value={selectedChecklistId}
                                onChange={(e) => setSelectedChecklistId(e.target.value)}
                                className="w-full px-3 py-2 border bg-background border-border-default rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="" disabled>-- Select an Activity --</option>
                                {checklists.map(cl => (
                                    <option key={cl.id} value={cl.id}>{cl.activityName} ({cl.category || 'All'})</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-full sm:w-auto sm:flex-grow">
                             <label htmlFor="compliance-search" className="sr-only">Search Passengers</label>
                             <SearchInput
                                id="compliance-search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search passengers in report..."
                            />
                        </div>
                    </div>

                    {selectedChecklist ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border-default border border-border-default">
                                <thead className="bg-surface-soft">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Passenger ({complianceData.length} / {categoryFilteredPassengers.length})</th>
                                        {selectedChecklist.requiredDocuments.map(doc => (
                                            <th key={doc} scope="col" className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">{doc}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-surface divide-y divide-border-default">
                                    {complianceData.length > 0 ? complianceData.map(row => (
                                        <tr key={row.passengerName}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{row.passengerName}</td>
                                            {selectedChecklist.requiredDocuments.map(doc => (
                                                <td key={doc} className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                    {renderStatusIcon(row.compliance[doc])}
                                                </td>
                                            ))}
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={selectedChecklist.requiredDocuments.length + 1} className="text-center py-10 text-text-secondary">
                                                {searchQuery 
                                                    ? `No matching passengers found for "${searchQuery}".` 
                                                    : `No passengers match the category '${selectedChecklist.category || 'All'}' for this checklist.`}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-center text-text-secondary py-8">{checklists.length > 0 ? 'Please select a checklist to view the report.' : 'No checklists have been created. Please add one via Company Settings.'}</p>
                    )}
                </div>
            )}
        </Modal>
    );
};