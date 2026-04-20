
import React, { useState, useEffect } from 'react';
import { Passenger, UploadedFile, VisaData, PermitData, TicketData } from '../types';
import { ShareToolbar } from '../components/ShareToolbar';
import { deletePassenger, updatePassenger, listenToRtdb, deleteField } from '../services/firebase';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ArrowLeftIcon, EnvelopeIcon, PhoneIcon, WhatsappIcon, ChatBubbleLeftEllipsisIcon } from '../components/icons/index';
import { FileUploader } from '../components/FileUploader';
// FIX: Changed to a named import for useFormatters to resolve module loading issue.
import { useFormatters } from '../hooks/useFormatters';
import { ImageEditorModal } from '../components/ImageEditorModal';
import { SendMessageModal } from '../components/SendMessageModal';
import { ProfilePhotoViewerModal } from '../components/ProfilePhotoViewerModal';
import { ProfilePhotoUpdateModal } from '../components/ProfilePhotoUpdateModal';
import { UserCircleIcon, CameraIcon } from '../components/icons/index';
import { OcrSourceBadge } from '../components/OcrSourceBadge';

// --- Reusable Components ---
const Button: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string; variant?: 'primary' | 'danger' | 'secondary' }> = ({ children, onClick, className, variant = 'primary' }) => {
    const baseClasses = `px-4 py-2 rounded-md font-semibold shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2`;
    const variantClasses = {
        primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
        danger: 'bg-danger text-white hover:bg-red-700 focus:ring-danger',
        secondary: 'bg-surface-soft text-text-primary hover:bg-border-default focus:ring-primary',
    };
    return (
        <button onClick={onClick} className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
            {children}
        </button>
    );
};

const BackButton: React.FC<{ onClick: () => void, children?: React.ReactNode}> = ({ onClick, children }) => (
    <button onClick={onClick} className="mb-4 px-4 py-2 bg-surface-soft text-text-primary font-semibold rounded-md hover:bg-border-default transition-colors">
        <span className="flex items-center gap-2">
            <ArrowLeftIcon />
            {children || 'Back to List'}
        </span>
    </button>
);

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

