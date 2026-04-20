
import React, { useState, useEffect } from 'react';
import { Passenger, UploadedFile, VisaData, PermitData, TicketData, GhanaCardData } from '../types';
import { ShareToolbar } from './ShareToolbar';
import { XMarkIcon } from './icons/index';
// FIX: Changed to a named import for useFormatters to resolve module loading issue.
import { useFormatters } from '../hooks/useFormatters';
import { ImageEditorModal } from './ImageEditorModal';
import { updatePassenger } from '../services/firebase';
import { ProfilePhotoUpdateModal } from './ProfilePhotoUpdateModal';
import { UserCircleIcon, CameraIcon } from './icons/index';

// --- Reusable Components ---
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; }> = ({ isOpen, onClose, title, children }) => {
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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4" aria-modal="true" role="dialog">
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-border-default p-4">
                    <div className="text-xl font-semibold text-text-primary">{title}</div>
                    <button onClick={onClose} className="text-text-secondary hover:text-danger p-1 rounded-full transition-colors" aria-label="Close">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`bg-surface rounded-lg shadow-md border border-border-default ${className || ''}`}>
        {children}
    </div>
);

const CardHeader: React.FC<{ title: string, children?: React.ReactNode }> = ({ title, children }) => (
    <div className="flex justify-between items-center p-4 border-b border-border-default">
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        {children}
    </div>
);

const DataGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
     <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">{children}</div>
);

