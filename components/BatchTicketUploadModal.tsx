import React, { useState, useEffect } from 'react';
import { Passenger, TicketData, UploadedFile } from '../types';
import { extractBatchFlightData, extractFlightDataFromText, extractFlightDataFromTextAI, MatchedFlightData } from '../services/geminiService';
import { extractFlightDataWithOCR, extractFlightDataFromTextRegex } from '../services/ocrService';
import { updatePassenger, addTicketIssue } from '../services/firebase';
import { uploadToDrive } from '../services/driveService';
import { BatchFileUploader } from './BatchFileUploader';
import { XMarkIcon, CheckCircleIcon, XCircleIcon, ClipboardDocumentIcon, DocumentTextIcon, CloudArrowUpIcon, PencilIcon, ExclamationTriangleIcon } from './icons';

// Add pdfjsLib to window scope
declare const pdfjsLib: any;
const MAX_FILE_SIZE_MB = 0.5; 
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

async function compressImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Could not get canvas context'));

                const MAX_DIMENSION = 1920;
                let { width, height } = img;
                if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                    if (width > height) {
                        height = Math.round((height * MAX_DIMENSION) / width);
                        width = MAX_DIMENSION;
                    } else {
                        width = Math.round((width * MAX_DIMENSION) / height);
                        height = MAX_DIMENSION;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                let quality = 0.9;
                const attemptCompression = () => {
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                if (blob.size <= MAX_FILE_SIZE_BYTES || quality <= 0.1) {
                                    console.log(`Compressed from ${(file.size / 1024).toFixed(2)} KB to ${(blob.size / 1024).toFixed(2)} KB`);
                                    resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg' }));
                                } else {
                                    quality -= 0.1;
                                    attemptCompression();
                                }
                            } else reject(new Error('Canvas toBlob failed'));
                        }, 'image/jpeg', quality
                    );
                };
                attemptCompression();
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

function dataURLtoFile(dataurl: string, filename: string): File {
    let arr = dataurl.split(','), mimeMatch = arr[0].match(/:(.*?);/), mime = mimeMatch ? mimeMatch[1] : 'image/jpeg',
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

interface BatchTicketUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    allPassengers: Passenger[];
    onSuccess: () => void;
}

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[150] p-4">
            <div className="bg-surface rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-border-default p-4 shrink-0">
                    <h3 className="text-xl font-bold text-text-primary">{title}</h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-danger p-2 rounded-full transition-colors">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

// Helper to convert PDF to Image (first page only for now, or we could try to extract text)
// For this implementation, we'll convert 1st page to image for Gemini to analyze
async function convertPdfToImage(file: File): Promise<string> {
    if (typeof pdfjsLib === 'undefined' || !pdfjsLib.getDocument) {
        throw new Error("PDF processing engine is not fully loaded yet. Please try again in a moment.");
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1); 
    const viewport = page.getViewport({ scale: 1.5 });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.9);
}

// Helper to extract text directly from all pages of a PDF (much faster and more accurate for Local OCR)
async function extractTextFromPdf(file: File): Promise<string> {
    if (typeof pdfjsLib === 'undefined' || !pdfjsLib.getDocument) {
        throw new Error("PDF processing engine is not fully loaded yet. Please try again in a moment.");
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
    }
    return fullText;
}

// Helper to read file as DataURL
const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

interface ExtendedMatchedFlightData extends MatchedFlightData {
    sourceFile?: {
        name: string;
        type: string;
        size: number;
        data: string; // Base64
    };
    action: 'save' | 'issue' | 'ignore';
}

