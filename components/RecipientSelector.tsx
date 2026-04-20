import React, { useState } from 'react';
import { Passenger } from '../types';
import { XMarkIcon } from './icons';

interface RecipientSelectorProps {
    allPassengers: Passenger[];
    selectedRecipients: string[];
    onChange: (recipients: string[]) => void;
}

export const RecipientSelector: React.FC<RecipientSelectorProps> = ({
    allPassengers,
    selectedRecipients,
    onChange,
}) => {
    const [customRecipient, setCustomRecipient] = useState('');

    const handleAddCustom = () => {
        const newRecipient = customRecipient.trim();
        if (newRecipient && !selectedRecipients.includes(newRecipient)) {
            onChange([...selectedRecipients, newRecipient]);
        }
        setCustomRecipient('');
    };

    const handleRemove = (recipient: string) => {
        onChange(selectedRecipients.filter(r => r !== recipient));
    };

    const addAllPersonnelContacts = () => {
        const allContacts = new Set(selectedRecipients);
        allPassengers.forEach(p => {
            if (p.contactData?.phone) allContacts.add(p.contactData.phone);
        });
        onChange(Array.from(allContacts));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddCustom();
        }
    };

    return (
        <div className="bg-surface-soft p-4 rounded-md space-y-4 border border-border-default">
            <div>
                <h5 className="font-semibold text-text-primary mb-2">Add Custom Phone Numbers</h5>
                <div className="flex gap-2">
                    <input
                        type="tel"
                        value={customRecipient}
                        onChange={(e) => setCustomRecipient(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Add phone number (e.g. +1...)"
                        className="flex-grow px-3 py-2 border border-border-default bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button type="button" onClick={handleAddCustom} className="px-4 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-dark">Add</button>
                </div>
                <div className="mt-2">
                    <button type="button" onClick={addAllPersonnelContacts} className="text-sm text-primary hover:underline">
                        Add all personnel phone numbers from records
                    </button>
                </div>
            </div>
            {selectedRecipients && selectedRecipients.length > 0 && (
                <div>
                    <h5 className="font-semibold text-text-primary mb-2">Current Custom Recipients ({selectedRecipients.length})</h5>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {selectedRecipients.map(r => (
                            <div key={r} className="flex justify-between items-center bg-surface p-2 rounded-md text-sm">
                                <span className="text-text-primary break-all">{r}</span>
                                <button
                                    type="button"
                                    onClick={() => handleRemove(r)}
                                    className="text-danger hover:text-red-700 ml-2"
                                    title={`Remove ${r}`}
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};