
// ... existing imports
import React, { useState } from 'react';
import { Company, PassengerCategory, PassportData, ContactData, VisaData, PermitData, TicketData, UploadedFile, Passenger, GhanaCardData } from '../types';
import { updatePassenger, deleteField } from '../services/firebase';
import { extractPassportData, extractVisaData, extractPermitData, extractTicketData, extractGhanaCardData, extractProfilePhoto, extractPassportDataFromText, extractGhanaCardDataFromText, classifyAndExtractDocument } from '../services/geminiService';
import { processFileForStorage } from '../services/storageService';
import { FileUploader } from '../components/FileUploader';
import { ArrowLeftIcon } from '../components/icons/index';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ProfilePhotoViewerModal } from '../components/ProfilePhotoViewerModal';
import { ProfilePhotoUpdateModal } from '../components/ProfilePhotoUpdateModal';
import { UserCircleIcon, CameraIcon } from '../components/icons/index';
import { compressDataUrl, smartCompressImage } from '../utils/imageUtils';
import { OcrSourceBadge } from '../components/OcrSourceBadge';

// ... existing Reusable Components ...
const BackButton: React.FC<{ onClick: () => void, children?: React.ReactNode}> = ({ onClick, children }) => (
    <button onClick={onClick} className="mb-4 px-4 py-2 bg-surface-soft text-text-primary font-semibold rounded-md hover:bg-border-default transition-colors">
        <span className="flex items-center gap-2">
            <ArrowLeftIcon />
            {children || 'Back to Details'}
        </span>
    </button>
);

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`bg-surface rounded-lg shadow-md border border-border-default p-4 sm:p-6 ${className || ''}`}>{children}</div>
);

type ButtonVariant = 'primary' | 'secondary' | 'danger';
const Button: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string; type?: 'button'|'submit'|'reset', disabled?: boolean; variant?: ButtonVariant }> = ({ children, onClick, className, type = 'button', disabled = false, variant = 'primary' }) => {
    const baseClasses = `px-4 py-2 rounded-md font-semibold shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2`;
    const variantClasses = {
        primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
        secondary: 'bg-surface-soft text-text-primary hover:bg-border-default focus:ring-primary',
        danger: 'bg-danger text-white hover:bg-red-700 focus:ring-danger'
    };
    const disabledClasses = disabled ? 'bg-neutral-600 text-neutral-400 cursor-not-allowed' : '';
    return <button type={type} onClick={onClick} disabled={disabled} className={`${baseClasses} ${variantClasses[variant]} ${className}`}>{children}</button>;
};

const OcrLoadingOverlay: React.FC = () => (
    <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-md">
        <div className="flex items-center justify-center space-x-1.5">
            <div className="h-2 w-2 bg-primary rounded-full animate-pulse [animation-delay:-0.3s]"></div>
            <div className="h-2 w-2 bg-primary rounded-full animate-pulse [animation-delay:-0.15s]"></div>
            <div className="h-2 w-2 bg-primary rounded-full animate-pulse"></div>
        </div>
        <p className="text-sm font-semibold text-primary mt-2">Extracting data with AI...</p>
    </div>
);

// --- Form State & Initial Values ---
const initialPassportData: Omit<PassportData, 'document'> = { id: '', type: '', code: '', passportNumber: '', surname: '', firstNames: '', nationality: '', dateOfBirth: '', sex: '', placeOfBirth: '', dateOfIssue: '', authority: '', dateOfExpiry: '' };
const initialGhanaCardData: Omit<GhanaCardData, 'document'> = { cardNumber: '', dateOfIssue: '', dateOfExpiry: '', surname: '', firstNames: '', nationality: '', dateOfBirth: '', height: '', documentNumber: '', placeOfIssuance: '' };
const initialVisaData: Omit<VisaData, 'id'|'document'> = { visaNumber: '', country: '', dateOfIssue: '', dateOfExpiry: '' };
const initialPermitData: Omit<PermitData, 'id'|'document'> = { permitNumber: '', type: '', dateOfIssue: '', dateOfExpiry: '' };
const initialTicketData: Omit<TicketData, 'id'|'document'> = { ticketNumber: '', airline: '', departureCity: '', arrivalCity: '', travelDate: '', travelTime: '' };


const hasData = (obj: object) => {
    // Exclude 'document' and 'id' fields from the check
    return Object.entries(obj).some(([key, value]) => {
        if (key === 'document' || key === 'id') return false;
        if (Array.isArray(value)) return value.length > 0;
        return value && typeof value === 'string' && value.trim() !== '';
    });
};

// --- Main Screen Component ---

interface EditPassengerScreenProps {
  company: Company;
  passenger: Passenger;
  onBack: () => void;
  onSave: () => void;
}

