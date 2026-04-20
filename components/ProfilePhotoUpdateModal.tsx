import React, { useState, useRef } from 'react';
import { XMarkIcon, CloudArrowUpIcon, DocumentTextIcon, PhotoIcon, CheckCircleIcon } from './icons';
import { extractProfilePhoto } from '../services/geminiService';
import { compressDataUrl } from '../utils/imageUtils';

// Add pdfjsLib to window scope
declare const pdfjsLib: any;

interface ProfilePhotoUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (photoUrl: string) => Promise<void>;
    currentPhotoUrl?: string;
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

// Helper to convert PDF to Image (first page)
async function convertPdfToImage(file: File): Promise<string> {
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
    return canvas.toDataURL('image/jpeg', 0.8);
}

export const ProfilePhotoUpdateModal: React.FC<ProfilePhotoUpdateModalProps> = ({ isOpen, onClose, onSave, currentPhotoUrl }) => {
    const [activeTab, setActiveTab] = useState<'upload' | 'extract'>('upload');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setError(null);

            if (activeTab === 'upload') {
                // Direct upload preview
                const url = await readFileAsDataURL(file);
                setPreviewUrl(url);
            } else {
                // For extraction, we don't show preview immediately, we show the file name
                // and wait for user to click "Extract"
                setPreviewUrl(null); 
            }
        }
    };

    const handleExtract = async () => {
        if (!selectedFile) return;
        setIsProcessing(true);
        setError(null);

        try {
            let base64Data = '';
            let mimeType = selectedFile.type;

            if (selectedFile.type === 'application/pdf') {
                try {
                    const dataUrl = await convertPdfToImage(selectedFile);
                    base64Data = dataUrl.split(',')[1];
                    mimeType = 'image/jpeg';
                } catch (e) {
                    console.error("PDF conversion failed", e);
                    setError("Failed to process PDF. Please try an image file.");
                    setIsProcessing(false);
                    return;
                }
            } else {
                const dataUrl = await readFileAsDataURL(selectedFile);
                base64Data = dataUrl.split(',')[1];
            }

            const extractedPhotoUrl = await extractProfilePhoto(base64Data, mimeType);
            
            if (extractedPhotoUrl) {
                setPreviewUrl(extractedPhotoUrl);
            } else {
                setError("Could not detect a face in the document.");
            }
        } catch (err) {
            console.error(err);
            setError("Failed to extract photo. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSave = async () => {
        if (!previewUrl) return;
        setIsProcessing(true);
        try {
            // Compress the image before saving to avoid Firestore size limits
            const compressedUrl = await compressDataUrl(previewUrl, 512, 512, 0.85);
            await onSave(compressedUrl);
            onClose();
        } catch (err) {
            console.error(err);
            setError("Failed to save photo.");
        } finally {
            setIsProcessing(false);
        }
    };

    const resetState = () => {
        setSelectedFile(null);
        setPreviewUrl(currentPhotoUrl || null);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[150] p-4">
            <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-border-default p-4">
                    <h3 className="text-lg font-bold text-text-primary">Update Profile Photo</h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-danger p-2 rounded-full transition-colors">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                
                <div className="p-4">
                    {/* Tabs */}
                    <div className="flex gap-2 mb-6 bg-surface-soft p-1 rounded-lg">
                        <button
                            onClick={() => { setActiveTab('upload'); resetState(); }}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'upload' ? 'bg-surface shadow text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                        >
                            Direct Upload
                        </button>
                        <button
                            onClick={() => { setActiveTab('extract'); resetState(); }}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'extract' ? 'bg-surface shadow text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                        >
                            Extract from Doc
                        </button>
                    </div>

                    {/* Content */}
                    <div className="space-y-6">
                        {/* File Input */}
                        <div 
                            className="border-2 border-dashed border-border-default rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-surface-soft transition-colors"
                            onClick={() => !isProcessing && fileInputRef.current?.click()}
                        >
                            <input 
                                ref={fileInputRef}
                                type="file" 
                                accept={activeTab === 'upload' ? "image/*" : "image/*,application/pdf"}
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                            {activeTab === 'upload' ? (
                                <PhotoIcon className="h-10 w-10 text-text-secondary mb-2" />
                            ) : (
                                <DocumentTextIcon className="h-10 w-10 text-text-secondary mb-2" />
                            )}
                            <p className="text-sm font-medium text-text-primary">
                                {selectedFile ? selectedFile.name : (activeTab === 'upload' ? "Click to upload photo" : "Click to upload document")}
                            </p>
                            <p className="text-xs text-text-secondary mt-1">
                                {activeTab === 'upload' ? "JPG, PNG" : "PDF, JPG, PNG"}
                            </p>
                        </div>

                        {/* Extract Button (Only for Extract tab) */}
                        {activeTab === 'extract' && selectedFile && !previewUrl && (
                            <button
                                onClick={handleExtract}
                                disabled={isProcessing}
                                className="w-full py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <>Processing...</>
                                ) : (
                                    <>
                                        <CheckCircleIcon className="h-5 w-5" />
                                        Extract Photo
                                    </>
                                )}
                            </button>
                        )}

                        {/* Preview Area */}
                        {previewUrl && (
                            <div className="text-center">
                                <p className="text-xs font-bold text-text-secondary uppercase mb-2">Preview</p>
                                <div className="relative inline-block">
                                    <img 
                                        src={previewUrl} 
                                        alt="Preview" 
                                        className="w-32 h-32 rounded-full object-cover border-4 border-surface shadow-lg"
                                    />
                                    {activeTab === 'extract' && (
                                        <div className="absolute -bottom-2 -right-2 bg-success text-white text-xs px-2 py-1 rounded-full shadow">
                                            Extracted
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-danger/10 text-danger text-sm rounded-md text-center">
                                {error}
                            </div>
                        )}

                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            disabled={!previewUrl || isProcessing}
                            className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isProcessing ? 'Saving...' : 'Update Profile Photo'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
