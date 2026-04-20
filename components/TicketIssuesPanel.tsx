import React, { useState, useEffect } from 'react';
import { TicketIssue, Passenger, Company, PassengerCategory, User, UserSettings } from '../types';
import { listenToTicketIssues, updateTicketIssue, deleteTicketIssue, updatePassenger, addPassenger } from '../services/firebase';
import { CheckCircleIcon, XCircleIcon, TrashIcon, DocumentTextIcon, UserIcon } from './icons';
import { useFormatters } from '../hooks/useFormatters';

interface TicketIssuesPanelProps {
    allPassengers: Passenger[];
    companies: Company[];
    currentUser?: User & UserSettings;
}

export const TicketIssuesPanel: React.FC<TicketIssuesPanelProps> = ({ allPassengers, companies, currentUser }) => {
    const [issues, setIssues] = useState<TicketIssue[]>([]);
    const [selectedIssue, setSelectedIssue] = useState<TicketIssue | null>(null);
    const [selectedPassengerId, setSelectedPassengerId] = useState<string>('');
    const [walkInCompanyId, setWalkInCompanyId] = useState<string>('');
    const [isAddingWalkIn, setIsAddingWalkIn] = useState(false);
    const { formatDate } = useFormatters();

    useEffect(() => {
        const unsubscribe = listenToTicketIssues((data) => {
            setIssues(data.filter((i: TicketIssue) => i.status === 'Open'));
        });
        return () => unsubscribe();
    }, []);

    const handleResolve = async () => {
        if (!selectedIssue || !selectedPassengerId) return;

        try {
            const passenger = allPassengers.find(p => p.id === selectedPassengerId);
            if (!passenger) return;

            const newTicket = {
                id: Date.now().toString(),
                ticketNumber: selectedIssue.extractedData.ticketNumber || '',
                airline: selectedIssue.extractedData.airline || '',
                departureCity: selectedIssue.extractedData.departureCity || '',
                arrivalCity: selectedIssue.extractedData.arrivalCity || '',
                travelDate: selectedIssue.extractedData.travelDate || '',
                travelTime: selectedIssue.extractedData.travelTime || '',
                status: 'Issued' as const,
                document: {
                    fileName: selectedIssue.fileName,
                    mimeType: selectedIssue.fileType,
                    size: 0, // Unknown size from issue
                    dataUrl: selectedIssue.document?.dataUrl || ''
                }
            };

            // 1. Add ticket to passenger
            const updatedTickets = [...(passenger.tickets || []), newTicket];
            await updatePassenger(passenger.id, { tickets: updatedTickets });

            // 2. Mark issue as resolved
            await updateTicketIssue(selectedIssue.id, { 
                status: 'Resolved',
                resolvedAt: new Date(),
                resolvedBy: currentUser?.username || 'Admin'
            });

            setSelectedIssue(null);
            setSelectedPassengerId('');

        } catch (error) {
            console.error("Failed to resolve issue:", error);
            alert("Failed to resolve issue. Please try again.");
        }
    };

    const handleAddWalkIn = async () => {
        if (!selectedIssue || !walkInCompanyId) return;

        setIsAddingWalkIn(true);
        try {
            const newTicket = {
                id: Date.now().toString(),
                ticketNumber: selectedIssue.extractedData.ticketNumber || '',
                airline: selectedIssue.extractedData.airline || '',
                departureCity: selectedIssue.extractedData.departureCity || '',
                arrivalCity: selectedIssue.extractedData.arrivalCity || '',
                travelDate: selectedIssue.extractedData.travelDate || '',
                travelTime: selectedIssue.extractedData.travelTime || '',
                status: 'Issued' as const,
                document: {
                    fileName: selectedIssue.fileName,
                    mimeType: selectedIssue.fileType,
                    size: 0,
                    dataUrl: selectedIssue.document?.dataUrl || ''
                }
            };

            let surname = 'Unknown';
            let firstNames = 'Walk-in';
            
            if (selectedIssue.suggestedPassengerName) {
                const parts = selectedIssue.suggestedPassengerName.split(' ');
                if (parts.length > 1) {
                    surname = parts.pop() || 'Unknown';
                    firstNames = parts.join(' ');
                } else {
                    surname = selectedIssue.suggestedPassengerName;
                    firstNames = '';
                }
            }

            const newPassenger: Omit<Passenger, 'id' | 'createdAt' | 'createdBy'> = {
                companyId: walkInCompanyId,
                category: PassengerCategory.WalkIn,
                passports: [{
                    id: Date.now().toString(),
                    type: 'P',
                    code: '',
                    passportNumber: 'WALK-IN-' + Date.now().toString().slice(-6),
                    surname,
                    firstNames,
                    nationality: '',
                    dateOfBirth: '',
                    sex: '',
                    placeOfBirth: '',
                    dateOfIssue: '',
                    authority: '',
                    dateOfExpiry: '',
                }],
                contactData: {},
                visas: [],
                permits: [],
                tickets: [newTicket],
            };

            await addPassenger(newPassenger, currentUser?.username || 'Admin');

            await updateTicketIssue(selectedIssue.id, { 
                status: 'Resolved',
                resolvedAt: new Date(),
                resolvedBy: currentUser?.username || 'Admin'
            });

            setSelectedIssue(null);
            setWalkInCompanyId('');
        } catch (error) {
            console.error("Failed to add walk-in traveller:", error);
            alert("Failed to add walk-in traveller. Please try again.");
        } finally {
            setIsAddingWalkIn(false);
        }
    };

    const handleIgnore = async (issue: TicketIssue) => {
        if (confirm("Are you sure you want to ignore this issue? It will be removed from the list.")) {
            await deleteTicketIssue(issue.id);
            if (selectedIssue?.id === issue.id) {
                setSelectedIssue(null);
            }
        }
    };

    if (issues.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-surface rounded-xl border border-border-default">
                <CheckCircleIcon className="h-16 w-16 text-success mb-4" />
                <h3 className="text-xl font-bold text-text-primary">All Clear!</h3>
                <p className="text-text-secondary">No ticket issues requiring attention.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
            {/* List */}
            <div className="lg:col-span-1 bg-surface border border-border-default rounded-xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-border-default bg-surface-soft">
                    <h3 className="font-bold text-text-primary">Open Issues ({issues.length})</h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {issues.map(issue => (
                        <div 
                            key={issue.id}
                            onClick={() => setSelectedIssue(issue)}
                            className={`p-4 border-b border-border-default cursor-pointer transition-colors hover:bg-surface-soft ${selectedIssue?.id === issue.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold text-text-primary truncate">{issue.suggestedPassengerName || 'Unknown Passenger'}</span>
                                <span className="text-xs text-text-secondary">{formatDate(issue.createdAt?.toDate ? issue.createdAt.toDate() : new Date())}</span>
                            </div>
                            <div className="text-xs text-text-secondary flex items-center gap-1 mb-2">
                                <DocumentTextIcon className="h-3 w-3" />
                                <span className="truncate">{issue.fileName}</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full">Unmatched</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Detail */}
            <div className="lg:col-span-2 bg-surface border border-border-default rounded-xl overflow-hidden flex flex-col">
                {selectedIssue ? (
                    <div className="flex flex-col h-full">
                        <div className="p-4 border-b border-border-default flex justify-between items-center bg-surface-soft">
                            <h3 className="font-bold text-text-primary">Resolve Issue</h3>
                            <button onClick={() => handleIgnore(selectedIssue)} className="text-danger hover:bg-danger/10 px-3 py-1 rounded text-sm transition-colors flex items-center gap-1">
                                <TrashIcon className="h-4 w-4" /> Ignore / Delete
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Document Preview */}
                                <div>
                                    <h4 className="text-sm font-bold text-text-secondary uppercase mb-2">Document</h4>
                                    <div className="border border-border-default rounded-lg overflow-hidden bg-black/5 h-64 flex items-center justify-center">
                                        {selectedIssue.document?.dataUrl?.startsWith('data:image') || selectedIssue.fileType.includes('image') ? (
                                            <img src={selectedIssue.document?.dataUrl} alt="Ticket" className="max-w-full max-h-full object-contain" />
                                        ) : (
                                            <div className="text-center p-4">
                                                <DocumentTextIcon className="h-12 w-12 text-text-secondary mx-auto mb-2" />
                                                <p className="text-sm text-text-primary">PDF Document</p>
                                                <p className="text-xs text-text-secondary">Preview not available</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4 space-y-2">
                                        <div className="flex justify-between text-sm border-b border-border-default pb-1">
                                            <span className="text-text-secondary">Extracted Name:</span>
                                            <span className="font-mono font-bold">{selectedIssue.suggestedPassengerName || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm border-b border-border-default pb-1">
                                            <span className="text-text-secondary">Airline:</span>
                                            <span>{selectedIssue.extractedData.airline || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm border-b border-border-default pb-1">
                                            <span className="text-text-secondary">Route:</span>
                                            <span>{selectedIssue.extractedData.departureCity} &rarr; {selectedIssue.extractedData.arrivalCity}</span>
                                        </div>
                                        <div className="flex justify-between text-sm border-b border-border-default pb-1">
                                            <span className="text-text-secondary">Date:</span>
                                            <span>{selectedIssue.extractedData.travelDate || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action */}
                                <div>
                                    <h4 className="text-sm font-bold text-text-secondary uppercase mb-2">Assign to Personnel</h4>
                                    <div className="bg-surface-soft p-4 rounded-lg border border-border-default">
                                        <p className="text-sm text-text-secondary mb-4">
                                            Select a personnel from the list to assign this ticket to. The document will be attached to their profile.
                                        </p>
                                        
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-text-secondary mb-1">Search Personnel</label>
                                                <select 
                                                    className="w-full p-2 rounded border border-border-default bg-background focus:ring-2 focus:ring-primary outline-none"
                                                    value={selectedPassengerId}
                                                    onChange={(e) => setSelectedPassengerId(e.target.value)}
                                                >
                                                    <option value="">-- Select Personnel --</option>
                                                    {allPassengers.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {(p.passports || []).length > 0 ? `${p.passports[0].surname}, ${p.passports[0].firstNames}` : 'No Passport'} ({p.companyId})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <button 
                                                onClick={handleResolve}
                                                disabled={!selectedPassengerId}
                                                className="w-full py-2 bg-primary text-white font-bold rounded hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                            >
                                                <CheckCircleIcon className="h-5 w-5" />
                                                Confirm Assignment
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-6 border-t border-border-default pt-4">
                                        <h4 className="text-sm font-bold text-text-secondary uppercase mb-2">Or Add as Walk-in Traveller</h4>
                                        <p className="text-sm text-text-secondary mb-4">
                                            If this person is not in the system, you can add them as a walk-in traveller.
                                        </p>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-text-secondary mb-1">Select Company</label>
                                                <select 
                                                    className="w-full p-2 rounded border border-border-default bg-background focus:ring-2 focus:ring-primary outline-none"
                                                    value={walkInCompanyId}
                                                    onChange={(e) => setWalkInCompanyId(e.target.value)}
                                                >
                                                    <option value="">-- Select Company --</option>
                                                    {companies.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button 
                                                onClick={handleAddWalkIn}
                                                disabled={!walkInCompanyId || isAddingWalkIn}
                                                className="w-full py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                            >
                                                <UserIcon className="h-5 w-5" />
                                                {isAddingWalkIn ? 'Adding...' : 'Add as Walk-in Traveller'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-text-secondary">
                        Select an issue to view details
                    </div>
                )}
            </div>
        </div>
    );
};