const DocumentPreview: React.FC<{
    document: UploadedFile;
    onReplace: (newDoc: UploadedFile) => Promise<void>;
    onDelete: () => Promise<void>;
}> = ({ document, onReplace, onDelete }) => {
    const [isReplacing, setIsReplacing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

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

    const handleFileUpload = async ({ file, dataUrl }: { file: File; dataUrl: string }) => {
        setIsSaving(true);
        setError(null);
        const newDocument: UploadedFile = {
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
            dataUrl: dataUrl,
        };
        try {
            await onReplace(newDocument);
            setIsReplacing(false);
        } catch (e) {
            console.error("Failed to replace document:", e);
            setError("Failed to save the new document. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        setError(null);
        try {
            await onDelete();
            // The component will unmount, so no need to close the modal here.
        } catch (e) {
            console.error("Failed to delete document:", e);
            setError("Failed to delete the document. Please try again.");
            setIsDeleting(false); // Only reset on error
            setIsDeleteModalOpen(false); // Close modal on error
        }
    };

    const handleEditClick = () => {
        setShowPreviewModal(false); // Close preview
        setIsEditorOpen(true); // Open editor
    };

    const handleEditorSave = async (newDataUrl: string) => {
        setIsSaving(true);
        setError(null);
        const blob = await (await fetch(newDataUrl)).blob();
        const newFile = new File([blob], document.fileName.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg' });
        
        const newDocument: UploadedFile = {
            fileName: newFile.name,
            mimeType: newFile.type,
            size: newFile.size,
            dataUrl: newDataUrl,
        };
        try {
            await onReplace(newDocument);
            setIsEditorOpen(false);
        } catch (e) {
            console.error("Failed to replace document:", e);
            setError("Failed to save the edited document. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };


    if (isReplacing) {
        return (
            <div className="mt-4 p-4 bg-surface-soft border-t border-border-default">
                <h4 className="text-sm font-semibold mb-2 text-text-primary">Upload Replacement Document</h4>
                <FileUploader label="Upload new document" onFileUpload={handleFileUpload} />
                {isSaving && <p className="text-sm text-text-secondary mt-2">Saving...</p>}
                {error && <p className="text-sm text-danger mt-2">{error}</p>}
                <div className="mt-4 flex justify-end">
                    <Button onClick={() => setIsReplacing(false)} variant="secondary" className="px-3 py-1 text-sm !bg-surface">Cancel</Button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="mt-4 p-4 bg-surface-soft border-t border-border-default">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-semibold text-text-primary">Attached Document</h4>
                     <div className="flex items-center gap-2">
                        <Button onClick={() => setIsReplacing(true)} variant="secondary" className="px-3 py-1 text-sm !bg-surface">Replace</Button>
                        <Button onClick={() => setIsDeleteModalOpen(true)} variant="secondary" className="!text-danger hover:!bg-danger/10 hover:!text-danger px-3 py-1 text-sm">Remove</Button>
                    </div>
                </div>
                <div className="flex items-start gap-4">
                     <img 
                        src={document.dataUrl} 
                        alt="Preview" 
                        className="h-24 w-auto object-cover rounded border border-border-default cursor-pointer hover:shadow-lg transition-shadow" 
                        onClick={() => setShowPreviewModal(true)}
                        title="Click to view full preview"
                    />
                     <div className="flex-1">
                         <p className="text-sm font-medium text-text-primary break-all">{document.fileName}</p>
                         <p className="text-xs text-text-secondary">{(document.size / 1024).toFixed(2)} KB</p>
                         <ShareToolbar file={document} />
                     </div>
                </div>
            </div>
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Confirm Document Deletion"
                confirmText="Delete"
                isConfirming={isDeleting}
            >
                <p>Are you sure you want to permanently delete this document?</p>
                <p className="mt-2 text-sm">File: <strong className="text-text-primary break-all">{document.fileName}</strong></p>
                {error && <p className="mt-2 text-sm text-danger">{error}</p>}
            </ConfirmationModal>
            {showPreviewModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface p-4 rounded-lg shadow-2xl relative max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center border-b border-border-default pb-2 mb-4">
                            <h3 className="text-lg font-semibold text-text-primary">{document.fileName}</h3>
                            <button onClick={() => setShowPreviewModal(false)} className="text-text-secondary hover:text-text-primary text-4xl font-light leading-none transition-colors">&times;</button>
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

const ContactButton: React.FC<{ href?: string; title: string; icon: React.ElementType; onClick?: () => void; }> = ({ href, title, icon: Icon, onClick }) => {
    const enabled = !!(href || onClick);
    const Component = href ? 'a' : 'button';
    return (
        <Component
            href={href}
            onClick={onClick}
            target={href ? '_blank' : undefined}
            rel={href ? 'noopener noreferrer' : undefined}
            title={title}
            // @ts-ignore
            disabled={!enabled}
            className="p-2 text-text-secondary rounded-full transition-colors enabled:hover:bg-primary/10 enabled:hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <Icon className="h-5 w-5" />
        </Component>
    );
};


// --- Main Screen Component ---

interface PassengerDetailsScreenProps {
  passenger: Passenger;
  onBack: () => void;
  onEdit: (passenger: Passenger) => void;
  onDocumentUpdate: () => void;
}

const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

const PassengerDetailsScreen: React.FC<PassengerDetailsScreenProps> = ({ passenger: initialPassenger, onBack, onEdit, onDocumentUpdate }) => {
    const [passenger, setPassenger] = useState<Passenger>(initialPassenger);
    const { formatDate, formatTime } = useFormatters();

    // Listen to RTDB for real-time updates of this specific passenger
    useEffect(() => {
        const unsubscribe = listenToRtdb(`passengers/${initialPassenger.id}`, (data) => {
            if (data) {
                setPassenger(data);
            }
        });
        return () => unsubscribe();
    }, [initialPassenger.id]);

    const passports = passenger.passports || [];
    const visas = passenger.visas || [];
    const permits = passenger.permits || [];
    const tickets = passenger.tickets || [];
    const ghanaCardData = passenger.ghanaCardData;
    const contactData = passenger.contactData || { email: '', phone: '' };
    const profilePhotoUrl = passenger.profilePhotoUrl;
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [isProfilePhotoViewerOpen, setIsProfilePhotoViewerOpen] = useState(false);
    const [isPhotoUpdateModalOpen, setIsPhotoUpdateModalOpen] = useState(false);

    const cleanPhone = (contactData.phone || '').replace(/[^0-9]/g, '');

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            await deletePassenger(passenger.id);
            onBack(); // Go back to the list after successful deletion
        } catch (error) {
            console.error("Failed to delete passenger:", error);
            alert("Could not delete the personnel. Please try again.");
            setIsDeleteModalOpen(false); // Close modal on error
        } finally {
            setIsDeleting(false);
        }
    };
    
    const handleProfilePhotoSave = async (newDataUrl: string) => {
        try {
            await updatePassenger(passenger.id, { profilePhotoUrl: newDataUrl });
            onDocumentUpdate();
        } catch (e) {
            console.error("Failed to update profile photo:", e);
            throw e;
        }
    };

    const handleReplaceDocument = (
        docType: 'passport' | 'ghanacard' | 'visa' | 'permit' | 'ticket', 
        itemId?: string
    ) => {
        return async (newDoc: UploadedFile) => {
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
            onDocumentUpdate(); // Trigger refetch
        };
    };

    const handleDeleteDocument = (
        docType: 'passport' | 'ghanacard' | 'visa' | 'permit' | 'ticket',
        itemId?: string
    ) => {
        return async () => {
            const updatePayload: { [key: string]: any } = {};

            switch (docType) {
                case 'passport': {
                    const updatedPassports = passenger.passports.map(p => {
                        if (p.id === itemId) {
                            const { document, ...rest } = p;
                            return rest;
                        }
                        return p;
                    });
                    updatePayload.passports = updatedPassports;
                    break;
                }
                case 'ghanacard':
                    updatePayload['ghanaCardData.document'] = deleteField();
                    break;
                case 'visa': {
                    const updatedVisas = passenger.visas.map(v => {
                        if (v.id === itemId) {
                            const { document, ...rest } = v; // Create new object without document
                            return rest;
                        }
                        return v;
                    });
                    updatePayload.visas = updatedVisas;
                    break;
                }
                case 'permit': {
                    const updatedPermits = passenger.permits.map(p => {
                        if (p.id === itemId) {
                            const { document, ...rest } = p;
                            return rest;
                        }
                        return p;
                    });
                    updatePayload.permits = updatedPermits;
                    break;
                }
                case 'ticket': {
                    const updatedTickets = passenger.tickets.map(t => {
                        if (t.id === itemId) {
                            const { document, ...rest } = t;
                            return rest;
                        }
                        return t;
                    });
                    updatePayload.tickets = updatedTickets;
                    break;
                }
            }

            if (Object.keys(updatePayload).length > 0) {
                await updatePassenger(passenger.id, updatePayload);
                onDocumentUpdate();
            }
        };
    };


    return (
        <div>
            <BackButton onClick={onBack} />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                 <div className="flex items-center gap-4">
                    <div 
                        className="relative group cursor-pointer" 
                        onClick={() => setIsPhotoUpdateModalOpen(true)}
                    >
                        {profilePhotoUrl ? (
                            <img src={profilePhotoUrl} alt="Profile" className="h-20 w-20 rounded-full object-cover border-4 border-surface-soft shadow-md transition-opacity group-hover:opacity-80" />
                        ) : (
                            <div className="h-20 w-20 rounded-full bg-surface-soft border-4 border-border-default flex items-center justify-center text-text-secondary group-hover:border-primary group-hover:text-primary transition-colors">
                                <UserCircleIcon className="h-12 w-12" />
                            </div>
                        )}
                        <div className="absolute bottom-0 right-0 bg-surface rounded-full p-1.5 shadow-md border border-border-default text-text-secondary group-hover:text-primary">
                            <CameraIcon className="h-4 w-4" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-text-primary">{passports[0]?.firstNames} {passports[0]?.surname}</h2>
                        <p className="text-text-secondary">Personnel Profile Details</p>
                    </div>
                 </div>
                 <div className="flex gap-2 flex-shrink-0 self-start sm:self-center">
                    <Button onClick={() => onEdit(passenger)}>Edit Personnel</Button>
                    <Button onClick={() => setIsDeleteModalOpen(true)} variant="danger">Delete</Button>
                 </div>
            </div>
            
            <div className="space-y-6">
                {passports.map((passport, index) => (
                    <Card key={passport.id}>
                        <CardHeader title={`Passport Information #${index + 1}`}>
                            <OcrSourceBadge source={passport.ocrSource} />
                        </CardHeader>
                        <DataGrid>
                            <DataField label="First Names" value={passport.firstNames} />
                            <DataField label="Surname" value={passport.surname} />
                            <DataField label="Type" value={passport.type} />
                            <DataField label="Passport No." value={passport.passportNumber} />
                            <DataField label="Nationality" value={passport.nationality} />
                            <DataField label="Place of Birth" value={passport.placeOfBirth} />
                            <DataField label="Date of Birth" value={formatDate(passport.dateOfBirth)} />
                            <DataField label="Sex" value={passport.sex} />
                            <DataField label="Authority" value={passport.authority} />
                            <DataField label="Date of Issue" value={formatDate(passport.dateOfIssue)} />
                            <DataField label="Date of Expiry" value={formatDate(passport.dateOfExpiry)} />
                            <DataField label="Code" value={passport.code} />
                        </DataGrid>
                        {passport.document && <DocumentPreview document={passport.document} onReplace={handleReplaceDocument('passport', passport.id)} onDelete={handleDeleteDocument('passport', passport.id)} />}
                    </Card>
                ))}

                {ghanaCardData && ghanaCardData.cardNumber && (
                    <Card>
                        <CardHeader title="Ghana Card Information">
                            <OcrSourceBadge source={ghanaCardData.ocrSource} />
                        </CardHeader>
                        <DataGrid>
                            <DataField label="Surname" value={ghanaCardData.surname} />
                            <DataField label="First Names" value={ghanaCardData.firstNames} />
                            <DataField label="Personal ID Number" value={ghanaCardData.cardNumber} />
                            <DataField label="Nationality" value={ghanaCardData.nationality} />
                            <DataField label="Date of Birth" value={formatDate(ghanaCardData.dateOfBirth || '')} />
                            <DataField label="Height" value={ghanaCardData.height} />
                            <DataField label="Document Number" value={ghanaCardData.documentNumber} />
                            <DataField label="Place of Issuance" value={ghanaCardData.placeOfIssuance} />
                            <DataField label="Date of Issue" value={formatDate(ghanaCardData.dateOfIssue)} />
                            <DataField label="Date of Expiry" value={formatDate(ghanaCardData.dateOfExpiry)} />
                        </DataGrid>
                        {ghanaCardData.document && <DocumentPreview document={ghanaCardData.document} onReplace={handleReplaceDocument('ghanacard')} onDelete={handleDeleteDocument('ghanacard')} />}
                    </Card>
                )}

                <Card>
                    <CardHeader title="Contact Information" />
                    <DataGrid>
                        <DataField label="Email Address" value={contactData.email} />
                        <DataField label="Phone Number" value={contactData.phone} />
                    </DataGrid>
                    <div className="p-4 border-t border-border-default flex items-center gap-2">
                        <ContactButton href={contactData.email ? `mailto:${contactData.email}` : undefined} title="Send Email" icon={EnvelopeIcon} />
                        <ContactButton href={cleanPhone ? `https://wa.me/${cleanPhone}` : undefined} title="Send WhatsApp" icon={WhatsappIcon} />
                        <ContactButton href={cleanPhone ? `tel:${cleanPhone}` : undefined} title="Call Phone" icon={PhoneIcon} />
                        <ContactButton onClick={() => setIsMessageModalOpen(true)} title="Send Custom Message" icon={ChatBubbleLeftEllipsisIcon} />
                    </div>
                </Card>
                
                {visas.map((visa: VisaData, index: number) => (
                    <Card key={visa.id}>
                        <CardHeader title={`Visa Details #${index + 1}`}>
                            <OcrSourceBadge source={visa.ocrSource} />
                        </CardHeader>
                        <DataGrid>
                            <DataField label="Visa No." value={visa.visaNumber} />
                            <DataField label="Country" value={visa.country} />
                            <DataField label="Date of Issue" value={formatDate(visa.dateOfIssue)} />
                            <DataField label="Date of Expiry" value={formatDate(visa.dateOfExpiry)} />
                        </DataGrid>
                        {visa.document && <DocumentPreview document={visa.document} onReplace={handleReplaceDocument('visa', visa.id)} onDelete={handleDeleteDocument('visa', visa.id)} />}
                    </Card>
                ))}

                {permits.map((permit: PermitData, index: number) => (
                    <Card key={permit.id}>
                        <CardHeader title={`Permit Details #${index + 1}`}>
                            <OcrSourceBadge source={permit.ocrSource} />
                        </CardHeader>
                        <DataGrid>
                            <DataField label="Permit No." value={permit.permitNumber} />
                            <DataField label="Permit Type" value={permit.type} />
                            <DataField label="Date of Issue" value={formatDate(permit.dateOfIssue)} />
                            <DataField label="Date of Expiry" value={formatDate(permit.dateOfExpiry)} />
                        </DataGrid>
                        {permit.document && <DocumentPreview document={permit.document} onReplace={handleReplaceDocument('permit', permit.id)} onDelete={handleDeleteDocument('permit', permit.id)} />}
                    </Card>
                ))}

                {tickets.map((ticket: TicketData, index: number) => (
                    <Card key={ticket.id}>
                        <CardHeader title={`Ticket Details #${index + 1}`}>
                            <OcrSourceBadge source={ticket.ocrSource} />
                        </CardHeader>
                        <DataGrid>
                            <DataField label="Ticket No." value={ticket.ticketNumber} />
                            <DataField label="Airline" value={ticket.airline} />
                            <DataField label="Departure City" value={ticket.departureCity} />
                            <DataField label="Arrival City" value={ticket.arrivalCity} />
                            <DataField label="Travel Date & Time" value={`${formatDate(ticket.travelDate)} ${formatTime(ticket.travelTime)}`} />
                        </DataGrid>
                        {ticket.document && <DocumentPreview document={ticket.document} onReplace={handleReplaceDocument('ticket', ticket.id)} onDelete={handleDeleteDocument('ticket', ticket.id)} />}
                    </Card>
                ))}
            </div>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Confirm Deletion"
                confirmText="Delete"
                isConfirming={isDeleting}
            >
                <p>
                    Are you sure you want to delete the profile for <strong className="text-text-primary">{passenger.passports?.length > 0 ? `${passenger.passports[0].firstNames} ${passenger.passports[0].surname}` : 'No Name'}</strong>?
                </p>
                <p className="mt-2 text-sm">This action is permanent and cannot be undone.</p>
            </ConfirmationModal>

            <SendMessageModal 
                isOpen={isMessageModalOpen}
                onClose={() => setIsMessageModalOpen(false)}
                passenger={passenger}
            />

            {profilePhotoUrl && (
                <ProfilePhotoViewerModal
                    isOpen={isProfilePhotoViewerOpen}
                    onClose={() => setIsProfilePhotoViewerOpen(false)}
                    imageUrl={profilePhotoUrl}
                    onSave={handleProfilePhotoSave}
                    title={passports.length > 0 ? `${passports[0].firstNames} ${passports[0].surname}` : 'Passenger'}
                />
            )}
            
            <ProfilePhotoUpdateModal
                isOpen={isPhotoUpdateModalOpen}
                onClose={() => setIsPhotoUpdateModalOpen(false)}
                onSave={handleProfilePhotoSave}
                currentPhotoUrl={profilePhotoUrl}
            />
        </div>
    );
};

export default PassengerDetailsScreen;
