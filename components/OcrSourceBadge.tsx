
import React from 'react';
import { InformationCircleIcon } from './icons/index';

interface OcrSourceBadgeProps {
    source?: string;
    className?: string;
}

export const OcrSourceBadge: React.FC<OcrSourceBadgeProps> = ({ source, className = '' }) => {
    if (!source) return null;

    // Check if source contains duration info (e.g. "Gemini (1.2s)")
    const hasDuration = source.includes('(') && source.includes('s)');

    return (
        <div 
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/5 border border-primary/20 text-[10px] font-semibold text-primary transition-all hover:bg-primary/10 ${className}`} 
            title={`Extracted via ${source}`}
        >
            <InformationCircleIcon className="w-3.5 h-3.5" />
            <span className="tracking-wide uppercase">Source: {source}</span>
        </div>
    );
};
