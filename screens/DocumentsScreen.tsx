
import React, { useState, useEffect, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { Passenger, Company, UploadedFile, PassengerCategory, VisaData, PermitData, TicketData, User, UserSettings } from '../types';
import { db, listenToAccessiblePassengers, updatePassenger, doc, getDoc } from '../services/firebase';
import { processFileForStorage } from '../services/storageService';
import { useCompanies } from '../context/CompanyContext';
import { DocumentDuplicateIcon, XMarkIcon, ArrowPathIcon, QueueListIcon, Squares2X2Icon, PencilIcon, Bars3Icon, CheckCircleIcon, TrashIcon } from '../components/icons/index';
import { SearchInput } from '../components/SearchInput';
import { ShareToolbar } from '../components/ShareToolbar';
import { ImageEditorModal } from '../components/ImageEditorModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { OcrSourceBadge } from '../components/OcrSourceBadge';

// --- Helper Components ---

const Spinner: React.FC = () => (
    <div className="flex justify-center items-center h-64">
        <div className="flex items-center justify-center space-x-2">
            <div className="h-5 w-5 bg-primary rounded-full animate-pulse [animation-delay:-0.3s]"></div>
            <div className="h-5 w-5 bg-primary rounded-full animate-pulse [animation-delay:-0.15s]"></div>
            <div className="h-5 w-5 bg-primary rounded-full animate-pulse"></div>
        </div>
    </div>
);

interface DisplayDocument {
  id: string;
  passengerId: string;
  passengerName: string;
  companyId: string;
  companyName: string;
  docType: string;
  category: string;
  passengerCategory: PassengerCategory;
  file: UploadedFile;
  sourceType: 'passport' | 'ghanacard' | 'visa' | 'permit' | 'ticket' | 'other';
  sourceId: string; // The ID of the item in an array, or passengerId for single docs.
  ocrSource?: string;
}

interface DocumentThumbnailProps {
  doc: DisplayDocument;
  onClick: () => void;
  isSelected: boolean;
  isSelectionMode: boolean;
}

const DocumentThumbnail = memo<DocumentThumbnailProps>(({ doc, onClick, isSelected, isSelectionMode }) => (
    <div
        onClick={onClick}
        className={`group relative cursor-pointer overflow-hidden rounded-lg bg-surface-soft border aspect-w-1 aspect-h-1 transition-all duration-300 hover:-translate-y-1 ${isSelected ? 'border-primary ring-2 ring-primary' : 'border-border-default hover:shadow-lg'}`}
    >
        <img src={doc.file.dataUrl} alt={doc.docType} className={`object-cover w-full h-full transition-opacity ${isSelected ? 'opacity-70' : 'opacity-100'}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-100 transition-opacity"></div>
        <div className="absolute bottom-0 left-0 p-2 w-full">
            <p className="text-white text-sm font-semibold truncate">{doc.docType}</p>
        </div>
        {isSelectionMode && (
             <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'bg-black/40 border-white'}`}>
                {isSelected && <CheckCircleIcon className="w-4 h-4 text-white" />}
             </div>
        )}
    </div>
));

const DocumentListItem = memo<{ doc: DisplayDocument; onClick: () => void; isSelected: boolean; isSelectionMode: boolean }>(({ doc, onClick, isSelected, isSelectionMode }) => {
    return (
        <div onClick={onClick} className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-surface-soft rounded-lg border transition-colors cursor-pointer ${isSelected ? 'border-primary bg-primary/5' : 'border-border-default hover:bg-border-default/50'}`}>
            <div className="flex items-center gap-4 flex-grow min-w-0 w-full">
                {isSelectionMode && (
                     <div className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-text-secondary'}`}>
                        {isSelected && <CheckCircleIcon className="w-4 h-4 text-white" />}
                     </div>
                )}
                <img src={doc.file.dataUrl} alt={doc.docType} className="h-16 w-16 object-cover rounded-md flex-shrink-0" />
                <div className="flex-grow min-w-0">
                    <p className="font-semibold text-text-primary truncate">{doc.docType}</p>
                    <p className="text-sm text-text-secondary truncate">{doc.passengerName}</p>
                </div>
            </div>
            {/* Right part: company and category */}
            <div className="w-full sm:w-auto text-left sm:text-right flex-shrink-0">
                <div className="sm:hidden border-t border-border-default pt-3 mt-3 w-full"></div>
                <p className="text-sm font-medium text-text-primary">{doc.companyName}</p>
                <p className="text-xs text-text-secondary">{doc.passengerCategory}</p>
            </div>
        </div>
    );
});


type DestinationType = 'passport' | 'ghanacard' | 'visa' | 'permit' | 'ticket';

interface CategoryChangeFormProps {
    doc: DisplayDocument;
    onSave: (destinationType: DestinationType, newMetadata: any) => Promise<void>;
    onCancel: () => void;
}