export const BatchTicketUploadModal: React.FC<BatchTicketUploadModalProps> = ({ isOpen, onClose, allPassengers, onSuccess }) => {
    const [step, setStep] = useState<'upload' | 'processing' | 'review' | 'saving'>('upload');
    const [inputType, setInputType] = useState<'file' | 'text'>('file');
    const [extractionMethod, setExtractionMethod] = useState<'smart' | 'ai-vision' | 'regex'>('smart');
    const [pastedText, setPastedText] = useState('');
    const [extractedData, setExtractedData] = useState<ExtendedMatchedFlightData[]>([]);
    const [processingError, setProcessingError] = useState<string | null>(null);
    const [progress, setProgress] = useState<{current: number, total: number} | null>(null);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setStep('upload');
            setInputType('file');
            setPastedText('');
            setExtractedData([]);
            setProcessingError(null);
            setProgress(null);
        }
    }, [isOpen]);

    const getRoster = () => allPassengers.map(p => ({
        id: p.id,
        name: (p.passports || []).length > 0 ? `${p.passports[0].firstNames || ''} ${p.passports[0].surname || ''}`.trim() : 'No Passport'
    }));

    const handleFilesUpload = async (files: File[]) => {
        setStep('processing');
        setProcessingError(null);
        setProgress({ current: 0, total: files.length });

        const allResults: ExtendedMatchedFlightData[] = [];

        try {
            for (let i = 0; i < files.length; i++) {
                setProgress({ current: i + 1, total: files.length });
                
                // Yield to UI
                await new Promise(resolve => setTimeout(resolve, 50));

                const file = files[i];
                let base64Data = '';
                let mimeType = file.type;
                let results: MatchedFlightData[] = [];
                let finalProcessedFile: File | null = null;

                try {
                    if (file.type === 'application/pdf') {
                        if (extractionMethod === 'regex') {
                            try {
                                const extractedText = await extractTextFromPdf(file);
                                results = await extractFlightDataFromTextRegex(extractedText, getRoster());
                                results = results.map(r => ({ ...r, ticketData: { ...r.ticketData, ocrSource: 'PDF Text Extraction' } }));
                                // Still convert to image for storage consistency and size control
                                base64Data = await convertPdfToImage(file);
                                finalProcessedFile = dataURLtoFile(base64Data, file.name.replace(/\.pdf$/i, ".jpg"));
                                mimeType = 'image/jpeg';
                            } catch (e) {
                                console.error("PDF text extraction failed", e);
                                throw new Error("Failed to extract text from PDF. Please try Smart OCR.");
                            }
                        } else if (extractionMethod === 'smart') {
                            try {
                                const extractedText = await extractTextFromPdf(file);
                                if (extractedText && extractedText.trim().length > 100) {
                                    results = await extractFlightDataFromTextAI(extractedText, getRoster());
                                    results = results.map(r => ({ ...r, ticketData: { ...r.ticketData, ocrSource: 'Smart (OCR.space Text)' } }));
                                    base64Data = await convertPdfToImage(file);
                                    finalProcessedFile = dataURLtoFile(base64Data, file.name.replace(/\.pdf$/i, ".jpg"));
                                    mimeType = 'image/jpeg';
                                } else {
                                    base64Data = await convertPdfToImage(file);
                                    const imageFile = dataURLtoFile(base64Data, file.name.replace(/\.pdf$/i, ".jpg"));
                                    finalProcessedFile = imageFile.size > MAX_FILE_SIZE_BYTES ? await compressImage(imageFile) : imageFile;
                                    mimeType = 'image/jpeg';
                                    base64Data = await readFileAsDataURL(finalProcessedFile);
                                    results = await extractBatchFlightData(base64Data.split(',')[1], mimeType, getRoster());
                                }
                            } catch (e) {
                                console.error("Smart PDF extraction failed, trying vision fallback", e);
                                base64Data = await convertPdfToImage(file);
                                const imageFile = dataURLtoFile(base64Data, file.name.replace(/\.pdf$/i, ".jpg"));
                                finalProcessedFile = imageFile.size > MAX_FILE_SIZE_BYTES ? await compressImage(imageFile) : imageFile;
                                mimeType = 'image/jpeg';
                                base64Data = await readFileAsDataURL(finalProcessedFile);
                                results = await extractBatchFlightData(base64Data.split(',')[1], mimeType, getRoster());
                            }
                        } else {
                            try {
                                base64Data = await convertPdfToImage(file);
                                mimeType = 'image/jpeg';
                                const imageFile = dataURLtoFile(base64Data, file.name.replace(/\.pdf$/i, ".jpg"));
                                finalProcessedFile = imageFile.size > MAX_FILE_SIZE_BYTES ? await compressImage(imageFile) : imageFile;
                                base64Data = await readFileAsDataURL(finalProcessedFile);
                            } catch (e) {
                                console.error("PDF Conversion failed, trying raw", e);
                                base64Data = await readFileAsDataURL(file);
                                finalProcessedFile = file;
                            }
                            results = await extractBatchFlightData(base64Data.split(',')[1], mimeType, getRoster());
                        }
                    } else {
                        // Image file
                        mimeType = 'image/jpeg';
                        let imageFile = file;
                        if (file.size > MAX_FILE_SIZE_BYTES || file.type !== 'image/jpeg') {
                            imageFile = await compressImage(file);
                        }
                        finalProcessedFile = imageFile;
                        base64Data = await readFileAsDataURL(finalProcessedFile);
                        
                        if (extractionMethod === 'smart' || extractionMethod === 'ai-vision') {
                            results = await extractBatchFlightData(base64Data.split(',')[1], mimeType, getRoster());
                        } else {
                            results = await extractFlightDataWithOCR(base64Data.split(',')[1], mimeType, getRoster());
                            results = results.map(r => ({ ...r, ticketData: { ...r.ticketData, ocrSource: r.ticketData.ocrSource || 'OCR.space' } }));
                        }
                    }
                    
                    // Attach source file info to each result
                    const resultsWithSource = results.map(r => ({
                        ...r,
                        sourceFile: {
                            name: finalProcessedFile?.name || file.name,
                            type: finalProcessedFile?.type || mimeType,
                            size: finalProcessedFile?.size || 0,
                            data: base64Data 
                        },
                        action: (r.matchedPassengerId ? 'save' : 'issue') as 'save' | 'issue' | 'ignore'
                    }));

                    allResults.push(...resultsWithSource);
                } catch (fileError: any) {
                    console.error(`Failed to process file ${file.name}:`, fileError);
                    // Add a placeholder result with error
                    allResults.push({
                        passengerName: `ERROR: ${file.name}`,
                        matchedPassengerId: '',
                        confidence: 0,
                        action: 'ignore',
                        sourceFile: {
                            name: file.name,
                            type: file.type,
                            size: file.size,
                            data: await readFileAsDataURL(file)
                        },
                        ticketData: {
                            ticketNumber: 'ERROR',
                            airline: fileError.message || 'Processing failed',
                            departureCity: '',
                            arrivalCity: '',
                            travelDate: '',
                            ocrSource: 'Failed'
                        }
                    });
                }
            }
            
            setExtractedData(allResults);
            setStep('review');
        } catch (error: any) {
            console.error(error);
            setProcessingError(error.message || "Failed to process documents.");
            setStep('upload');
        }
    };

    const handleTextProcessing = async () => {
        if (!pastedText.trim()) return;
        setStep('processing');
        setProcessingError(null);

        try {
            let results: MatchedFlightData[] = [];
            if (extractionMethod === 'smart' || extractionMethod === 'ai-vision') {
                results = await extractFlightDataFromText(pastedText, getRoster());
            } else {
                results = await extractFlightDataFromTextRegex(pastedText, getRoster());
            }
            const resultsWithAction = results.map(r => ({
                ...r,
                action: (r.matchedPassengerId ? 'save' : 'issue') as 'save' | 'issue' | 'ignore',
                ticketData: { ...r.ticketData, ocrSource: r.ticketData.ocrSource || 'Pasted Text' }
            }));
            setExtractedData(resultsWithAction);
            setStep('review');
        } catch (error: any) {
             console.error(error);
             setProcessingError(error.message || "Failed to process text.");
             setStep('upload');
        }
    };

    const handleMatchChange = (index: number, newId: string) => {
        const newData = [...extractedData];
        newData[index].matchedPassengerId = newId;
        newData[index].action = newId ? 'save' : 'issue';
        setExtractedData(newData);
    };

    const handleActionChange = (index: number, action: 'save' | 'issue' | 'ignore') => {
        const newData = [...extractedData];
        newData[index].action = action;
        setExtractedData(newData);
    };
    
    const handleTicketDetailChange = (index: number, field: keyof TicketData, value: string) => {
        const newData = [...extractedData];
        newData[index].ticketData = {
            ...newData[index].ticketData,
            [field]: value
        };
        setExtractedData(newData);
    };

    const handleCommit = async () => {
        setStep('saving');
        try {
            const toSave = extractedData.filter(item => item.action === 'save' && item.matchedPassengerId);
            const toIssue = extractedData.filter(item => item.action === 'issue');
            
            // 1. Save Matched Tickets
            const passengerUpdates: { [key: string]: TicketData[] } = {};

            for (const item of toSave) {
                if (!item.matchedPassengerId) continue;
                
                const pid = item.matchedPassengerId;
                if (!passengerUpdates[pid]) {
                    const p = allPassengers.find(p => p.id === pid);
                    passengerUpdates[pid] = p && p.tickets ? [...p.tickets] : [];
                }

                let driveInfo: { driveUrl?: string, driveId?: string } = {};
                if (item.sourceFile) {
                    try {
                        const driveRes = await uploadToDrive({
                            name: item.sourceFile.name,
                            type: item.sourceFile.type,
                            base64: item.sourceFile.data
                        });
                        if (driveRes.status === 'success') {
                            driveInfo = { driveUrl: driveRes.fileUrl, driveId: driveRes.fileId };
                        }
                    } catch (err) {
                        console.error("Drive upload failed for batch item", err);
                    }
                }

                const newTicket: TicketData = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    ticketNumber: item.ticketData.ticketNumber || '',
                    airline: item.ticketData.airline || '',
                    departureCity: item.ticketData.departureCity || '',
                    arrivalCity: item.ticketData.arrivalCity || '',
                    travelDate: item.ticketData.travelDate || '',
                    travelTime: item.ticketData.travelTime || '',
                    ocrSource: item.ticketData.ocrSource || '',
                    status: 'Issued',
                    // Store document if available
                    document: item.sourceFile ? {
                        fileName: item.sourceFile.name,
                        mimeType: item.sourceFile.type,
                        size: item.sourceFile.size,
                        dataUrl: item.sourceFile.data,
                        ...driveInfo
                    } : undefined
                };
                passengerUpdates[pid].push(newTicket);
            }

            const savePromises = Object.entries(passengerUpdates).map(([pid, tickets]) => 
                updatePassenger(pid, { tickets })
            );

            // 2. Create Issues
            const issuePromises = toIssue.map(async (item) => {
                let driveInfo: { driveUrl?: string, driveId?: string } = {};
                if (item.sourceFile) {
                    try {
                        const driveRes = await uploadToDrive({
                            name: item.sourceFile.name,
                            type: item.sourceFile.type,
                            base64: item.sourceFile.data
                        });
                        if (driveRes.status === 'success') {
                            driveInfo = { driveUrl: driveRes.fileUrl, driveId: driveRes.fileId };
                        }
                    } catch (err) {
                        console.error("Drive upload failed for issue item", err);
                    }
                }

                return addTicketIssue({
                    fileName: item.sourceFile?.name || 'Unknown',
                    fileType: item.sourceFile?.type || 'unknown',
                    document: item.sourceFile ? {
                        fileName: item.sourceFile.name,
                        mimeType: item.sourceFile.type,
                        size: item.sourceFile.size,
                        dataUrl: item.sourceFile.data,
                        ...driveInfo
                    } : undefined,
                    extractedData: item.ticketData,
                    suggestedPassengerName: item.passengerName,
                });
            });

            await Promise.all([...savePromises, ...issuePromises]);
            
            onSuccess();
            onClose();

        } catch (error) {
            console.error("Save failed", error);
            setProcessingError("Failed to save data to database.");
            setStep('review');
        }
    };

    const renderInputTypeSelector = () => (
        <div className="flex gap-4 mb-6 justify-center">
            <button
                onClick={() => setInputType('file')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 font-semibold transition-all ${inputType === 'file' ? 'border-primary bg-primary/10 text-primary' : 'border-border-default hover:border-primary/50 text-text-secondary'}`}
            >
                <CloudArrowUpIcon className="h-5 w-5" />
                Upload Files
            </button>
            <button
                onClick={() => setInputType('text')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 font-semibold transition-all ${inputType === 'text' ? 'border-primary bg-primary/10 text-primary' : 'border-border-default hover:border-primary/50 text-text-secondary'}`}
            >
                <ClipboardDocumentIcon className="h-5 w-5" />
                Paste Text
            </button>
        </div>
    );

    const renderUploadStep = () => (
        <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="text-center max-w-lg mb-4">
                <h4 className="text-lg font-semibold text-text-primary mb-2">Add Tickets via AI</h4>
                <p className="text-text-secondary">
                    Upload multiple ticket files (PDF/Images) or paste text. The AI will extract details and match them to personnel.
                </p>
            </div>
            
            <div className="flex justify-center mb-2">
                <div className="bg-surface-soft p-1 rounded-lg inline-flex">
                    <button
                        onClick={() => setExtractionMethod('smart')}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${extractionMethod === 'smart' ? 'bg-primary text-white shadow' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                        ⚡ Smart (OCR.Space + AI)
                    </button>
                    <button
                        onClick={() => setExtractionMethod('ai-vision')}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${extractionMethod === 'ai-vision' ? 'bg-primary text-white shadow' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                        👁️ AI Vision
                    </button>
                    <button
                        onClick={() => setExtractionMethod('regex')}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${extractionMethod === 'regex' ? 'bg-primary text-white shadow' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                        🔍 Legacy OCR
                    </button>
                </div>
            </div>

            {renderInputTypeSelector()}

            <div className="w-full max-w-xl transition-all duration-300">
                {inputType === 'file' ? (
                     <BatchFileUploader 
                        onUpload={handleFilesUpload}
                        isProcessing={false}
                    />
                ) : (
                    <div className="flex flex-col gap-4">
                        <textarea 
                            value={pastedText}
                            onChange={(e) => setPastedText(e.target.value)}
                            placeholder="Paste ticket details here (e.g., from email, GDS, Excel)..."
                            className="w-full h-48 p-4 rounded-lg bg-input border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        />
                        <button
                            onClick={handleTextProcessing}
                            disabled={!pastedText.trim()}
                            className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <DocumentTextIcon className="h-5 w-5" />
                            Process Text
                        </button>
                    </div>
                )}
            </div>

            {processingError && (
                <div className="text-danger bg-danger/10 p-3 rounded-md mt-4 text-center max-w-md">
                    {processingError}
                </div>
            )}
        </div>
    );

    const renderProcessingStep = () => (
        <div className="flex flex-col items-center justify-center h-full space-y-6">
             <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
             <div className="text-center">
                 <h4 className="text-lg font-bold text-text-primary">Processing Data...</h4>
                 <p className="text-text-secondary mt-2">Extracting flights and matching personnel...</p>
                 {progress && (
                     <p className="text-sm font-mono mt-2 text-primary">
                         Processing file {progress.current} of {progress.total}
                     </p>
                 )}
             </div>
        </div>
    );

    const renderReviewStep = () => (
        <div className="space-y-6 h-full flex flex-col">
             <div className="flex justify-between items-center bg-surface-soft p-4 rounded-lg border border-border-default shrink-0">
                 <div>
                     <h4 className="font-bold text-text-primary">Review Matches</h4>
                     <p className="text-sm text-text-secondary">
                         Found {extractedData.length} flights.
                     </p>
                 </div>
                 <div className="flex gap-2">
                    <button
                        onClick={() => { setStep('upload'); setPastedText(''); }}
                        className="px-4 py-2 bg-surface text-text-primary border border-border-default font-semibold rounded-md hover:bg-border-default transition-colors"
                    >
                        Start Over
                    </button>
                    <button 
                        onClick={handleCommit}
                        disabled={extractedData.filter(d => d.action !== 'ignore').length === 0}
                        className="px-6 py-2 bg-primary text-white font-bold rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Process {extractedData.filter(d => d.action !== 'ignore').length} Items
                    </button>
                 </div>
             </div>

             <div className="flex-1 overflow-auto border border-border-default rounded-lg">
                 <table className="min-w-full divide-y divide-border-default">
                     <thead className="bg-surface-soft sticky top-0 z-10">
                         <tr>
                             <th className="px-4 py-3 text-left text-xs font-bold text-text-secondary uppercase w-[30%]">Ticket Info (Editable)</th>
                             <th className="px-4 py-3 text-left text-xs font-bold text-text-secondary uppercase w-[20%]">Extracted Name</th>
                             <th className="px-4 py-3 text-left text-xs font-bold text-text-secondary uppercase w-[25%]">Matched Personnel</th>
                             <th className="px-4 py-3 text-center text-xs font-bold text-text-secondary uppercase w-[25%]">Action</th>
                         </tr>
                     </thead>
                     <tbody className="bg-surface divide-y divide-border-default">
                         {extractedData.map((item, idx) => (
                             <tr key={idx} className={`hover:bg-surface-soft/50 transition-colors ${item.action === 'ignore' ? 'opacity-50 bg-gray-50' : ''}`}>
                                 <td className="px-4 py-3 text-sm space-y-1">
                                     <div className="flex gap-1 items-center">
                                         <input 
                                            value={item.ticketData.travelDate || ''}
                                            onChange={(e) => handleTicketDetailChange(idx, 'travelDate', e.target.value)}
                                            className="bg-transparent border border-border-default rounded px-1 w-24 text-xs font-mono focus:border-primary focus:outline-none"
                                            type="date"
                                         />
                                          <input 
                                            value={item.ticketData.travelTime || ''}
                                            onChange={(e) => handleTicketDetailChange(idx, 'travelTime', e.target.value)}
                                            className="bg-transparent border border-border-default rounded px-1 w-20 text-xs font-mono focus:border-primary focus:outline-none"
                                            type="time"
                                         />
                                     </div>
                                     <div className="flex gap-1">
                                         <input 
                                            value={item.ticketData.departureCity || ''}
                                            onChange={(e) => handleTicketDetailChange(idx, 'departureCity', e.target.value)}
                                            className="bg-transparent border-b border-border-default w-20 text-xs font-bold focus:border-primary focus:outline-none"
                                            placeholder="From"
                                         />
                                         <span>&rarr;</span>
                                         <input 
                                            value={item.ticketData.arrivalCity || ''}
                                            onChange={(e) => handleTicketDetailChange(idx, 'arrivalCity', e.target.value)}
                                            className="bg-transparent border-b border-border-default w-20 text-xs font-bold focus:border-primary focus:outline-none"
                                            placeholder="To"
                                         />
                                     </div>
                                     <div className="text-xs text-text-secondary truncate max-w-[200px]" title={item.sourceFile?.name}>
                                         File: {item.sourceFile?.name || 'Text Input'}
                                     </div>
                                     {item.ticketData.ocrSource && (
                                         <div className="text-[10px] bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded inline-block mt-1 font-bold border border-indigo-500/20">
                                            Source: {item.ticketData.ocrSource}
                                         </div>
                                     )}
                                 </td>
                                 <td className="px-4 py-3 text-sm font-medium text-text-primary">
                                     {item.passengerName}
                                 </td>
                                 <td className="px-4 py-3 text-sm">
                                     <select 
                                        className={`w-full p-2 rounded border text-sm focus:ring-1 focus:ring-primary outline-none ${!item.matchedPassengerId ? 'border-warning bg-warning/5' : 'border-border-default bg-background'}`}
                                        value={item.matchedPassengerId || ''}
                                        onChange={(e) => handleMatchChange(idx, e.target.value)}
                                     >
                                         <option value="">-- No Match --</option>
                                         {allPassengers.map(p => (
                                             <option key={p.id} value={p.id}>
                                                 {(p.passports || []).length > 0 ? `${p.passports[0].surname}, ${p.passports[0].firstNames}` : 'No Passport'} ({p.companyId})
                                             </option>
                                         ))}
                                     </select>
                                 </td>
                                 <td className="px-4 py-3 text-center">
                                     <div className="flex justify-center gap-2">
                                         <button 
                                            onClick={() => handleActionChange(idx, 'save')}
                                            disabled={!item.matchedPassengerId}
                                            className={`p-2 rounded-full transition-colors ${item.action === 'save' ? 'bg-success text-white shadow-md' : 'text-text-secondary hover:bg-success/10'}`}
                                            title="Save to Personnel"
                                         >
                                             <CheckCircleIcon className="h-5 w-5" />
                                         </button>
                                         <button 
                                            onClick={() => handleActionChange(idx, 'issue')}
                                            className={`p-2 rounded-full transition-colors ${item.action === 'issue' ? 'bg-warning text-white shadow-md' : 'text-text-secondary hover:bg-warning/10'}`}
                                            title="Add to Issues Panel"
                                         >
                                             <ExclamationTriangleIcon className="h-5 w-5" />
                                         </button>
                                         <button 
                                            onClick={() => handleActionChange(idx, 'ignore')}
                                            className={`p-2 rounded-full transition-colors ${item.action === 'ignore' ? 'bg-danger text-white shadow-md' : 'text-text-secondary hover:bg-danger/10'}`}
                                            title="Ignore / Skip"
                                         >
                                             <XCircleIcon className="h-5 w-5" />
                                         </button>
                                     </div>
                                     <div className="mt-1 text-[10px] font-bold uppercase text-text-secondary">
                                         {item.action === 'save' ? 'Save' : item.action === 'issue' ? 'To Issues' : 'Skip'}
                                     </div>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
                 {extractedData.length === 0 && (
                     <div className="p-8 text-center text-text-secondary">No flights extracted. Try different input.</div>
                 )}
             </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Batch Ticket Import">
            {step === 'upload' && renderUploadStep()}
            {step === 'processing' && renderProcessingStep()}
            {step === 'review' && renderReviewStep()}
            {step === 'saving' && (
                 <div className="flex flex-col items-center justify-center h-full space-y-6">
                    <div className="w-12 h-12 border-4 border-success border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-lg font-bold text-text-primary">Saving Data...</p>
               </div>
            )}
        </Modal>
    );
};