const EditPassengerScreen: React.FC<EditPassengerScreenProps> = ({ company, passenger, onBack, onSave }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ocrState, setOcrState] = useState<{ [key: string]: boolean }>({});
    const [clearConfirmation, setClearConfirmation] = useState<{ title: string; onConfirm: () => void } | null>(null);
    const [isProfilePhotoViewerOpen, setIsProfilePhotoViewerOpen] = useState(false);
    const [isPhotoUpdateModalOpen, setIsPhotoUpdateModalOpen] = useState(false);

    // Form state initialized with existing passenger data
    const [category, setCategory] = useState<PassengerCategory>(passenger.category);
    const [passports, setPassports] = useState<PassportData[]>(passenger.passports || []);
    const [ghanaCardData, setGhanaCardData] = useState<GhanaCardData>(passenger.ghanaCardData || { ...initialGhanaCardData, dateOfIssue: '', dateOfExpiry: ''});
    const [passportText, setPassportText] = useState('');
    const [ghanaCardText, setGhanaCardText] = useState('');
    const [contactData, setContactData] = useState<ContactData>(passenger.contactData || { email: '', phone: '' });
    const [visas, setVisas] = useState<Partial<VisaData>[]>(passenger.visas || []);
    const [permits, setPermits] = useState<Partial<PermitData>[]>(passenger.permits || []);
    const [tickets, setTickets] = useState<Partial<TicketData>[]>(passenger.tickets || []);
    const [otherDocuments, setOtherDocuments] = useState<UploadedFile[]>(passenger.otherDocuments || []);
    const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | undefined>(passenger.profilePhotoUrl);

    const passportData = passports.length > 0 ? passports[0] : initialPassportData;
    const setPassportData = (updater: React.SetStateAction<PassportData>) => {
        setPassports(prev => {
            const newPassports = [...prev];
            if (newPassports.length === 0) {
                newPassports.push(typeof updater === 'function' ? updater(initialPassportData as PassportData) : updater);
            } else {
                newPassports[0] = typeof updater === 'function' ? updater(newPassports[0]) : updater;
            }
            return newPassports;
        });
    };

    const handleFormChange = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, field: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setter(prev => ({ ...prev, [field]: e.target.value }));
    };
    
    const handleDynamicListChange = <T extends object>(list: T[], setter: React.Dispatch<React.SetStateAction<T[]>>, index: number, field: string, value: any) => {
        const newList = [...list];
        newList[index] = { ...newList[index], [field]: value };
        setter(newList);
    };
    
    const addDynamicListItem = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, newItem: T) => {
        setter(prev => [...prev, newItem]);
    };

    const removeDynamicListItem = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, index: number) => {
        setter(prev => prev.filter((_, i) => i !== index));
    };

    const handleSmartUpload = async (payload: { file: File, dataUrl: string }) => {
        const ocrKey = 'smart-upload';
        try {
            setOcrState(prev => ({ ...prev, [ocrKey]: true }));
            
            // Start storage processing in parallel with OCR
            const storagePromise = processFileForStorage(payload.file);
            
            // Compress image for OCR to speed up processing
            const compressedForOcr = await smartCompressImage(payload.dataUrl);
            const base64Image = compressedForOcr.split(',')[1];
            
            const resultPromise = classifyAndExtractDocument(base64Image, payload.file.type);
            
            const [document, result] = await Promise.all([
                storagePromise,
                resultPromise
            ]);

            if (result.type === 'passport') {
                setPassports(prev => {
                    const base = prev.length > 0 ? prev[0] : initialPassportData;
                    return [{ ...base, ...result.data, document } as PassportData];
                });
                alert("Passport data extracted and uploaded successfully!");
            } else if (result.type === 'ghana_card') {
                setGhanaCardData(prev => ({ ...prev, ...result.data, document }));
                alert("Ghana Card data extracted and uploaded successfully!");
            } else if (result.type === 'visa') {
                setVisas(prev => [...prev, { id: Date.now().toString(), ...result.data, document }]);
                alert("Visa data extracted and uploaded successfully!");
            } else if (result.type === 'permit') {
                setPermits(prev => [...prev, { id: Date.now().toString(), ...result.data, document }]);
                alert("Permit data extracted and uploaded successfully!");
            } else if (result.type === 'ticket') {
                setTickets(prev => [...prev, { id: Date.now().toString(), ...result.data, document }]);
                alert("Ticket data extracted and uploaded successfully!");
            } else {
                setOtherDocuments(prev => [...prev, document]);
                alert("Document uploaded to 'Other Documents' section.");
            }
        } catch (err) {
            console.error("Smart upload error:", err);
            alert(`Smart Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}.`);
        } finally {
            setOcrState(prev => ({ ...prev, [ocrKey]: false }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Create a mutable copy to potentially augment with name data
        const finalPassportData = { ...passportData };
        
        // If passport name is missing, try to populate from Ghana Card
        if ((!finalPassportData.firstNames || !finalPassportData.surname) && ghanaCardData.firstNames && ghanaCardData.surname) {
            finalPassportData.firstNames = ghanaCardData.firstNames;
            finalPassportData.surname = ghanaCardData.surname;
        }

        // Final validation checks
        if (!finalPassportData.surname || !finalPassportData.firstNames) {
            setError("Surname and First Names are required.");
            window.scrollTo(0,0);
            return;
        }

        const isLocalWithNoId = category === PassengerCategory.Local && !ghanaCardData.cardNumber && !finalPassportData.passportNumber;
        const isExpatWithNoId = category === PassengerCategory.Expatriate && !finalPassportData.passportNumber;

        if (isExpatWithNoId) {
            setError("Expatriates must have a Passport Number.");
            window.scrollTo(0,0);
            return;
        }

        if (isLocalWithNoId) {
            setError("Local personnel must have either a Ghana Card Number or a Passport Number.");
            window.scrollTo(0, 0);
            return;
        }

        setIsSubmitting(true);
        try {
            // Sanitize all data before sending to Firestore to prevent `undefined` values.
            const dataToUpdate: { [key: string]: any } = {
                category,
                profilePhotoUrl: profilePhotoUrl || deleteField(),
                contactData: {
                    email: contactData.email || '',
                    phone: contactData.phone || '',
                },
                    passports: passports.map(p => ({
                        id: p.id || Date.now().toString(),
                        type: p.type || '',
                        code: p.code || '',
                        passportNumber: p.passportNumber || '',
                        surname: p.surname || '',
                        firstNames: p.firstNames || '',
                        nationality: p.nationality || '',
                        dateOfBirth: p.dateOfBirth || '',
                        sex: p.sex || '',
                        placeOfBirth: p.placeOfBirth || '',
                        dateOfIssue: p.dateOfIssue || '',
                        authority: p.authority || '',
                        dateOfExpiry: p.dateOfExpiry || '',
                        ocrSource: p.ocrSource || '',
                        ...(p.document && { document: p.document })
                    })),
                    visas: visas
                        .filter(v => v.visaNumber)
                        .map(v => ({
                            id: v.id || Date.now().toString(),
                            visaNumber: v.visaNumber || '',
                            country: v.country || '',
                            dateOfIssue: v.dateOfIssue || '',
                            dateOfExpiry: v.dateOfExpiry || '',
                            ocrSource: v.ocrSource || '',
                            ...(v.document && { document: v.document })
                        })),
                    permits: permits
                        .filter(p => p.permitNumber)
                        .map(p => ({
                            id: p.id || Date.now().toString(),
                            permitNumber: p.permitNumber || '',
                            type: p.type || '',
                            dateOfIssue: p.dateOfIssue || '',
                            dateOfExpiry: p.dateOfExpiry || '',
                            ocrSource: p.ocrSource || '',
                            ...(p.document && { document: p.document })
                        })),
                    tickets: tickets
                        .filter(t => t.ticketNumber || t.travelDate || t.airline || t.departureCity) // Allow if fields are present
                        .map(t => ({
                            id: t.id || Date.now().toString(),
                            ticketNumber: t.ticketNumber || '',
                            airline: t.airline || '',
                            departureCity: t.departureCity || '',
                            arrivalCity: t.arrivalCity || '',
                            travelDate: t.travelDate || '',
                            travelTime: t.travelTime || '',
                            ocrSource: t.ocrSource || '',
                            ...(t.document && { document: t.document })
                        })),
                otherDocuments: otherDocuments,
            };

            // Handle ghanaCardData separately for addition or deletion
            if (category === PassengerCategory.Local && ghanaCardData.cardNumber) {
                dataToUpdate.ghanaCardData = {
                    cardNumber: ghanaCardData.cardNumber || '',
                    surname: ghanaCardData.surname || '',
                    firstNames: ghanaCardData.firstNames || '',
                    nationality: ghanaCardData.nationality || '',
                    dateOfBirth: ghanaCardData.dateOfBirth || '',
                    height: ghanaCardData.height || '',
                    documentNumber: ghanaCardData.documentNumber || '',
                    placeOfIssuance: ghanaCardData.placeOfIssuance || '',
                    dateOfIssue: ghanaCardData.dateOfIssue || '',
                    dateOfExpiry: ghanaCardData.dateOfExpiry || '',
                    ocrSource: ghanaCardData.ocrSource || '',
                    ...(ghanaCardData.document && { document: ghanaCardData.document })
                };
            } else {
                dataToUpdate.ghanaCardData = deleteField();
            }

            await updatePassenger(passenger.id, dataToUpdate);
            onSave();
        } catch (err) {
            console.error("Update failed:", err);
            setError("Failed to save personnel. Please check the data and try again.");
            window.scrollTo(0,0);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // Updated input classes
    const inputClasses = "p-2 border border-border-default bg-input text-on-input rounded-md placeholder:text-text-secondary focus:ring-1 focus:ring-primary focus:outline-none w-full";
    const labelClasses = "block text-xs font-medium text-text-secondary mb-1";

    const hasPassportData = hasData(passportData);
    const hasGhanaCardData = hasData(ghanaCardData);

    return (
        <div>
            <BackButton onClick={onBack} />
            <div className="mb-6">
                <h2 className="text-3xl font-bold text-text-primary">Edit Personnel</h2>
                <p className="text-text-secondary">Updating details for <span className="font-semibold">{passports.length > 0 ? `${passports[0].firstNames} ${passports[0].surname}` : 'New Personnel'}</span>.</p>
            </div>
            {error && <div className="bg-danger text-white p-4 rounded-md mb-6 text-center font-semibold">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="mb-6 flex flex-col items-center">
                    <div 
                        className="relative group cursor-pointer"
                        onClick={() => setIsPhotoUpdateModalOpen(true)}
                    >
                        {profilePhotoUrl ? (
                            <img src={profilePhotoUrl} alt="Profile" className="h-32 w-32 rounded-full object-cover border-4 border-surface-soft shadow-lg" />
                        ) : (
                            <div className="h-32 w-32 rounded-full bg-surface-soft border-4 border-border-default flex items-center justify-center text-text-secondary group-hover:border-primary group-hover:text-primary transition-colors">
                                <UserCircleIcon className="h-20 w-20" />
                            </div>
                        )}
                        <div className="absolute bottom-0 right-0 bg-surface rounded-full p-2 shadow-md border border-border-default text-text-secondary group-hover:text-primary">
                            <CameraIcon className="h-5 w-5" />
                        </div>
                    </div>
                    <p className="text-sm text-text-secondary mt-2">
                        {profilePhotoUrl ? 'Click to Change Photo' : 'Click to Add Photo'}
                    </p>
                </div>

                {/* --- Smart Document Upload --- */}
                <Card className="border-primary/30 bg-primary/5">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-primary">Smart Document Upload</h3>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">AI Powered</span>
                    </div>
                    <p className="text-sm text-text-secondary mb-4">Upload any document (Passport, Ghana Card, Visa, Ticket, etc.) and AI will automatically categorize it and extract the details.</p>
                    <div className="relative">
                        {ocrState['smart-upload'] && <OcrLoadingOverlay />}
                        <FileUploader 
                            label="Drop any document here for AI processing" 
                            onFileUpload={handleSmartUpload}
                        />
                    </div>
                </Card>

                {/* --- Basic Information --- */}
                <Card>
                    <h3 className="text-lg font-semibold text-text-primary mb-4 border-b border-border-default pb-2">Basic Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary">Category</label>
                            <select value={category} onChange={e => setCategory(e.target.value as PassengerCategory)} className={`mt-1 w-full ${inputClasses}`}>
                                <option value={PassengerCategory.Local}>Local</option>
                                <option value={PassengerCategory.Expatriate}>Expatriate</option>
                                <option value={PassengerCategory.WalkIn}>Walk-in</option>
                            </select>
                        </div>
                    </div>
                </Card>
                
                 {/* --- Ghana Card Section (Conditional) --- */}
                 {category === PassengerCategory.Local && (
                    <Card>
                        <div className="flex justify-between items-center mb-4 border-b border-border-default pb-2">
                            <h3 className="text-lg font-semibold text-text-primary">Ghana Card Details (Primary ID for Locals)</h3>
                             {hasGhanaCardData && (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="!text-sm !py-1 !px-2 !text-amber-500 hover:!bg-amber-500/10"
                                    onClick={() => setClearConfirmation({
                                        title: 'Clear Ghana Card Fields',
                                        onConfirm: () => {
                                            const doc = ghanaCardData.document;
                                            setGhanaCardData({ ...initialGhanaCardData, document: doc, dateOfIssue: '', dateOfExpiry: '' });
                                            setClearConfirmation(null);
                                        }
                                    })}
                                >
                                    Clear Fields
                                </Button>
                            )}
                        </div>
                        <FileUploader
                            label="Upload Ghana Card"
                            currentFileUrl={ghanaCardData.document?.dataUrl}
                            onFileUpload={async (payload) => {
                                const ocrKey = 'ghanaCard';
                                try {
                                    setOcrState(prev => ({ ...prev, [ocrKey]: true }));
                                    
                                    // Start storage processing in parallel with OCR
                                    const storagePromise = processFileForStorage(payload.file);
                                    
                                    // Compress image for OCR to speed up processing
                                    const compressedForOcr = await smartCompressImage(payload.dataUrl);
                                    const base64Image = compressedForOcr.split(',')[1];
                                    
                                    const extractedDataPromise = extractGhanaCardData(base64Image, payload.file.type);
                                    const extractedPhotoPromise = extractProfilePhoto(base64Image, payload.file.type);
                                    
                                    const [document, extractedData, extractedPhoto] = await Promise.all([
                                        storagePromise,
                                        extractedDataPromise,
                                        extractedPhotoPromise
                                    ]);

                                    setGhanaCardData(prev => ({ ...prev, ...extractedData, document }));
                                    
                                    if (extractedPhoto) {
                                        const compressedPhoto = await compressDataUrl(extractedPhoto, 256, 256);
                                        setProfilePhotoUrl(compressedPhoto);
                                    }
                                } catch (err) {
                                    const document: UploadedFile = {
                                        fileName: payload.file.name,
                                        mimeType: payload.file.type,
                                        size: payload.file.size,
                                        dataUrl: payload.dataUrl,
                                    };
                                    setGhanaCardData(prev => ({ ...prev, document }));
                                    alert(`Upload or OCR failed: ${err instanceof Error ? err.message : 'Unknown error'}. Please fill fields manually.`);
                                } finally {
                                    setOcrState(prev => ({ ...prev, [ocrKey]: false }));
                                }
                            }}
                        />
                        <div className="mt-4">
                            <label className={labelClasses}>Or Paste Ghana Card Text</label>
                            <div className="flex gap-2">
                                <textarea
                                    value={ghanaCardText}
                                    onChange={(e) => setGhanaCardText(e.target.value)}
                                    placeholder="Paste text extracted from Ghana Card..."
                                    className={`${inputClasses} flex-1 min-h-[80px]`}
                                />
                                <Button
                                    variant="secondary"
                                    onClick={async () => {
                                        if (!ghanaCardText.trim()) return;
                                        const ocrKey = 'ghanaCard';
                                        try {
                                            setOcrState(prev => ({ ...prev, [ocrKey]: true }));
                                            const extractedData = await extractGhanaCardDataFromText(ghanaCardText);
                                            setGhanaCardData(prev => ({ ...prev, ...extractedData }));
                                            setGhanaCardText(''); // Clear after successful extraction
                                        } catch (err) {
                                            alert(`Text extraction failed: ${err instanceof Error ? err.message : 'Unknown error'}.`);
                                        } finally {
                                            setOcrState(prev => ({ ...prev, [ocrKey]: false }));
                                        }
                                    }}
                                    disabled={!ghanaCardText.trim() || ocrState['ghanaCard']}
                                >
                                    Extract
                                </Button>
                            </div>
                        </div>
                        <div className="relative">
                            {ocrState['ghanaCard'] && <OcrLoadingOverlay />}
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="sm:col-span-2 lg:col-span-3">
                                    <OcrSourceBadge source={ghanaCardData.ocrSource} />
                                </div>
                                <div>
                                    <label htmlFor="ghanaCardSurname" className={labelClasses}>Surname</label>
                                    <input id="ghanaCardSurname" placeholder="Enter surname" value={ghanaCardData.surname || ''} onChange={handleFormChange(setGhanaCardData, 'surname')} className={inputClasses} />
                                </div>
                                <div>
                                    <label htmlFor="ghanaCardFirstNames" className={labelClasses}>First Names</label>
                                    <input id="ghanaCardFirstNames" placeholder="Enter first names" value={ghanaCardData.firstNames || ''} onChange={handleFormChange(setGhanaCardData, 'firstNames')} className={inputClasses} />
                                </div>
                                <div>
                                    <label htmlFor="cardNumber" className={labelClasses}>Personal ID Number *</label>
                                    <input id="cardNumber" placeholder="GHA-..." value={ghanaCardData.cardNumber} onChange={handleFormChange(setGhanaCardData, 'cardNumber')} className={inputClasses} />
                                </div>
                                <div>
                                    <label htmlFor="ghanaCardNationality" className={labelClasses}>Nationality</label>
                                    <input id="ghanaCardNationality" placeholder="e.g. Ghanaian" value={ghanaCardData.nationality || ''} onChange={handleFormChange(setGhanaCardData, 'nationality')} className={inputClasses} />
                                </div>
                                <div>
                                    <label htmlFor="ghanaCardDateOfBirth" className={labelClasses}>Date of Birth</label>
                                    <input id="ghanaCardDateOfBirth" type="date" value={ghanaCardData.dateOfBirth || ''} onChange={handleFormChange(setGhanaCardData, 'dateOfBirth')} className={inputClasses} />
                                </div>
                                <div>
                                    <label htmlFor="ghanaCardHeight" className={labelClasses}>Height</label>
                                    <input id="ghanaCardHeight" placeholder="e.g. 1.75m" value={ghanaCardData.height || ''} onChange={handleFormChange(setGhanaCardData, 'height')} className={inputClasses} />
                                </div>
                                <div>
                                    <label htmlFor="ghanaCardDocumentNumber" className={labelClasses}>Document Number</label>
                                    <input id="ghanaCardDocumentNumber" placeholder="e.g. GHA..." value={ghanaCardData.documentNumber || ''} onChange={handleFormChange(setGhanaCardData, 'documentNumber')} className={inputClasses} />
                                </div>
                                <div>
                                    <label htmlFor="ghanaCardPlaceOfIssuance" className={labelClasses}>Place of Issuance</label>
                                    <input id="ghanaCardPlaceOfIssuance" placeholder="e.g. Accra" value={ghanaCardData.placeOfIssuance || ''} onChange={handleFormChange(setGhanaCardData, 'placeOfIssuance')} className={inputClasses} />
                                </div>
                                <div>
                                    <label htmlFor="ghanaCardDateOfIssue" className={labelClasses}>Date of Issue</label>
                                    <input id="ghanaCardDateOfIssue" type="date" value={ghanaCardData.dateOfIssue} onChange={handleFormChange(setGhanaCardData, 'dateOfIssue')} className={inputClasses} />
                                </div>
                                <div>
                                    <label htmlFor="ghanaCardDateOfExpiry" className={labelClasses}>Date of Expiry</label>
                                    <input id="ghanaCardDateOfExpiry" type="date" value={ghanaCardData.dateOfExpiry} onChange={handleFormChange(setGhanaCardData, 'dateOfExpiry')} className={inputClasses} />
                                </div>
                            </div>
                        </div>
                    </Card>
                 )}


                {/* --- Passport Section --- */}
                {passports.map((passport, index) => (
                    <Card key={passport.id || index}>
                         <div className="flex justify-between items-center mb-4 border-b border-border-default pb-2">
                            <h3 className="text-lg font-semibold text-text-primary">Passport #{index + 1} Details</h3>
                            <div className="flex gap-2">
                                {hasData(passport) && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        className="!text-sm !py-1 !px-2 !text-amber-500 hover:!bg-amber-500/10"
                                        onClick={() => setClearConfirmation({
                                            title: `Clear Passport #${index + 1} Fields`,
                                            onConfirm: () => {
                                                const doc = passport.document;
                                                const newPassports = [...passports];
                                                newPassports[index] = { ...initialPassportData, id: passport.id, document: doc };
                                                setPassports(newPassports);
                                                setClearConfirmation(null);
                                            }
                                        })}
                                    >
                                        Clear Fields
                                    </Button>
                                )}
                                {passports.length > 1 && (
                                    <Button variant="danger" onClick={() => removeDynamicListItem(setPassports, index)} className="!px-2 !py-1 !text-sm">Remove</Button>
                                )}
                            </div>
                        </div>
                        <FileUploader 
                            label={`Upload Passport #${index + 1}`} 
                            currentFileUrl={passport.document?.dataUrl}
                            onFileUpload={async (payload) => {
                                const ocrKey = `passport-${index}`;
                                try {
                                    setOcrState(prev => ({ ...prev, [ocrKey]: true }));
                                    
                                    // Start storage processing in parallel with OCR
                                    const storagePromise = processFileForStorage(payload.file);
                                    
                                    // Compress image for OCR to speed up processing
                                    const compressedForOcr = await smartCompressImage(payload.dataUrl);
                                    const base64Image = compressedForOcr.split(',')[1];
                                    
                                    const extractedDataPromise = extractPassportData(base64Image, payload.file.type);
                                    const extractedPhotoPromise = extractProfilePhoto(base64Image, payload.file.type);
                                    
                                    const [document, extractedData, extractedPhoto] = await Promise.all([
                                        storagePromise,
                                        extractedDataPromise,
                                        extractedPhotoPromise
                                    ]);

                                    const newPassports = [...passports];
                                    newPassports[index] = { ...newPassports[index], ...extractedData, document };
                                    setPassports(newPassports);
 
                                    if (extractedPhoto) {
                                        const compressedPhoto = await compressDataUrl(extractedPhoto, 256, 256);
                                        setProfilePhotoUrl(compressedPhoto);
                                    }
                                } catch (err) {
                                    const document: UploadedFile = {
                                        fileName: payload.file.name,
                                        mimeType: payload.file.type,
                                        size: payload.file.size,
                                        dataUrl: payload.dataUrl,
                                    };
                                    const newPassports = [...passports];
                                    newPassports[index] = { ...newPassports[index], document };
                                    setPassports(newPassports);
                                    alert(`Upload or OCR failed: ${err instanceof Error ? err.message : 'Unknown error'}. Please fill fields manually.`);
                                } finally {
                                    setOcrState(prev => ({ ...prev, [ocrKey]: false }));
                                }
                            }}
                        />
                        <div className="mt-4">
                            <label className={labelClasses}>Or Paste Passport Text</label>
                            <div className="flex gap-2">
                                <textarea
                                    value={passportText}
                                    onChange={(e) => setPassportText(e.target.value)}
                                    placeholder="Paste text extracted from passport..."
                                    className={`${inputClasses} flex-1 min-h-[80px]`}
                                />
                                <Button
                                    variant="secondary"
                                    onClick={async () => {
                                        if (!passportText.trim()) return;
                                        const ocrKey = `passport-${index}`;
                                        try {
                                            setOcrState(prev => ({ ...prev, [ocrKey]: true }));
                                            const extractedData = await extractPassportDataFromText(passportText);
                                            const newPassports = [...passports];
                                            newPassports[index] = { ...newPassports[index], ...extractedData };
                                            setPassports(newPassports);
                                            setPassportText(''); // Clear after successful extraction
                                        } catch (err) {
                                            alert(`Text extraction failed: ${err instanceof Error ? err.message : 'Unknown error'}.`);
                                        } finally {
                                            setOcrState(prev => ({ ...prev, [ocrKey]: false }));
                                        }
                                    }}
                                    disabled={!passportText.trim() || ocrState[`passport-${index}`]}
                                >
                                    Extract
                                </Button>
                            </div>
                        </div>
                        <div className="relative">
                            {ocrState[`passport-${index}`] && <OcrLoadingOverlay />}
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="sm:col-span-2 lg:col-span-3">
                                    <OcrSourceBadge source={passport.ocrSource} />
                                </div>
                                <div>
                                    <label htmlFor={`firstNames-${index}`} className={labelClasses}>First Names *</label>
                                    <input id={`firstNames-${index}`} placeholder="Enter first names" value={passport.firstNames} onChange={(e) => handleDynamicListChange(passports, setPassports, index, 'firstNames', e.target.value)} className={inputClasses} />
                                </div>
                                <div>
                                    <label htmlFor={`surname-${index}`} className={labelClasses}>Surname *</label>
                                    <input id={`surname-${index}`} placeholder="Enter surname" value={passport.surname} onChange={(e) => handleDynamicListChange(passports, setPassports, index, 'surname', e.target.value)} className={inputClasses} />
                                </div>
                                <div>
                                    <label htmlFor={`type-${index}`} className={labelClasses}>Type</label>
                                    <input id={`type-${index}`} placeholder="e.g., P" value={passport.type} onChange={(e) => handleDynamicListChange(passports, setPassports, index, 'type', e.target.value)} className={inputClasses} />
                                </div>
                                <div>
                                    <label htmlFor={`passportNumber-${index}`} className={labelClasses}>Passport Number *</label>
                                    <input id={`passportNumber-${index}`} placeholder="Enter passport number" value={passport.passportNumber} onChange={(e) => handleDynamicListChange(passports, setPassports, index, 'passportNumber', e.target.value)} className={inputClasses} />
                                </div>
                                <div>
                                    <label htmlFor={`nationality-${index}`} className={labelClasses}>Nationality</label>
                                    <input id={`nationality-${index}`} placeholder="e.g., Ghanaian" value={passport.nationality} onChange={(e) => handleDynamicListChange(passports, setPassports, index, 'nationality', e.target.value)} className={inputClasses} />
                                </div>
                                <div>
                                    <label htmlFor={`placeOfBirth-${index}`} className={labelClasses}>Place of Birth</label>
                                    <input id={`placeOfBirth-${index}`} placeholder="e.g., Accra" value={passport.placeOfBirth} onChange={(e) => handleDynamicListChange(passports, setPassports, index, 'placeOfBirth', e.target.value)} className={inputClasses} />
                                </div>
                                <div>
                                    <label htmlFor={`dateOfBirth-${index}`} className={labelClasses}>Date of Birth</label>
                                    <input id={`dateOfBirth-${index}`} type="date" value={passport.dateOfBirth} onChange={(e) => handleDynamicListChange(passports, setPassports, index, 'dateOfBirth', e.target.value)} className={`${inputClasses} w-full`} />
                                </div>
                                <div>
                                    <label htmlFor={`sex-${index}`} className={labelClasses}>Sex</label>
                                    <input id={`sex-${index}`} placeholder="e.g., M or F" value={passport.sex} onChange={(e) => handleDynamicListChange(passports, setPassports, index, 'sex', e.target.value)} className={inputClasses} />
                                </div>
                                <div>
                                    <label htmlFor={`authority-${index}`} className={labelClasses}>Authority</label>
                                    <input id={`authority-${index}`} placeholder="e.g., Passport Office" value={passport.authority} onChange={(e) => handleDynamicListChange(passports, setPassports, index, 'authority', e.target.value)} className={inputClasses} />
                                </div>
                                <div>
                                    <label htmlFor={`dateOfIssue-${index}`} className={labelClasses}>Date of Issue</label>
                                    <input id={`dateOfIssue-${index}`} type="date" value={passport.dateOfIssue} onChange={(e) => handleDynamicListChange(passports, setPassports, index, 'dateOfIssue', e.target.value)} className={`${inputClasses} w-full`} />
                                </div>
                                <div>
                                    <label htmlFor={`dateOfExpiry-${index}`} className={labelClasses}>Date of Expiry</label>
                                    <input id={`dateOfExpiry-${index}`} type="date" value={passport.dateOfExpiry} onChange={(e) => handleDynamicListChange(passports, setPassports, index, 'dateOfExpiry', e.target.value)} className={`${inputClasses} w-full`} />
                                </div>
                                <div>
                                    <label htmlFor={`code-${index}`} className={labelClasses}>Code</label>
                                    <input id={`code-${index}`} placeholder="e.g., GHA" value={passport.code} onChange={(e) => handleDynamicListChange(passports, setPassports, index, 'code', e.target.value)} className={inputClasses} />
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
                <div className="flex justify-center mt-4">
                    <Button variant="secondary" onClick={() => addDynamicListItem(setPassports, { ...initialPassportData, id: Date.now().toString() })}>Add Passport</Button>
                </div>
                
                {/* --- Contact Section --- */}
                <Card>
                     <h3 className="text-lg font-semibold text-text-primary mb-4 border-b border-border-default pb-2">Contact Details</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="email" className={labelClasses}>Email Address</label>
                            <input id="email" type="email" placeholder="e.g., passenger@email.com" value={contactData.email || ''} onChange={handleFormChange(setContactData, 'email')} className={inputClasses} />
                        </div>
                        <div>
                            <label htmlFor="phone" className={labelClasses}>Phone Number</label>
                            <input id="phone" type="tel" placeholder="e.g., +233..." value={contactData.phone || ''} onChange={handleFormChange(setContactData, 'phone')} className={inputClasses} />
                        </div>
                     </div>
                </Card>
                
                {/* --- Dynamic Sections: Visas, Permits, Tickets --- */}
                {[
                    { title: 'Visa', list: visas, setter: setVisas, fields: ['visaNumber', 'country', 'dateOfIssue', 'dateOfExpiry'], extractor: extractVisaData, initialData: { visaNumber: '', country: '', dateOfIssue: '', dateOfExpiry: '' } },
                    { title: 'Permit', list: permits, setter: setPermits, fields: ['permitNumber', 'type', 'dateOfIssue', 'dateOfExpiry'], extractor: extractPermitData, initialData: { permitNumber: '', type: '', dateOfIssue: '', dateOfExpiry: '' } },
                    { title: 'Ticket', list: tickets, setter: setTickets, fields: ['ticketNumber', 'airline', 'departureCity', 'arrivalCity', 'travelDate', 'travelTime'], extractor: extractTicketData, initialData: { ticketNumber: '', airline: '', departureCity: '', arrivalCity: '', travelDate: '', travelTime: '' } },
                ].map(({ title, list, setter, fields, extractor, initialData }) => (
                    <Card key={title}>
                        <div className="flex justify-between items-center mb-4 border-b border-border-default pb-2">
                             <h3 className="text-lg font-semibold text-text-primary">{title}s</h3>
                             <Button variant="secondary" onClick={() => addDynamicListItem(setter, { id: Date.now().toString() })}>Add {title}</Button>
                        </div>
                        {list.map((item, index) => (
                            <div key={item.id || index} className="p-4 border border-border-default rounded-md mb-4 bg-surface-soft relative">
                                <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
                                    {hasData(item) && (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            className="!px-2 !py-0.5 !text-xs !text-amber-500 hover:!bg-amber-500/10"
                                            onClick={() => setClearConfirmation({
                                                title: `Clear ${title} #${index + 1} Fields`,
                                                onConfirm: () => {
                                                    const newList = [...list];
                                                    const existingItem = list[index] as any;
                                                    newList[index] = {
                                                        ...initialData,
                                                        id: existingItem.id,
                                                        document: existingItem.document,
                                                    };
                                                    setter(newList);
                                                    setClearConfirmation(null);
                                                }
                                            })}
                                        >
                                            Clear
                                        </Button>
                                    )}
                                    <Button variant="danger" onClick={() => removeDynamicListItem(setter, index)} className="!px-2 !py-0.5 !text-xs">Remove</Button>
                                </div>
                                <FileUploader
                                    label={`Upload ${title}`}
                                    currentFileUrl={(item as any).document?.dataUrl}
                                    onFileUpload={async (payload) => {
                                        const ocrKey = `${title.toLowerCase()}-${index}`;
                                        try {
                                            setOcrState(prev => ({ ...prev, [ocrKey]: true }));
                                            
                                            // Start storage processing in parallel with OCR
                                            const storagePromise = processFileForStorage(payload.file);
                                            
                                            // Compress image for OCR to speed up processing
                                            const compressedForOcr = await smartCompressImage(payload.dataUrl);
                                            const base64Image = compressedForOcr.split(',')[1];
                                            
                                            const extractedDataPromise = extractor(base64Image, payload.file.type);
                                            
                                            const [document, extractedData] = await Promise.all([
                                                storagePromise,
                                                extractedDataPromise
                                            ]);

                                            const newList = [...list];
                                            newList[index] = { ...newList[index], ...extractedData, document };
                                            setter(newList);
                                        } catch (err) {
                                            const document: UploadedFile = {
                                                fileName: payload.file.name,
                                                mimeType: payload.file.type,
                                                size: payload.file.size,
                                                dataUrl: payload.dataUrl,
                                            };
                                            const newList = [...list];
                                            newList[index] = { ...newList[index], document };
                                            setter(newList);
                                            alert(`Upload or OCR failed: ${err instanceof Error ? err.message : 'Unknown error'}. Please fill fields manually.`);
                                        } finally {
                                            setOcrState(prev => ({ ...prev, [ocrKey]: false }));
                                        }
                                    }}
                                />
                                <div className="relative">
                                    {ocrState[`${title.toLowerCase()}-${index}`] && <OcrLoadingOverlay />}
                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2">
                                            <OcrSourceBadge source={item.ocrSource} />
                                        </div>
                                        {fields.map(field => {
                                            const labelText = `${field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}${field.includes('Number') && title !== 'Ticket' ? ' *' : ''}`;
                                            const isTime = field === 'travelTime';
                                            const isDate = field.toLowerCase().includes('date');
                                            const placeholderText = field === 'ticketNumber' ? 'Ticket Number (Optional)' : `Enter ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`;
                                            
                                            return (
                                                <div key={field} className={isTime ? 'sm:col-start-2' : ''}>
                                                    <label htmlFor={`${title}-${index}-${field}`} className={labelClasses}>{labelText}</label>
                                                    <input
                                                        id={`${title}-${index}-${field}`}
                                                        type={isTime ? 'time' : isDate ? 'date' : 'text'}
                                                        placeholder={placeholderText}
                                                        value={(item as any)[field] || ''}
                                                        onChange={(e) => handleDynamicListChange(list, setter as any, index, field, e.target.value)}
                                                        className={inputClasses}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </Card>
                ))}

                {/* --- Other Documents --- */}
                <Card>
                    <div className="flex justify-between items-center mb-4 border-b border-border-default pb-2">
                        <h3 className="text-lg font-semibold text-text-primary">Other Relevant Documents</h3>
                        <Button variant="secondary" onClick={() => setOtherDocuments(prev => [...prev, { fileName: '', mimeType: '', size: 0, dataUrl: '' }])}>Add Document</Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {otherDocuments.map((doc, index) => (
                            <div key={index} className="p-4 border border-border-default rounded-md bg-surface-soft relative">
                                <div className="absolute top-2 right-2 z-10">
                                    <Button variant="danger" onClick={() => setOtherDocuments(prev => prev.filter((_, i) => i !== index))} className="!px-2 !py-0.5 !text-xs">Remove</Button>
                                </div>
                                <FileUploader
                                    label={`Document #${index + 1}`}
                                    currentFileUrl={doc.dataUrl}
                                    onFileUpload={async (payload) => {
                                        try {
                                            const document = await processFileForStorage(payload.file);
                                            const newList = [...otherDocuments];
                                            newList[index] = document;
                                            setOtherDocuments(newList);
                                        } catch (err) {
                                            const newList = [...otherDocuments];
                                            newList[index] = {
                                                fileName: payload.file.name,
                                                mimeType: payload.file.type,
                                                size: payload.file.size,
                                                dataUrl: payload.dataUrl,
                                            };
                                            setOtherDocuments(newList);
                                            alert(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}.`);
                                        }
                                    }}
                                />
                                {doc.fileName && (
                                    <p className="mt-2 text-xs text-text-secondary truncate">{doc.fileName}</p>
                                )}
                            </div>
                        ))}
                        {otherDocuments.length === 0 && (
                            <div className="sm:col-span-2 py-8 text-center border-2 border-dashed border-border-default rounded-lg">
                                <p className="text-text-secondary">No other documents uploaded.</p>
                            </div>
                        )}
                    </div>
                </Card>
                
                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isSubmitting} className="min-w-[150px] text-lg">
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>

            <ConfirmationModal
                isOpen={!!clearConfirmation}
                onClose={() => setClearConfirmation(null)}
                onConfirm={clearConfirmation?.onConfirm || (() => {})}
                title={clearConfirmation?.title || 'Confirm Action'}
                confirmText="Clear Fields"
                isConfirming={false}
                confirmVariant="primary"
            >
                <p>Are you sure you want to clear all the details in this section?</p>
                <p className="mt-2 text-sm">The uploaded document scan will not be removed.</p>
            </ConfirmationModal>

            {profilePhotoUrl && (
                <ProfilePhotoViewerModal
                    isOpen={isProfilePhotoViewerOpen}
                    onClose={() => setIsProfilePhotoViewerOpen(false)}
                    imageUrl={profilePhotoUrl}
                    onSave={(newDataUrl) => setProfilePhotoUrl(newDataUrl)}
                    title="Profile Photo Preview"
                />
            )}
            
            <ProfilePhotoUpdateModal
                isOpen={isPhotoUpdateModalOpen}
                onClose={() => setIsPhotoUpdateModalOpen(false)}
                onSave={(newUrl) => {
                    setProfilePhotoUrl(newUrl);
                    return Promise.resolve();
                }}
                currentPhotoUrl={profilePhotoUrl}
            />
        </div>
    );
};

export default EditPassengerScreen;
