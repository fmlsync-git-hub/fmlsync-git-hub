
import React, { useState, useEffect } from 'react';
import { Passenger, UploadedFile, VisaData, PermitData, TicketData, GhanaCardData, PassportData } from '../types';
import { ShareToolbar } from './ShareToolbar';
import { XMarkIcon, ClockIcon, PencilIcon } from './icons/index';
import { useFormatters, getExpiryStatus } from '../hooks/useFormatters';
import { usePersonnelStatus } from '../hooks/usePersonnelStatus';
import { ImageEditorModal } from './ImageEditorModal';
import { updatePassenger } from '../services/firebase';
import { ProfilePhotoViewerModal } from './ProfilePhotoViewerModal';

// --- Reusable Components ---
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; headerActions?: React.ReactNode }> = ({ isOpen, onClose, title, children, headerActions }) => {
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);
    
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn" aria-modal="true" role="dialog">
            <div className="bg-surface rounded-xl shadow-2xl border border-border-default w-full max-w-4xl animate-scaleIn flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-border-default p-4 sm:p-6">
                    <div className="text-xl font-bold text-text-primary truncate pr-4">{title}</div>
                    <div className="flex items-center gap-2">
                        {headerActions}
                        <button onClick={onClose} className="text-text-secondary hover:text-danger p-2 rounded-full hover:bg-surface-soft transition-colors" aria-label="Close">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
};

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`bg-surface rounded-lg shadow-sm border border-border-default transition-all duration-300 hover:shadow-md ${className || ''}`}>
        {children}
    </div>
);

const CardHeader: React.FC<{ title: string, children?: React.ReactNode }> = ({ title, children }) => (
    <div className="flex justify-between items-center p-4 border-b border-border-default bg-surface-soft/30 rounded-t-lg">
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        {children}
    </div>
);

const DataGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
     <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">{children}</div>
);

const DataField: React.FC<{ label: string, value: React.ReactNode }> = ({ label, value }) => (
    <div>
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1">{label}</p>
        <p className="text-base font-medium text-text-primary break-words">{value || 'N/A'}</p>
    </div>
);