const CategoryChangeForm: React.FC<CategoryChangeFormProps> = ({ doc, onSave, onCancel }) => {
    const [destination, setDestination] = useState<DestinationType | ''>('');
    const [metadata, setMetadata] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleMetadataChange = (field: string, value: string) => {
        setMetadata(prev => ({ ...prev, [field]: value }));
    };
    
    const handleDestinationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newDest = e.target.value as DestinationType | '';
        setDestination(newDest);
        setMetadata({}); // Reset metadata when destination changes
    };

    const handleSaveClick = async () => {
        setError('');
        if (!destination) {
            setError('Please select a new category.');
            return;
        }
        // Basic validation
        if (destination === 'ghanacard' && !metadata.cardNumber) {
            setError('Ghana Card Number is required.');
            return;
        }
        if (destination === 'visa' && !metadata.visaNumber) {
            setError('Visa Number is required.');
            return;
        }
        if (destination === 'permit' && !metadata.permitNumber) {
            setError('Permit Number is required.');
            return;
        }
         if (destination === 'ticket' && !metadata.ticketNumber) {
            setError('Ticket Number is required.');
            return;
        }

        setIsSaving(true);
        try {
            await onSave(destination, metadata);
            // Parent will close modal on success
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save changes.');
            setIsSaving(false);
        }
    };

    const renderMetadataFields = () => {
        const inputClasses = "p-2 border border-border-default bg-background rounded-md text-text-primary placeholder:text-text-secondary focus:ring-1 focus:ring-primary focus:outline-none w-full";
        const labelClasses = "block text-xs font-medium text-text-secondary mb-1";
        
        const renderField = (name: string, label: string, type = 'text', required = false) => (
            <div>
                <label htmlFor={name} className={labelClasses}>{label}{required && ' *'}</label>
                <input id={name} type={type} value={metadata[name] || ''} onChange={e => handleMetadataChange(name, e.target.value)} className={inputClasses} required={required} />
            </div>
        );

        switch (destination) {
            case 'ghanacard':
                return renderField('cardNumber', 'Ghana Card Number', 'text', true);
            case 'visa':
                return <div className="grid grid-cols-2 gap-4">{[renderField('visaNumber', 'Visa Number', 'text', true), renderField('country', 'Country'), renderField('dateOfIssue', 'Date of Issue', 'date'), renderField('dateOfExpiry', 'Date of Expiry', 'date')]}</div>;
            case 'permit':
                return <div className="grid grid-cols-2 gap-4">{[renderField('permitNumber', 'Permit Number', 'text', true), renderField('type', 'Permit Type (e.g., Work)'), renderField('dateOfIssue', 'Date of Issue', 'date'), renderField('dateOfExpiry', 'Date of Expiry', 'date')]}</div>;
            case 'ticket':
                 return <div className="grid grid-cols-2 gap-4">{[renderField('ticketNumber', 'Ticket Number', 'text', true), renderField('airline', 'Airline'), renderField('departureCity', 'Departure City'), renderField('arrivalCity', 'Arrival City'), renderField('travelDate', 'Travel Date', 'date')]}</div>;
            case 'passport':
            default:
                return <p className="text-sm text-text-secondary">No additional information required for this category.</p>;
        }
    };
    
    return (
        <div className="space-y-4">
            {error && <p className="text-danger text-sm text-center bg-danger/10 p-2 rounded">{error}</p>}
            <div>
                 <label htmlFor="category-select" className="block text-sm font-medium text-text-secondary mb-1">New Category *</label>
                 <select id="category-select" value={destination} onChange={handleDestinationChange} className="w-full px-3 py-2 bg-background border border-border-default rounded-md shadow-sm text-text-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                    <option value="" disabled>Select a new category...</option>
                    <option value="passport">Passport</option>
                    <option value="ghanacard">Ghana Card</option>
                    <option value="visa">Visa</option>
                    <option value="permit">Permit</option>
                    <option value="ticket">Ticket</option>
                 </select>
            </div>
            {destination && (
                <div className="p-4 bg-surface rounded border border-border-default">{renderMetadataFields()}</div>
            )}
            <div className="flex justify-end gap-2">
                <button onClick={onCancel} disabled={isSaving} className="px-3 py-1.5 text-sm font-semibold bg-surface-soft text-text-primary rounded-md hover:bg-border-default transition-colors">Cancel</button>
                <button onClick={handleSaveClick} disabled={isSaving || !destination} className="px-3 py-1.5 text-sm font-semibold bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50">
                    {isSaving ? 'Saving...' : 'Save Change'}
                </button>
            </div>
        </div>
    );
};


