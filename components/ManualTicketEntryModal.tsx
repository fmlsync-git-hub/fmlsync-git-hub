import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Passenger, TicketData, TicketStatus } from '../types';
import { updatePassenger } from '../services/firebase';
import { XMarkIcon } from './icons';

interface ManualTicketEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    allPassengers: Passenger[];
    onSuccess: () => void;
}

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; }> = ({ isOpen, onClose, title, children }) => {
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
    
    if (!isOpen) return null;
    
    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[150] p-4" onClick={onClose}>
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-border-default p-4">
                    <h3 className="text-xl font-semibold text-text-primary">{title}</h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-danger p-1 rounded-full transition-colors">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                {children}
            </div>
        </div>,
        document.body
    );
};

const Button: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string; type?: 'button'|'submit'|'reset', disabled?: boolean; variant?: 'primary' | 'secondary' }> = ({ children, onClick, className, type = 'button', disabled = false, variant = 'primary' }) => {
    const baseClasses = `px-4 py-2 rounded-md font-semibold shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2`;
    const variantClasses = {
        primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
        secondary: 'bg-surface-soft text-text-primary hover:bg-border-default focus:ring-primary',
    };
    const disabledClasses = disabled ? 'bg-neutral-600 text-neutral-400 cursor-not-allowed' : '';
    return <button type={type} onClick={onClick} disabled={disabled} className={`${baseClasses} ${variantClasses[variant]} ${disabledClasses} ${className}`}>{children}</button>;
};

const TICKET_STATUSES: TicketStatus[] = ['Issued', 'Reserved', 'Pending confirmation', 'on-hold'];

export const ManualTicketEntryModal: React.FC<ManualTicketEntryModalProps> = ({ isOpen, onClose, allPassengers, onSuccess }) => {
    const [selectedPassengerId, setSelectedPassengerId] = useState<string>('');
    const [ticketData, setTicketData] = useState<Partial<TicketData>>({
        ticketNumber: '',
        airline: '',
        departureCity: '',
        arrivalCity: '',
        travelDate: '',
        travelTime: '',
        status: 'Issued'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSelectedPassengerId('');
            setTicketData({
                ticketNumber: '',
                airline: '',
                departureCity: '',
                arrivalCity: '',
                travelDate: '',
                travelTime: '',
                status: 'Issued'
            });
            setError(null);
        }
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setTicketData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPassengerId) {
            setError("Please select a passenger.");
            return;
        }

        const passenger = allPassengers.find(p => p.id === selectedPassengerId);
        if (!passenger) {
            setError("Passenger not found.");
            return;
        }

        if (!ticketData.ticketNumber || !ticketData.airline || !ticketData.departureCity || !ticketData.arrivalCity || !ticketData.travelDate) {
            setError("Please fill in all required fields.");
            return;
        }

        setIsSaving(true);
        setError(null);

        const newTicket: TicketData = {
            id: crypto.randomUUID(),
            ticketNumber: ticketData.ticketNumber,
            airline: ticketData.airline,
            departureCity: ticketData.departureCity,
            arrivalCity: ticketData.arrivalCity,
            travelDate: ticketData.travelDate,
            travelTime: ticketData.travelTime,
            status: ticketData.status as TicketStatus,
        };

        const updatedTickets = [...(passenger.tickets || []), newTicket];

        try {
            await updatePassenger(passenger.id, { tickets: updatedTickets });
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Error saving manual ticket:", err);
            setError(err.message || "Failed to save ticket.");
        } finally {
            setIsSaving(false);
        }
    };

    const inputClasses = "w-full px-3 py-2 border border-border-default rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";
    const labelClasses = "block text-sm font-medium text-text-secondary mb-1";

    // Sort passengers alphabetically for the dropdown
    const sortedPassengers = [...allPassengers].sort((a, b) => {
        const nameA = `${a.passports && a.passports[0] ? `${a.passports[0].surname} ${a.passports[0].firstNames}` : ''}`.toLowerCase();
        const nameB = `${b.passports && b.passports[0] ? `${b.passports[0].surname} ${b.passports[0].firstNames}` : ''}`.toLowerCase();
        return nameA.localeCompare(nameB);
    });

    return (
        <AnimatePresence>
            {isOpen && (
                <Modal isOpen={isOpen} onClose={onClose} title="Manual Ticket Entry">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-4 space-y-4"
                    >
                        <form onSubmit={handleSave} className="space-y-4">
                            {error && (
                                <div className="bg-danger/10 text-danger p-3 rounded-md text-sm border border-danger/20">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className={labelClasses}>Passenger *</label>
                                <select
                                    value={selectedPassengerId}
                                    onChange={(e) => setSelectedPassengerId(e.target.value)}
                                    className={inputClasses}
                                    required
                                >
                                    <option value="">-- Select Passenger --</option>
                                    {sortedPassengers.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.passports && p.passports[0] ? `${p.passports[0].surname}, ${p.passports[0].firstNames}` : 'No Passport'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClasses}>Ticket Number *</label>
                                    <input
                                        type="text"
                                        name="ticketNumber"
                                        value={ticketData.ticketNumber || ''}
                                        onChange={handleChange}
                                        className={inputClasses}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className={labelClasses}>Airline *</label>
                                    <input
                                        type="text"
                                        name="airline"
                                        value={ticketData.airline || ''}
                                        onChange={handleChange}
                                        className={inputClasses}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClasses}>Departure City *</label>
                                    <input
                                        type="text"
                                        name="departureCity"
                                        value={ticketData.departureCity || ''}
                                        onChange={handleChange}
                                        className={inputClasses}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className={labelClasses}>Arrival City *</label>
                                    <input
                                        type="text"
                                        name="arrivalCity"
                                        value={ticketData.arrivalCity || ''}
                                        onChange={handleChange}
                                        className={inputClasses}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClasses}>Travel Date *</label>
                                    <input
                                        type="date"
                                        name="travelDate"
                                        value={ticketData.travelDate || ''}
                                        onChange={handleChange}
                                        className={inputClasses}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className={labelClasses}>Travel Time</label>
                                    <input
                                        type="time"
                                        name="travelTime"
                                        value={ticketData.travelTime || ''}
                                        onChange={handleChange}
                                        className={inputClasses}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={labelClasses}>Status</label>
                                <select
                                    name="status"
                                    value={ticketData.status || 'Issued'}
                                    onChange={handleChange}
                                    className={inputClasses}
                                >
                                    {TICKET_STATUSES.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-border-default mt-6">
                                <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save Ticket'}
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </Modal>
            )}
        </AnimatePresence>
    );
};
