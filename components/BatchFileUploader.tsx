import React, { useRef, useState } from 'react';
import { CloudArrowUpIcon, DocumentTextIcon } from './icons';

interface BatchFileUploaderProps {
    onUpload: (files: File[]) => void;
    isProcessing: boolean;
}

export const BatchFileUploader: React.FC<BatchFileUploaderProps> = ({ onUpload, isProcessing }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            onUpload(Array.from(event.target.files));
        }
        if (event.target) event.target.value = '';
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDraggingOver(false);
        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            onUpload(Array.from(event.dataTransfer.files));
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDraggingOver(true);
    };

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDraggingOver(false);
    };

    return (
        <div 
            className={`w-full p-8 border-2 border-dashed rounded-xl transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer ${isDraggingOver ? 'border-primary bg-primary/5' : 'border-border-default hover:border-primary/50 hover:bg-surface-soft'}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
        >
            <input 
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,application/pdf"
                className="hidden"
                onChange={handleFileChange}
                disabled={isProcessing}
            />
            
            <div className="bg-primary/10 p-4 rounded-full mb-4">
                <CloudArrowUpIcon className="h-8 w-8 text-primary" />
            </div>
            
            <h3 className="text-lg font-bold text-text-primary mb-2">
                {isProcessing ? 'Processing Files...' : 'Click or Drag files to upload'}
            </h3>
            
            <p className="text-text-secondary text-sm max-w-md">
                Support for PDF, JPG, PNG. You can select multiple files at once.
                We'll automatically extract ticket details and match them to personnel.
            </p>

            <div className="mt-6 flex gap-2 text-xs text-text-secondary">
                <span className="bg-surface-soft px-2 py-1 rounded border border-border-default">.PDF</span>
                <span className="bg-surface-soft px-2 py-1 rounded border border-border-default">.JPG</span>
                <span className="bg-surface-soft px-2 py-1 rounded border border-border-default">.PNG</span>
            </div>
        </div>
    );
};
