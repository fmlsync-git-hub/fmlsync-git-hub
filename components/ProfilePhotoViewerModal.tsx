
import React, { useState, useEffect } from 'react';
import { ShareToolbar } from './ShareToolbar';
import { ImageEditorModal } from './ImageEditorModal';
import { XMarkIcon, PencilIcon } from './icons';
import { compressDataUrl } from '../utils/imageUtils';

interface ProfilePhotoViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    onSave?: (newDataUrl: string) => Promise<void> | void;
    readOnly?: boolean;
    title?: string;
}

export const ProfilePhotoViewerModal: React.FC<ProfilePhotoViewerModalProps> = ({ 
    isOpen, 
    onClose, 
    imageUrl, 
    onSave, 
    readOnly = false,
    title = "Profile Photo"
}) => {
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setCurrentImageUrl(imageUrl);
    }, [imageUrl]);

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

    const handleSaveEdit = async (newDataUrl: string) => {
        if (onSave) {
            setIsSaving(true);
            try {
                // Compress the edited image
                const compressedUrl = await compressDataUrl(newDataUrl, 512, 512, 0.85);
                await onSave(compressedUrl);
                setCurrentImageUrl(compressedUrl);
                setIsEditorOpen(false);
            } catch (error) {
                console.error("Failed to save profile photo:", error);
                alert("Failed to save changes. Please try again.");
            } finally {
                setIsSaving(false);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[150] p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-surface p-4 rounded-xl shadow-2xl relative max-w-xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-border-default pb-4 mb-4">
                    <h3 className="text-lg font-bold text-text-primary">{title}</h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary p-2 rounded-full hover:bg-surface-soft transition-colors">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex items-center justify-center bg-black/5 rounded-lg border border-border-default min-h-[300px]">
                    <img 
                        src={currentImageUrl} 
                        alt={title} 
                        className="max-w-full max-h-[60vh] object-contain shadow-sm" 
                    />
                </div>

                <div className="mt-4 space-y-4">
                    <ShareToolbar file={{ dataUrl: currentImageUrl, fileName: 'profile_photo.jpg', mimeType: 'image/jpeg' }} />
                    
                    {!readOnly && onSave && (
                        <div className="pt-4 border-t border-border-default flex justify-center">
                            <button 
                                onClick={() => setIsEditorOpen(true)}
                                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-primary text-white rounded-full hover:bg-primary-dark transition-all shadow-md hover:shadow-lg active:scale-95"
                            >
                                <PencilIcon className="h-4 w-4" />
                                Edit Photo
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {isEditorOpen && (
                <ImageEditorModal
                    imageSrc={currentImageUrl}
                    onClose={() => setIsEditorOpen(false)}
                    onSave={handleSaveEdit}
                />
            )}
        </div>
    );
};
