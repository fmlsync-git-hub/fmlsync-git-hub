import React from 'react';
import { ShareIcon, DownloadIcon } from './icons/index';

interface ShareToolbarProps {
  file: {
    dataUrl?: string;
    fileName: string;
    mimeType: string;
  };
}

export const ShareToolbar: React.FC<ShareToolbarProps> = ({ file }) => {
    const isWebShareSupported = typeof navigator.share === 'function';
    const fileDataSource = file.dataUrl;

    if (!fileDataSource) return null;

    const handleNativeShare = async () => {
        try {
            const response = await fetch(fileDataSource);
            const blob = await response.blob();
            const shareFile = new File([blob], file.fileName, { type: file.mimeType });

            if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
                await navigator.share({
                    files: [shareFile],
                    title: `Document: ${file.fileName}`,
                    text: `Sharing document: ${file.fileName}`,
                });
            } else {
                 throw new Error('Sharing this content is not supported via browser.');
            }
        } catch (error) {
            console.error('Error sharing file:', error);
            alert(`Could not share the file. ${error instanceof Error ? error.message : ''}`);
        }
    };

    const buttonClass = "flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-text-primary bg-surface-soft rounded-md hover:bg-border-default transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary";

    return (
        <div className="flex items-center justify-center flex-wrap gap-3 pt-4 mt-4 border-t border-border-default">
            {isWebShareSupported && (
                <button onClick={handleNativeShare} title="Share via..." className={buttonClass}>
                    <ShareIcon className="h-5 w-5" />
                    <span>Share</span>
                </button>
            )}
            
            <a href={fileDataSource} download={file.fileName} title="Download file" className={buttonClass}>
                <DownloadIcon className="h-5 w-5" />
                <span>Download</span>
            </a>
        </div>
    );
};