const DocumentDisplay: React.FC<{ document: UploadedFile, onSave: (newDoc: UploadedFile) => Promise<void> }> = ({ document, onSave }) => {
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!showPreviewModal) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setShowPreviewModal(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showPreviewModal]);

    const handleEditClick = () => {
        setShowPreviewModal(false);
        setIsEditorOpen(true);
    };

    const handleEditorSave = async (newDataUrl: string) => {
        setIsSaving(true);
        const blob = await (await fetch(newDataUrl)).blob();
        const newFile = new File([blob], document.fileName.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg' });
        
        const newDocument: UploadedFile = {
            fileName: newFile.name,
            mimeType: newFile.type,
            size: newFile.size,
            dataUrl: newDataUrl,
        };

        try {
            await onSave(newDocument);
            setIsEditorOpen(false);
        } catch (e) {
            console.error("Failed to save edited document:", e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <div className="mt-4 p-4 bg-surface-soft/50 border-t border-border-default rounded-b-lg">
                <h4 className="text-sm font-semibold text-text-primary mb-3">Attached Document</h4>
                <div className="flex items-start gap-4">
                    <img
                        src={document.dataUrl}
                        alt="Document Preview"
                        className="h-24 w-24 object-cover rounded-lg border border-border-default hover:shadow-lg transition-all cursor-pointer hover:scale-105"
                        onClick={() => setShowPreviewModal(true)}
                        title="Click to view full size"
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{document.fileName}</p>
                        <p className="text-xs text-text-secondary mb-2">{(document.size / 1024).toFixed(2)} KB</p>
                        <ShareToolbar file={document} />
                    </div>
                </div>
            </div>
            {showPreviewModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[110] p-4" aria-modal="true" role="dialog">
                    <div className="bg-surface p-4 rounded-xl shadow-2xl relative max-w-5xl w-full max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center border-b border-border-default pb-4 mb-4">
                            <h3 className="text-lg font-semibold text-text-primary truncate pr-4">{document.fileName}</h3>
                            <button onClick={() => setShowPreviewModal(false)} className="text-text-secondary hover:text-text-primary p-2 rounded-full hover:bg-surface-soft transition-colors" aria-label="Close">
                                <XMarkIcon className="h-8 w-8" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto flex items-center justify-center bg-black/5 rounded-lg">
                            <img src={document.dataUrl} alt="Full preview" className="max-w-full max-h-full object-contain shadow-lg" />
                        </div>
                        <ShareToolbar file={document} />
                        <div className="pt-4 mt-4 border-t border-border-default text-center">
                            <button 
                                onClick={handleEditClick}
                                className="px-6 py-2.5 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors shadow-md"
                            >
                                Edit Image
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isEditorOpen && (
                <ImageEditorModal
                    imageSrc={document.dataUrl}
                    onClose={() => setIsEditorOpen(false)}
                    onSave={handleEditorSave}
                />
            )}
        </>
    );
};


// --- Main Modal Component ---

interface GlobalPassengerDetailModalProps {
  passenger: Passenger | null;
  onClose: () => void;
  onEdit?: (passenger: Passenger) => void;
  companyName: string;
}

const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export const GlobalPassengerDetailModal: React.FC<GlobalPassengerDetailModalProps> = ({ passenger, onClose, onEdit, companyName }) => {
    const { formatDate, formatTime } = useFormatters();
    const personnelStatus = usePersonnelStatus(passenger);
    const [isProfilePhotoViewerOpen, setIsProfilePhotoViewerOpen] = useState(false);

    if (!passenger) return null;

    const { passports, ghanaCardData, contactData, visas, permits, tickets, category, profilePhotoUrl } = passenger;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sortedTickets = [...(tickets || [])].sort((a, b) => {
        const dateA = new Date(a.travelDate || 0);
        const dateB = new Date(b.travelDate || 0);
        return dateB.getTime() - dateA.getTime();
    });

    const upcomingTickets = sortedTickets.filter(t => new Date(t.travelDate || 0) >= today).reverse(); // Oldest upcoming first
    const pastTickets = sortedTickets.filter(t => new Date(t.travelDate || 0) < today);

    const title = (
        <div className="flex items-center gap-4">
            {profilePhotoUrl ? (
                <div className="relative group cursor-pointer" onClick={() => setIsProfilePhotoViewerOpen(true)}>
                    <img src={profilePhotoUrl} alt="Profile" className="h-12 w-12 rounded-full object-cover border-2 border-surface shadow-sm group-hover:opacity-80 transition-opacity" />
                </div>
            ) : (
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg flex-shrink-0 border-2 border-surface shadow-sm">
                    {getInitials((passports || []).length > 0 ? `${passports[0].firstNames} ${passports[0].surname}` : 'No Passport')}
                </div>
            )}
            <div className="flex flex-col">
                <span className="text-lg font-bold leading-tight">{(passports || []).length > 0 ? `${passports[0].firstNames} ${passports[0].surname}` : 'No Passport'}</span>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full ${
                        personnelStatus.status === 'In-Transit' ? 'bg-info/20 text-info border border-info/30' :
                        personnelStatus.status.includes('Country') || personnelStatus.status.includes('Site') ? 'bg-success/20 text-success border border-success/30' : 'bg-warning/20 text-warning border border-warning/30'
                    }`}>
                        {personnelStatus.status}
                    </span>
                </div>
            </div>
        </div>
    );
    
    const handleDocumentSave = (
        docType: 'passport' | 'ghanacard' | 'visa' | 'permit' | 'ticket', 
        itemId?: string
    ) => async (newDoc: UploadedFile) => {
        if (!passenger) return;

        let updatePayload: Partial<Passenger> = {};
        switch(docType) {
            case 'passport':
                updatePayload = { passports: passenger.passports.map(p => p.id === itemId ? { ...p, document: newDoc } : p) };
                break;
            case 'ghanacard':
                 if (passenger.ghanaCardData) {
                    updatePayload = { ghanaCardData: { ...passenger.ghanaCardData, document: newDoc } };
                }
                break;
            case 'visa':
                updatePayload.visas = passenger.visas.map(v => v.id === itemId ? { ...v, document: newDoc } : v);
                break;
            case 'permit':
                updatePayload.permits = passenger.permits.map(p => p.id === itemId ? { ...p, document: newDoc } : p);
                break;
            case 'ticket':
                updatePayload.tickets = passenger.tickets.map(t => t.id === itemId ? { ...t, document: newDoc } : t);
                break;
        }
        await updatePassenger(passenger.id, updatePayload);
    };

    const handleProfilePhotoSave = async (newDataUrl: string) => {
        if (!passenger) return;
        try {
            await updatePassenger(passenger.id, { profilePhotoUrl: newDataUrl });
        } catch (e) {
            console.error("Failed to update profile photo:", e);
            throw e;
        }
    };
    
    const headerActions = onEdit ? (
        <button 
            onClick={() => onEdit(passenger)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-full hover:bg-primary-dark transition-all shadow-md active:scale-95"
            title="Edit Personnel Details"
        >
            <PencilIcon className="h-4 w-4" />
            <span>Edit</span>
        </button>
    ) : null;

    return (
        <Modal isOpen={!!passenger} onClose={onClose} title={title} headerActions={headerActions}>
            <div className="space-y-8">
                <Card>
                    <CardHeader title="Current Status & Contact" />
                    <DataGrid>
                        <DataField label="Status" value={personnelStatus.status} />
                        <DataField label="Details" value={personnelStatus.details} />
                         <DataField label="Company" value={companyName} />
                        <DataField label="Email Address" value={contactData.email} />
                        <DataField label="Phone Number" value={contactData.phone} />
                         <DataField label="Category" value={category} />
                    </DataGrid>
                </Card>
                
                {/* --- Travel History Section --- */}
                <Card>
                    <CardHeader title="Travel History">
                        <ClockIcon className="h-5 w-5 text-text-secondary" />
                    </CardHeader>
                    <div className="p-4 space-y-6">
                        {upcomingTickets.length > 0 && (
                            <div>
                                <h4 className="text-sm font-bold text-primary mb-3 uppercase tracking-wide">Upcoming Flights</h4>
                                <div className="space-y-2">
                                    {upcomingTickets.map(ticket => (
                                        <div key={ticket.id} className="p-3 rounded-lg border border-primary/30 bg-primary/5 flex justify-between items-center">
                                            <div>
                                                <div className="font-bold text-text-primary">{ticket.departureCity || 'N/A'} <span className="text-text-secondary">→</span> {ticket.arrivalCity || 'N/A'}</div>
                                                <div className="text-xs text-text-secondary">{ticket.airline} • {ticket.ticketNumber}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-primary">{formatDate(ticket.travelDate)}</div>
                                                <div className="text-xs text-text-secondary">{formatTime(ticket.travelTime)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {pastTickets.length > 0 && (
                            <div>
                                <h4 className="text-sm font-bold text-text-secondary mb-3 uppercase tracking-wide">Past Flights</h4>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {pastTickets.map(ticket => (
                                        <div key={ticket.id} className="p-3 rounded-lg border border-border-default bg-surface-soft flex justify-between items-center opacity-80 hover:opacity-100 transition-opacity">
                                            <div>
                                                <div className="font-medium text-text-primary text-sm">{ticket.departureCity || 'N/A'} <span className="text-text-secondary">→</span> {ticket.arrivalCity || 'N/A'}</div>
                                                <div className="text-xs text-text-secondary">{ticket.airline}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-medium text-text-secondary text-sm">{formatDate(ticket.travelDate)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {upcomingTickets.length === 0 && pastTickets.length === 0 && (
                            <p className="text-text-secondary text-center text-sm py-4">No travel history recorded.</p>
                        )}
                    </div>
                </Card>

                {passports.map((passport: PassportData, index: number) => (
                    <Card key={passport.id}>
                        <CardHeader title={`Passport Information #${index + 1}`} />
                        <DataGrid>
                            <DataField label="First Names" value={passport.firstNames} />
                            <DataField label="Surname" value={passport.surname} />
                            <DataField label="Passport No." value={passport.passportNumber} />
                            <DataField label="Nationality" value={passport.nationality} />
                            <DataField label="Date of Birth" value={formatDate(passport.dateOfBirth)} />
                            <DataField label="Date of Expiry" value={
                               <span className={getExpiryStatus(passport.dateOfExpiry).colorClass}>
                                    {getExpiryStatus(passport.dateOfExpiry).icon}
                                    {formatDate(passport.dateOfExpiry)}
                                </span>
                            } />
                        </DataGrid>
                        {passport.document && <DocumentDisplay document={passport.document} onSave={handleDocumentSave('passport', passport.id)} />}
                    </Card>
                ))}

                {ghanaCardData && ghanaCardData.cardNumber && (
                    <Card>
                        <CardHeader title="Ghana Card Information" />
                        <DataGrid>
                            <DataField label="Personal ID Number" value={ghanaCardData.cardNumber} />
                            <DataField label="Date of Issue" value={formatDate(ghanaCardData.dateOfIssue)} />
                             <DataField label="Date of Expiry" value={
                                <span className={getExpiryStatus(ghanaCardData.dateOfExpiry).colorClass}>
                                    {getExpiryStatus(ghanaCardData.dateOfExpiry).icon}
                                    {formatDate(ghanaCardData.dateOfExpiry)}
                                </span>
                            } />
                        </DataGrid>
                        {ghanaCardData.document && <DocumentDisplay document={ghanaCardData.document} onSave={handleDocumentSave('ghanacard')} />}
                    </Card>
                )}
                
                {visas.map((visa: VisaData, index: number) => (
                    <Card key={visa.id}>
                        <CardHeader title={`Visa Details #${index + 1}`} />
                        <DataGrid>
                            <DataField label="Visa No." value={visa.visaNumber} />
                            <DataField label="Country" value={visa.country} />
                            <DataField label="Date of Issue" value={formatDate(visa.dateOfIssue)} />
                             <DataField label="Date of Expiry" value={
                                <span className={getExpiryStatus(visa.dateOfExpiry).colorClass}>
                                    {getExpiryStatus(visa.dateOfExpiry).icon}
                                    {formatDate(visa.dateOfExpiry)}
                                </span>
                            } />
                        </DataGrid>
                        {visa.document && <DocumentDisplay document={visa.document} onSave={handleDocumentSave('visa', visa.id)} />}
                    </Card>
                ))}

                {permits.map((permit: PermitData, index: number) => (
                    <Card key={permit.id}>
                        <CardHeader title={`Permit Details #${index + 1}`} />
                        <DataGrid>
                            <DataField label="Permit No." value={permit.permitNumber} />
                            <DataField label="Permit Type" value={permit.type} />
                            <DataField label="Date of Issue" value={formatDate(permit.dateOfIssue)} />
                            <DataField label="Date of Expiry" value={
                                <span className={getExpiryStatus(permit.dateOfExpiry).colorClass}>
                                    {getExpiryStatus(permit.dateOfExpiry).icon}
                                    {formatDate(permit.dateOfExpiry)}
                                </span>
                            } />
                        </DataGrid>
                        {permit.document && <DocumentDisplay document={permit.document} onSave={handleDocumentSave('permit', permit.id)} />}
                    </Card>
                ))}
            </div>

            {profilePhotoUrl && (
                <ProfilePhotoViewerModal
                    isOpen={isProfilePhotoViewerOpen}
                    onClose={() => setIsProfilePhotoViewerOpen(false)}
                    imageUrl={profilePhotoUrl}
                    onSave={handleProfilePhotoSave}
                    title={`${(passports || []).length > 0 ? `${passports[0].firstNames} ${passports[0].surname}` : 'No Passport'}`}
                />
            )}
        </Modal>
    );
};
