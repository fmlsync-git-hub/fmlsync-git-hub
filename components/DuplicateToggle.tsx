
import React from 'react';
import { ExclamationTriangleIcon } from './icons';
import { User, UserSettings } from '../types';

interface DuplicateToggleProps {
    showDuplicates: boolean;
    onToggle: (show: boolean) => void;
    duplicateCount: number;
    currentUser: User & UserSettings;
}

export const DuplicateToggle: React.FC<DuplicateToggleProps> = ({ showDuplicates, onToggle, duplicateCount, currentUser }) => {
    console.log('DuplicateToggle: duplicateCount', duplicateCount);
    // Hide if no duplicates found
    if (duplicateCount === 0) return null;

    // If currentUser is not provided yet (e.g. during loading), don't show the toggle
    if (!currentUser) return null;

    // Developer can always see the toggle. 
    // Others only see it if it's explicitly enabled (or not explicitly disabled) by a developer.
    const isDeveloper = currentUser.role === 'developer';
    const isEnabled = currentUser.duplicateToggleEnabled !== false;

    if (!isDeveloper && !isEnabled) return null;

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-soft rounded-lg border border-border-default shadow-sm">
            <ExclamationTriangleIcon className={`h-4 w-4 ${showDuplicates ? 'text-text-secondary' : 'text-warning'}`} />
            <span className="text-xs font-medium text-text-secondary">
                {showDuplicates ? 'Showing Duplicates' : 'Hiding Duplicates'}
            </span>
            <button
                onClick={() => onToggle(!showDuplicates)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    showDuplicates ? 'bg-primary' : 'bg-surface-soft border border-border-default'
                }`}
            >
                <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        showDuplicates ? 'translate-x-5' : 'translate-x-1'
                    }`}
                />
            </button>
        </div>
    );
};