interface PreviewModalProps {
    doc: DisplayDocument | null;
    onClose: () => void;
    onCategoryChange: (passengerId: string, sourceType: DisplayDocument['sourceType'], sourceId: string, document: UploadedFile, destinationType: DestinationType, newMetadata: any) => Promise<void>;
    onDocumentUpdate: (updatedDoc: DisplayDocument) => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ doc, onClose, onCategoryChange, onDocumentUpdate }) => {
    const [rotation, setRotation] = useState(0);
    const [rotatedFile, setRotatedFile] = useState<UploadedFile | null>(doc ? doc.file : null);
    const [isRotating, setIsRotating] = useState(false);
    const [isChangingCategory, setIsChangingCategory] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const generateRotatedFile = async () => {
            if (!doc) { if (isMounted) setRotatedFile(null); return; }
            if (rotation === 0) { if (isMounted) setRotatedFile(doc.file); return; }
            if (isMounted) setIsRotating(true);
            return new Promise<void>((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = doc.file.dataUrl;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) { reject(new Error('Canvas context not available')); return; }
                    const isSwapped = rotation === 90 || rotation === 270;
                    canvas.width = isSwapped ? img.height : img.width;
                    canvas.height = isSwapped ? img.width : img.height;
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.rotate((rotation * Math.PI) / 180);
                    ctx.drawImage(img, -img.width / 2, -img.height / 2);
                    const rotatedDataUrl = canvas.toDataURL(doc.file.mimeType);
                    fetch(rotatedDataUrl).then(res => res.blob()).then(blob => {
                        if (isMounted) { setRotatedFile({ ...doc.file, dataUrl: rotatedDataUrl, size: blob.size }); }
                        resolve();
                    });
                };
                img.onerror = reject;
            }).finally(() => { if (isMounted) setIsRotating(false); });
        };
        generateRotatedFile();
        return () => { isMounted = false; };
    }, [doc, rotation]);

    useEffect(() => {
        if (doc) {
            setRotation(0);
            setIsChangingCategory(false);
        }
    }, [doc]);

    if (!doc) return null;

    const handleRotate = () => { setRotation(prev => (prev + 90) % 360); };

    const handleSaveCategoryChange = async (destinationType: DestinationType, newMetadata: any) => {
        await onCategoryChange(doc.passengerId, doc.sourceType, doc.sourceId, doc.file, destinationType, newMetadata);
        // The parent component will handle closing the modal upon success
    };

    const handleEditClick = () => {
        setIsEditorOpen(true);
    };

    const handleEditorSave = async (newDataUrl: string) => {
        setIsSaving(true);
        const blob = await (await fetch(newDataUrl)).blob();
        const newFile = new File([blob], doc.file.fileName.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg' });
        
        const newUploadedFile: UploadedFile = {
            fileName: newFile.name,
            mimeType: newFile.type,
            size: newFile.size,
            dataUrl: newDataUrl,
        };

        try {
            // Upload to Drive/Firestore
            const newUploadedFile = await processFileForStorage(newFile);

            // Update Firestore with the new image
            const passengerDoc = await getDoc(doc(db, 'passengers', doc.passengerId));
            if (!passengerDoc.exists()) throw new Error("Passenger not found");
            const passenger = { id: passengerDoc.id, ...(passengerDoc.data() as object) } as Passenger;
            
            const updatedPassenger: Passenger = JSON.parse(JSON.stringify(passenger));
            
            // Update specific document based on type and ID
            switch (doc.sourceType) {
                case 'passport':
                    if (updatedPassenger.passports) {
                        updatedPassenger.passports = updatedPassenger.passports.map(p => p.id === doc.sourceId ? { ...p, document: newUploadedFile } : p);
                    }
                    break;
                case 'ghanacard':
                    if (updatedPassenger.ghanaCardData) updatedPassenger.ghanaCardData.document = newUploadedFile;
                    break;
                case 'visa':
                    updatedPassenger.visas = updatedPassenger.visas.map(v => v.id === doc.sourceId ? { ...v, document: newUploadedFile } : v);
                    break;
                case 'permit':
                    updatedPassenger.permits = updatedPassenger.permits.map(p => p.id === doc.sourceId ? { ...p, document: newUploadedFile } : p);
                    break;
                case 'ticket':
                    updatedPassenger.tickets = updatedPassenger.tickets.map(t => t.id === doc.sourceId ? { ...t, document: newUploadedFile } : t);
                    break;
            }
            
            const { id, ...dataToUpdate } = updatedPassenger;
            await updatePassenger(doc.passengerId, dataToUpdate);
            
            // Update local state to reflect change immediately in the modal
            const updatedDocDisplay: DisplayDocument = { ...doc, file: newUploadedFile };
            onDocumentUpdate(updatedDocDisplay);
            setRotatedFile(newUploadedFile);
            
            setIsEditorOpen(false);
        } catch (e) {
            console.error("Failed to save edited document:", e);
            alert("Failed to save image. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return createPortal(
        <>
            <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[110] p-4" onClick={onClose}>
                <div className="bg-surface p-4 rounded-lg shadow-2xl relative max-w-5xl w-full max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center border-b border-border-default pb-2 mb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-text-primary">{doc.docType}</h3>
                                <OcrSourceBadge source={doc.ocrSource} />
                            </div>
                            <p className="text-sm text-text-secondary">{doc.passengerName} - {doc.companyName}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={handleRotate} title="Rotate" className="text-text-secondary hover:text-primary p-1 rounded-full transition-colors">
                                <ArrowPathIcon className={`h-6 w-6 ${isRotating ? 'animate-spin' : ''}`} />
                            </button>
                            <button onClick={onClose} className="text-text-secondary hover:text-danger text-4xl font-light leading-none transition-colors">&times;</button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto flex items-center justify-center bg-surface-soft rounded">
                        {rotatedFile ? (
                        <img src={rotatedFile.dataUrl} alt={`Full preview of ${doc.docType}`} className="max-w-full max-h-full mx-auto" style={{ transition: 'transform 0.2s', transform: `rotate(${rotation}deg)` }} />
                        ) : (
                        <Spinner />
                        )}
                    </div>
                    {rotatedFile && <ShareToolbar file={rotatedFile} />}
                    
                    <div className="mt-4 pt-4 border-t border-border-default flex flex-col items-center gap-4">
                        {isChangingCategory ? (
                            <div className="w-full">
                                <CategoryChangeForm 
                                    doc={doc}
                                    onSave={handleSaveCategoryChange}
                                    onCancel={() => setIsChangingCategory(false)}
                                />
                            </div>
                        ) : (
                            <div className="flex gap-4">
                                <button 
                                    onClick={handleEditClick}
                                    className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
                                >
                                    Edit Image
                                </button>
                                <button 
                                    onClick={() => setIsChangingCategory(true)} 
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-surface-soft text-text-primary rounded-md hover:bg-border-default transition-colors"
                                >
                                    <PencilIcon className="h-4 w-4" />
                                    Change Category
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {isEditorOpen && rotatedFile && (
                <ImageEditorModal
                    imageSrc={rotatedFile.dataUrl}
                    onClose={() => setIsEditorOpen(false)}
                    onSave={handleEditorSave}
                />
            )}
        </>,
        document.body
    );
};


// --- Main Screen ---
const getDocCategory = (docType: string): string => {
    const lowerDocType = docType.toLowerCase();
    if (lowerDocType.includes('passport')) return 'Passports Biodata';
    if (lowerDocType.includes('ghana card')) return 'Ghana Card';
    if (lowerDocType.includes('visa')) return 'Visa';
    if (lowerDocType.includes('residential permit') || lowerDocType.includes('residence permit')) return 'Residential Permit'; 
    if (lowerDocType.includes('permit')) return 'Other Permits';
    if (lowerDocType.includes('ticket')) return 'Tickets';
    return 'Other Documents';
};

const docCategories = ['all', 'Passports Biodata', 'Ghana Card', 'Visa', 'Residential Permit', 'Other Permits', 'Tickets', 'Other Documents'];

interface DocumentsScreenProps {
    currentUser?: User & UserSettings;
}

const DocumentsScreen: React.FC<DocumentsScreenProps> = ({ currentUser }) => {
    const [passengers, setPassengers] = useState<Passenger[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { companies } = useCompanies();
    
    // Filters
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [docTypeFilter, setDocTypeFilter] = useState<string>('all');
    
    // View state
    const [view, setView] = useState<'grid' | 'list' | 'simple'>(() => {
        return (localStorage.getItem('document-hub-view') as 'grid' | 'list' | 'simple') || 'simple';
    });
    
    // Selection state
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        localStorage.setItem('document-hub-view', view);
    }, [view]);

    // Modal state
    const [selectedDocument, setSelectedDocument] = useState<DisplayDocument | null>(null);

    useEffect(() => {
        setIsLoading(true);
        if (!currentUser) return;

        // Use smart listener
        const unsubscribe = listenToAccessiblePassengers(currentUser, (allPassengers) => {
            setPassengers(allPassengers);
            setIsLoading(false);
        });
        
        return () => unsubscribe();
    }, [currentUser]);
    
    const getCompanyName = (companyId: string) => companies.find(c => c.id === companyId)?.name || 'Unknown Company';
    
    const allDocuments = useMemo<DisplayDocument[]>(() => {
        const documents: DisplayDocument[] = [];
        passengers.forEach(p => {
            const passengerName = `${p.passports.length > 0 ? p.passports[0].firstNames : ''} ${p.passports.length > 0 ? p.passports[0].surname : ''}`;
            const companyName = getCompanyName(p.companyId);

            p.passports.forEach((passport) => {
                if (passport.document) {
                    const docType = 'Passport';
                    documents.push({
                        id: `${p.id}-passport-${passport.id}`,
                        passengerId: p.id,
                        passengerName,
                        companyId: p.companyId,
                        companyName,
                        docType,
                        category: getDocCategory(docType),
                        passengerCategory: p.category,
                        file: passport.document,
                        sourceType: 'passport',
                        sourceId: passport.id,
                        ocrSource: passport.ocrSource,
                    });
                }
            });
            if (p.ghanaCardData?.document) {
                const docType = 'Ghana Card';
                documents.push({
                    id: `${p.id}-ghanacard`,
                    passengerId: p.id,
                    passengerName,
                    companyId: p.companyId,
                    companyName,
                    docType,
                    category: getDocCategory(docType),
                    passengerCategory: p.category,
                    file: p.ghanaCardData.document,
                    sourceType: 'ghanacard',
                    sourceId: p.id,
                    ocrSource: p.ghanaCardData.ocrSource,
                });
            }
            p.visas.forEach((visa) => {
                if (visa.document) {
                    const docType = `Visa (${visa.country || 'N/A'})`;
                    documents.push({
                        id: `${p.id}-visa-${visa.id}`,
                        passengerId: p.id,
                        passengerName,
                        companyId: p.companyId,
                        companyName,
                        docType,
                        category: getDocCategory(docType),
                        passengerCategory: p.category,
                        file: visa.document,
                        sourceType: 'visa',
                        sourceId: visa.id,
                        ocrSource: visa.ocrSource,
                    });
                }
            });
            p.permits.forEach((permit) => {
                if (permit.document) {
                    const docType = permit.type ? `${permit.type}` : 'Permit';
                    documents.push({
                        id: `${p.id}-permit-${permit.id}`,
                        passengerId: p.id,
                        passengerName,
                        companyId: p.companyId,
                        companyName,
                        docType,
                        category: getDocCategory(docType),
                        passengerCategory: p.category,
                        file: permit.document,
                        sourceType: 'permit',
                        sourceId: permit.id,
                        ocrSource: permit.ocrSource,
                    });
                }
            });
            p.tickets.forEach((ticket) => {
                if (ticket.document) {
                    const docType = 'Ticket';
                    documents.push({
                        id: `${p.id}-ticket-${ticket.id}`,
                        passengerId: p.id,
                        passengerName,
                        companyId: p.companyId,
                        companyName,
                        docType,
                        category: getDocCategory(docType),
                        passengerCategory: p.category,
                        file: ticket.document,
                        sourceType: 'ticket',
                        sourceId: ticket.id,
                        ocrSource: ticket.ocrSource,
                    });
                }
            });
            p.otherDocuments?.forEach((otherDoc, index) => {
                if (otherDoc.dataUrl) {
                    const docType = otherDoc.fileName || `Other Document ${index + 1}`;
                    documents.push({
                        id: `${p.id}-other-${index}`,
                        passengerId: p.id,
                        passengerName,
                        companyId: p.companyId,
                        companyName,
                        docType,
                        category: getDocCategory(docType),
                        passengerCategory: p.category,
                        file: otherDoc,
                        sourceType: 'other',
                        sourceId: index.toString(),
                    });
                }
            });
        });
        return documents.sort((a,b) => a.passengerName.localeCompare(b.passengerName));
    }, [passengers, companies]);

    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = { all: allDocuments.length };
        for (const category of docCategories) {
            if (category !== 'all') {
                counts[category] = 0;
            }
        }
        for (const doc of allDocuments) {
            counts[doc.category] = (counts[doc.category] || 0) + 1;
        }
        return counts;
    }, [allDocuments]);


    const filteredDocs = useMemo(() => {
        return allDocuments.filter(doc => {
            const companyMatch = selectedCompanyId === 'all' || doc.companyId === selectedCompanyId;
            const searchMatch = !searchQuery.trim() || doc.passengerName.toLowerCase().includes(searchQuery.toLowerCase());
            const typeMatch = docTypeFilter === 'all' || doc.category === docTypeFilter;
            return companyMatch && searchMatch && typeMatch;
        });
    }, [allDocuments, selectedCompanyId, searchQuery, docTypeFilter]);
    
    const groupedDocsForGrid = useMemo(() => {
        const groups = new Map<string, Map<string, { category: PassengerCategory; docsMap: Map<string, DisplayDocument[]> }>>();
        for (const doc of filteredDocs) {
            if (!groups.has(doc.companyName)) groups.set(doc.companyName, new Map());
            const companyGroup = groups.get(doc.companyName)!;
            if (!companyGroup.has(doc.passengerName)) {
                companyGroup.set(doc.passengerName, { category: doc.passengerCategory, docsMap: new Map() });
            }
            const passengerGroup = companyGroup.get(doc.passengerName)!;
            if (!passengerGroup.docsMap.has(doc.category)) { passengerGroup.docsMap.set(doc.category, []); }
            passengerGroup.docsMap.get(doc.category)!.push(doc);
        }
        return Array.from(groups.entries());
    }, [filteredDocs]);

    const handleCategoryChange = async (passengerId: string, sourceType: DisplayDocument['sourceType'], sourceId: string, document: UploadedFile, destinationType: DestinationType, newMetadata: any) => {
        // ... Logic remains the same ...
        const passengerDoc = await getDoc(doc(db, 'passengers', passengerId));
        if (!passengerDoc.exists()) { throw new Error("Passenger not found"); }
        const passenger = { id: passengerDoc.id, ...passengerDoc.data() } as Passenger;
        
        const updatedPassenger: Passenger = JSON.parse(JSON.stringify(passenger));
        
        switch (sourceType) {
            case 'passport': {
                const passport = updatedPassenger.passports.find(p => p.id === sourceId);
                if (passport) passport.document = undefined;
                break;
            }
            case 'ghanacard': if (updatedPassenger.ghanaCardData) updatedPassenger.ghanaCardData.document = undefined; break;
            case 'visa': updatedPassenger.visas = updatedPassenger.visas.filter(v => v.id !== sourceId); break;
            case 'permit': updatedPassenger.permits = updatedPassenger.permits.filter(p => p.id !== sourceId); break;
            case 'ticket': updatedPassenger.tickets = updatedPassenger.tickets.filter(t => t.id !== sourceId); break;
            case 'other': updatedPassenger.otherDocuments = updatedPassenger.otherDocuments?.filter((_, i) => i.toString() !== sourceId); break;
        }
        
        switch (destinationType) {
            case 'passport': {
                const passport = updatedPassenger.passports.find(p => p.id === newMetadata.passportId);
                if (passport) passport.document = document;
                break;
            }
            case 'ghanacard':
                if (!updatedPassenger.ghanaCardData) { updatedPassenger.ghanaCardData = { cardNumber: newMetadata.cardNumber, dateOfIssue: '', dateOfExpiry: '' }; }
                updatedPassenger.ghanaCardData.document = document;
                updatedPassenger.ghanaCardData.cardNumber = newMetadata.cardNumber;
                break;
            case 'visa':
                const newVisa: VisaData = { id: `visa-${Date.now()}`, document, ...newMetadata };
                if (!updatedPassenger.visas) updatedPassenger.visas = [];
                updatedPassenger.visas.push(newVisa);
                break;
            case 'permit':
                const newPermit: PermitData = { id: `permit-${Date.now()}`, document, ...newMetadata };
                if (!updatedPassenger.permits) updatedPassenger.permits = [];
                updatedPassenger.permits.push(newPermit);
                break;
            case 'ticket':
                const newTicket: TicketData = { id: `ticket-${Date.now()}`, document, ...newMetadata };
                if (!updatedPassenger.tickets) updatedPassenger.tickets = [];
                updatedPassenger.tickets.push(newTicket);
                break;
        }
        
        const { id, ...dataToUpdate } = updatedPassenger;
        await updatePassenger(passengerId, dataToUpdate);
        setSelectedDocument(null);
    };
    
    const handleDocumentUpdate = (updatedDoc: DisplayDocument) => {
        setSelectedDocument(updatedDoc);
    };

    const handleDocClick = (doc: DisplayDocument) => {
        if (isSelectionMode) {
            const newSelection = new Set(selectedDocIds);
            if (newSelection.has(doc.id)) newSelection.delete(doc.id);
            else newSelection.add(doc.id);
            setSelectedDocIds(newSelection);
        } else {
            setSelectedDocument(doc);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedDocIds.size === 0) return;
        setIsDeleting(true);

        try {
            // Group selected docs by passenger to batch updates
            const passengerUpdates = new Map<string, Passenger>();

            // Identify all affected passengers
            const docsToDelete = allDocuments.filter(d => selectedDocIds.has(d.id));
            
            // First, load fresh data for affected passengers
            const affectedPassengerIds = Array.from(new Set(docsToDelete.map(d => d.passengerId)));
            const freshPassengers = await Promise.all(affectedPassengerIds.map(async (id: any) => {
                const snap = await getDoc(doc(db, 'passengers', id as string));
                return { id: snap.id, ...(snap.data() as object) } as Passenger;
            }));

            const passengerMap = new Map(freshPassengers.map(p => [p.id, p]));

            // Process deletions in memory
            docsToDelete.forEach(d => {
                const passenger = passengerMap.get(d.passengerId);
                if (!passenger) return;
                
                switch (d.sourceType) {
                    case 'passport': {
                        const passport = passenger.passports.find(p => p.id === d.sourceId);
                        if (passport) delete passport.document;
                        break;
                    }
                    case 'ghanacard':
                        if (passenger.ghanaCardData) delete passenger.ghanaCardData.document;
                        break;
                    case 'visa':
                        // Visas/Permits/Tickets: we delete the DOCUMENT from the array item, not the item itself (unless requirement changes)
                        // Requirement: "delete single or multiple documents"
                        const visa = passenger.visas?.find(v => v.id === d.sourceId);
                        if (visa) delete visa.document;
                        break;
                    case 'permit':
                         const permit = passenger.permits?.find(p => p.id === d.sourceId);
                         if (permit) delete permit.document;
                        break;
                    case 'ticket':
                         const ticket = passenger.tickets?.find(t => t.id === d.sourceId);
                         if (ticket) delete ticket.document;
                        break;
                    case 'other':
                        if (passenger.otherDocuments) {
                            passenger.otherDocuments = passenger.otherDocuments.filter((_, i) => i.toString() !== d.sourceId);
                        }
                        break;
                }
                passengerUpdates.set(d.passengerId, passenger);
            });

            // Commit updates
            const promises = Array.from(passengerUpdates.values()).map(p => {
                const { id, ...data } = p;
                return updatePassenger(id, data);
            });

            await Promise.all(promises);
            setSelectedDocIds(new Set());
            setIsBulkDeleteModalOpen(false);
            setIsSelectionMode(false);

        } catch (error) {
            console.error("Bulk document delete failed", error);
            alert("Failed to delete documents.");
        } finally {
            setIsDeleting(false);
        }
    };
    
    const renderContent = () => {
        if (isLoading) return <Spinner />;
        if (allDocuments.length === 0) {
             return (
                <div className="text-center py-16 bg-surface rounded-lg shadow-md border border-border-default">
                    <DocumentDuplicateIcon className="w-12 h-12 text-border-default mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-text-primary">No Documents Found</h3>
                    <p className="text-text-secondary mt-1">Upload documents to passenger profiles to see them here.</p>
                </div>
            );
        }
        if (filteredDocs.length === 0) {
            return (
                <div className="text-center py-16 bg-surface rounded-lg shadow-md border border-border-default">
                    <DocumentDuplicateIcon className="w-12 h-12 text-border-default mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-text-primary">No Matching Documents</h3>
                    <p className="text-text-secondary mt-1">Try adjusting your search or filter criteria.</p>
                </div>
            );
        }

        if (view === 'grid') {
            return (
                <div className="space-y-8">
                    {groupedDocsForGrid.map(([companyName, passengerMap]) => (
                        <div key={companyName}>
                            <h3 className="text-xl font-bold text-text-primary mb-4 pb-2 border-b-2 border-primary">{companyName}</h3>
                            <div className="space-y-6">
                                {Array.from(passengerMap.entries()).map(([passengerName, passengerData]) => (
                                    <div key={passengerName}>
                                        <h4 className="font-semibold text-text-primary flex items-center gap-2">
                                            <span>{passengerName}</span>
                                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                                                passengerData.category === 'Expatriate' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-teal-500/20 text-teal-300'
                                            }`}>
                                                {passengerData.category}
                                            </span>
                                        </h4>
                                        <div className="mt-2 space-y-4">
                                            {docCategories.map(category => {
                                                const docs = passengerData.docsMap.get(category);
                                                if (!docs || docs.length === 0) return null;
                                                return (
                                                    <div key={category}>
                                                        <h5 className="text-sm font-bold text-primary-dark">{category}</h5>
                                                        <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                                                            {docs.map(doc => (
                                                                <DocumentThumbnail 
                                                                    key={doc.id} 
                                                                    doc={doc} 
                                                                    onClick={() => handleDocClick(doc)}
                                                                    isSelected={selectedDocIds.has(doc.id)}
                                                                    isSelectionMode={isSelectionMode}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (view === 'simple') {
            const tdBaseClasses = "px-4 py-3 md:px-6 md:py-4 whitespace-nowrap block md:table-cell text-right md:text-left border-b md:border-b-0 border-border-default/50 relative before:content-[attr(data-label)] before:float-left before:font-bold md:before:content-none";
            return (
                <div className="bg-transparent md:bg-surface rounded-lg md:shadow-md md:border md:border-border-default overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="hidden md:table-header-group bg-surface-soft">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Document</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Passenger</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Company</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Passenger Category</th>
                                </tr>
                            </thead>
                            <tbody className="block md:table-row-group">
                                {filteredDocs.map(doc => {
                                    const isSelected = selectedDocIds.has(doc.id);
                                    return (
                                        <tr key={doc.id} onClick={() => handleDocClick(doc)} className={`block md:table-row mb-4 md:mb-0 border md:border-b md:border-border-default rounded-lg shadow-sm md:shadow-none bg-surface transition-colors cursor-pointer ${isSelected ? 'bg-primary/5' : 'hover:bg-surface-soft/50'}`}>
                                            <td className={tdBaseClasses} data-label="Document">
                                                <div className="flex items-center gap-3 justify-end md:justify-start">
                                                    {isSelectionMode && (
                                                         <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-text-secondary'}`}>
                                                            {isSelected && <CheckCircleIcon className="w-4 h-4 text-white" />}
                                                         </div>
                                                    )}
                                                    <img src={doc.file.dataUrl} alt={doc.docType} className="h-8 w-8 object-cover rounded-md flex-shrink-0" />
                                                    <span className="font-medium text-text-primary">{doc.docType}</span>
                                                </div>
                                            </td>
                                            <td className={`${tdBaseClasses} text-sm text-text-secondary`} data-label="Passenger">{doc.passengerName}</td>
                                            <td className={`${tdBaseClasses} text-sm text-text-secondary`} data-label="Company">{doc.companyName}</td>
                                            <td className={tdBaseClasses} data-label="Passenger Category">
                                                <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${ doc.passengerCategory === PassengerCategory.Expatriate ? 'bg-indigo-500/20 text-indigo-300' : 'bg-teal-500/20 text-teal-300'}`}>
                                                    {doc.passengerCategory}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        // Detailed List View
        return (
            <div className="space-y-3">
                {filteredDocs.map(doc => (
                    <DocumentListItem 
                        key={doc.id} 
                        doc={doc} 
                        onClick={() => handleDocClick(doc)}
                        isSelected={selectedDocIds.has(doc.id)}
                        isSelectionMode={isSelectionMode}
                    />
                ))}
            </div>
        );
    };

    if (!currentUser) return null;

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-text-primary">Document Hub</h2>
                        <p className="mt-1 text-text-secondary">Browse and view all uploaded passenger documents.</p>
                    </div>
                    {isSelectionMode ? (
                        <div className="flex gap-2">
                             <button 
                                onClick={() => { setIsSelectionMode(false); setSelectedDocIds(new Set()); }}
                                className="px-4 py-2 text-sm font-semibold bg-surface border border-border-default rounded-md text-text-secondary hover:text-text-primary"
                            >
                                Cancel
                            </button>
                             <button 
                                onClick={() => setIsBulkDeleteModalOpen(true)}
                                disabled={selectedDocIds.size === 0}
                                className="px-4 py-2 text-sm font-semibold bg-danger text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                <TrashIcon className="h-4 w-4" />
                                Delete ({selectedDocIds.size})
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setIsSelectionMode(true)}
                            className="px-4 py-2 text-sm font-semibold bg-surface-soft text-primary border border-primary/20 rounded-md hover:bg-primary/10 transition-colors"
                        >
                            Select Documents
                        </button>
                    )}
                </div>

                <div className="bg-surface p-4 rounded-lg shadow-md border border-border-default space-y-4">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-auto">
                            <div>
                                <label htmlFor="company-filter" className="block text-sm font-medium text-text-secondary mb-1">Company</label>
                                <select id="company-filter" value={selectedCompanyId} onChange={e => setSelectedCompanyId(e.target.value)}
                                    className="w-full px-3 py-2 bg-background border border-border-default rounded-md shadow-sm text-text-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                                    <option value="all">All Companies</option>
                                    {companies.sort((a,b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="search-passenger" className="block text-sm font-medium text-text-secondary mb-1">Passenger Name</label>
                                <SearchInput id="search-passenger" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Enter passenger name..."/>
                            </div>
                        </div>
                        <div className="flex-shrink-0">
                            <label className="block text-sm font-medium text-text-secondary mb-1 invisible">View</label>
                             <div className="flex items-center gap-1 p-1 bg-surface-soft rounded-lg">
                                <button onClick={() => setView('grid')} className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-primary text-on-primary shadow' : 'text-text-secondary hover:bg-border-default'}`} title="Grid View">
                                    <Squares2X2Icon className="h-5 w-5" />
                                </button>
                                <button onClick={() => setView('list')} className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-primary text-on-primary shadow' : 'text-text-secondary hover:bg-border-default'}`} title="Detailed List View">
                                    <QueueListIcon className="h-5 w-5" />
                                </button>
                                <button onClick={() => setView('simple')} className={`p-1.5 rounded-md transition-colors ${view === 'simple' ? 'bg-primary text-on-primary shadow' : 'text-text-secondary hover:bg-border-default'}`} title="Simple List View">
                                    <Bars3Icon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-border-default">
                        <label className="block text-sm font-medium text-text-secondary mb-2">Filter by Category</label>
                        <div className="flex flex-wrap gap-2">
                             {docCategories.map(cat => {
                                const count = categoryCounts[cat] ?? 0;
                                if (count === 0 && cat !== 'all') return null;
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => setDocTypeFilter(cat)}
                                        className={`px-3 py-1.5 font-semibold rounded-full text-sm transition-colors ${
                                            docTypeFilter === cat
                                            ? 'bg-primary text-white shadow'
                                            : 'bg-surface-soft text-text-primary hover:bg-border-default'
                                        }`}
                                    >
                                        {cat === 'all' ? 'All Categories' : cat}
                                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${docTypeFilter === cat ? 'bg-white/20' : 'bg-surface'}`}>{count}</span>
                                    </button>
                                )
                             })}
                        </div>
                    </div>
                </div>

                {renderContent()}
            </div>
            
            <PreviewModal 
                doc={selectedDocument} 
                onClose={() => setSelectedDocument(null)} 
                onCategoryChange={handleCategoryChange}
                onDocumentUpdate={handleDocumentUpdate}
            />

             <ConfirmationModal
                isOpen={isBulkDeleteModalOpen}
                onClose={() => setIsBulkDeleteModalOpen(false)}
                onConfirm={handleBulkDelete}
                title={`Delete ${selectedDocIds.size} Documents`}
                confirmText="Delete All"
                isConfirming={isDeleting}
                confirmVariant="danger"
            >
                <p>
                  Are you sure you want to delete <strong className="text-danger">{selectedDocIds.size} selected documents</strong>?
                </p>
                <p className="mt-2 text-sm">
                    This will remove the file attachments from the passenger profiles. The metadata records (e.g., Visa Number, Dates) will remain intact.
                </p>
            </ConfirmationModal>
        </>
    );
};

export default DocumentsScreen;