const DataField: React.FC<{ label: string, value: React.ReactNode }> = ({ label, value }) => (
    <div>
        <p className="text-xs font-medium text-text-secondary uppercase">{label}</p>
        <p className="text-base text-text-primary">{value || 'N/A'}</p>
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
            <div className="mt-4 p-4 bg-surface-soft border-t border-border-default">
                <h4 className="text-sm font-semibold text-text-primary mb-2">Attached Document</h4>
                <div className="flex items-start gap-4">
                    <img 
                        src={document.dataUrl} 
                        alt="Document Preview" 
                        className="h-24 w-auto object-cover rounded border border-border-default hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => setShowPreviewModal(true)}
                        title="Click to view full size"
                    />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-text-primary break-all">{document.fileName}</p>
                        <p className="text-xs text-text-secondary">{(document.size / 1024).toFixed(2)} KB</p>
                        <ShareToolbar file={document} />
                    </div>
                </div>
            </div>
            {showPreviewModal && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[110] p-4" aria-modal="true" role="dialog">
                    <div className="bg-surface p-4 rounded-lg shadow-2xl relative max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center border-b border-border-default pb-2 mb-4">
                            <h3 className="text-lg font-semibold text-text-primary">{document.fileName}</h3>
                            <button onClick={() => setShowPreviewModal(false)} className="text-text-secondary hover:text-text-primary text-4xl font-light leading-none transition-colors" aria-label="Close">&times;</button>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <img src={document.dataUrl} alt="Full preview" className="max-w-full max-h-full mx-auto" />
                        </div>
                        <ShareToolbar file={document} />
                        <div className="pt-4 mt-4 border-t border-border-default text-center">
                            <button 
                                onClick={handleEditClick}
                                className="px-4 py-2 text-sm font-semibold bg-surface-soft text-text-primary rounded-md hover:bg-border-default transition-colors"
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

interface PassengerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  passenger: Passenger | null;
  companyName: string;
}

const PassengerDetailModal: React.FC<PassengerDetailModalProps> = ({ isOpen, onClose, passenger, companyName }) => {
    const { formatDate, formatTime } = useFormatters();
    const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

    if (!passenger) return null;

    const { passports, ghanaCardData, contactData, visas, permits, tickets, category, profilePhotoUrl } = passenger;

    const handlePhotoSave = async (newPhotoUrl: string) => {
        if (!passenger) return;
        await updatePassenger(passenger.id, { profilePhotoUrl: newPhotoUrl });
        // No need to manually update local state if the parent component listens to Firestore changes
    };

    const title = (
        <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => setIsPhotoModalOpen(true)}>
                {profilePhotoUrl ? (
                    <img 
                        src={profilePhotoUrl} 
                        alt="Profile" 
                        className="w-12 h-12 rounded-full object-cover border-2 border-border-default group-hover:border-primary transition-colors"
                    />
                ) : (
                    <div className="w-12 h-12 rounded-full bg-surface-soft border-2 border-border-default flex items-center justify-center text-text-secondary group-hover:border-primary group-hover:text-primary transition-colors">
                        <UserCircleIcon className="w-8 h-8" />
                    </div>
                )}
                <div className="absolute -bottom-1 -right-1 bg-surface rounded-full p-1 shadow-sm border border-border-default text-text-secondary group-hover:text-primary">
                    <CameraIcon className="w-3 h-3" />
                </div>
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{(passports || []).length > 0 ? `${passports[0].firstNames} ${passports[0].surname}` : 'No Passport'}</span>
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                        category === 'Expatriate' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-teal-500/20 text-teal-300'
                    }`}>
                        {category}
                    </span>
                </div>
                <div className="text-xs text-text-secondary">{companyName}</div>
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
                // Assuming we update the first passport for now, or need a way to identify which passport
                updatePayload = { passports: passenger.passports.map((p, i) => i === 0 ? { ...p, document: newDoc } : p) };
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
        // The real-time listener in DashboardScreen will handle the UI update.
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-6">
                {(passports || []).map((passport, index) => (
                    <Card key={passport.id || index}>
                        <CardHeader title={`Passport Information #${index + 1}`} />
                        <DataGrid>
                            <DataField label="First Names" value={passport.firstNames} />
                            <DataField label="Surname" value={passport.surname} />
                            <DataField label="Passport No." value={passport.passportNumber} />
                            <DataField label="Nationality" value={passport.nationality} />
                            <DataField label="Date of Birth" value={formatDate(passport.dateOfBirth)} />
                            <DataField label="Date of Expiry" value={formatDate(passport.dateOfExpiry)} />
                        </DataGrid>
                        {passport.document && <DocumentDisplay document={passport.document} onSave={handleDocumentSave('passport')} />}
                    </Card>
                ))}

                {ghanaCardData && ghanaCardData.cardNumber && (
                    <Card>
                        <CardHeader title="Ghana Card Information" />
                        <DataGrid>
                            <DataField label="Personal ID Number" value={ghanaCardData.cardNumber} />
                            <DataField label="Date of Issue" value={formatDate(ghanaCardData.dateOfIssue)} />
                            <DataField label="Date of Expiry" value={formatDate(ghanaCardData.dateOfExpiry)} />
                        </DataGrid>
                        {ghanaCardData.document && <DocumentDisplay document={ghanaCardData.document} onSave={handleDocumentSave('ghanacard')} />}
                    </Card>
                )}

                <Card>
                    <CardHeader title="Contact Information" />
                    <DataGrid>
                        <DataField label="Company" value={companyName} />
                        <DataField label="Email Address" value={contactData.email} />
                        <DataField label="Phone Number" value={contactData.phone} />
                    </DataGrid>
                </Card>
                
                {(visas || []).map((visa: VisaData, index: number) => (
                    <Card key={visa.id}>
                        <CardHeader title={`Visa Details #${index + 1}`} />
                        <DataGrid>
                            <DataField label="Visa No." value={visa.visaNumber} />
                            <DataField label="Country" value={visa.country} />
                            <DataField label="Date of Issue" value={formatDate(visa.dateOfIssue)} />
                            <DataField label="Date of Expiry" value={formatDate(visa.dateOfExpiry)} />
                        </DataGrid>
                        {visa.document && <DocumentDisplay document={visa.document} onSave={handleDocumentSave('visa', visa.id)} />}
                    </Card>
                ))}

                {(permits || []).map((permit: PermitData, index: number) => (
                    <Card key={permit.id}>
                        <CardHeader title={`Permit Details #${index + 1}`} />
                        <DataGrid>
                            <DataField label="Permit No." value={permit.permitNumber} />
                            <DataField label="Permit Type" value={permit.type} />
                            <DataField label="Date of Issue" value={formatDate(permit.dateOfIssue)} />
                            <DataField label="Date of Expiry" value={formatDate(permit.dateOfExpiry)} />
                        </DataGrid>
                        {permit.document && <DocumentDisplay document={permit.document} onSave={handleDocumentSave('permit', permit.id)} />}
                    </Card>
                ))}

                {(tickets || []).map((ticket: TicketData, index: number) => (
                    <Card key={ticket.id}>
                        <CardHeader title={`Ticket Details #${index + 1}`} />
                        <DataGrid>
                            <DataField label="Ticket No." value={ticket.ticketNumber} />
                            <DataField label="Airline" value={ticket.airline} />
                            <DataField label="Route" value={`${ticket.departureCity || 'N/A'} → ${ticket.arrivalCity || 'N/A'}`} />
                            <DataField label="Travel Date & Time" value={`${formatDate(ticket.travelDate)} ${formatTime(ticket.travelTime)}`} />
                        </DataGrid>
                        {ticket.document && <DocumentDisplay document={ticket.document} onSave={handleDocumentSave('ticket', ticket.id)} />}
                    </Card>
                ))}
            </div>
            <ProfilePhotoUpdateModal 
                isOpen={isPhotoModalOpen}
                onClose={() => setIsPhotoModalOpen(false)}
                onSave={handlePhotoSave}
                currentPhotoUrl={profilePhotoUrl}
            />
        </Modal>
    );
};

export default PassengerDetailModal;
