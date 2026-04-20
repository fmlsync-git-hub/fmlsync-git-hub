
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Passenger, TicketData, TicketStatus } from '../types';
import { updatePassenger } from '../services/firebase';
import { XMarkIcon } from './icons/index';

// --- Reusable Components for this modal ---
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
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" 
            onClick={onClose}
        >
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-surface rounded-lg shadow-xl w-full max-w-lg max-h-[70vh] flex flex-col overflow-hidden" 
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center border-b border-border-default p-4 flex-none">
                    <h3 className="text-xl font-semibold text-text-primary">{title}</h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-danger p-1 rounded-full transition-colors">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
            </motion.div>
        </motion.div>,
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
    return <button type={type} onClick={onClick} disabled={disabled} className={`${baseClasses} ${variantClasses[variant]} ${className}`}>{children}</button>;
};

// --- Main Modal Component ---

interface EditTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  flight: { passenger: Passenger; ticket: TicketData } | null;
  onSave: () => void;
}

const TICKET_STATUSES: TicketStatus[] = ['Issued', 'Reserved', 'Pending confirmation', 'on-hold'];

export const EditTicketModal: React.FC<EditTicketModalProps> = ({ isOpen, onClose, flight, onSave }) => {
    const [ticketData, setTicketData] = useState<Partial<TicketData>>({});
    const [status, setStatus] = useState<TicketStatus>('Issued');
    const [onHoldReasonType, setOnHoldReasonType] = useState<'pending' | 'other' | ''>('');
    const [customOnHoldNote, setCustomOnHoldNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (flight) {
            setTicketData(flight.ticket);
            setStatus(flight.ticket.status || 'Issued');

            if (flight.ticket.status === 'on-hold') {
                if (flight.ticket.onHoldReason === 'Pending change of dates') {
                    setOnHoldReasonType('pending');
                    setCustomOnHoldNote('');
                } else {
                    setOnHoldReasonType('other');
                    setCustomOnHoldNote(flight.ticket.onHoldReason || '');
                }
            } else {
                setOnHoldReasonType('');
                setCustomOnHoldNote('');
            }
        } else {
            setTicketData({});
        }
        setError(null);
    }, [flight]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setTicketData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!flight) return;
        setIsSaving(true);
        setError(null);

        const updatedTickets = (flight.passenger.tickets || []).map(t => {
            if (t.id === flight.ticket.id) {
                // This is the ticket we are editing.
                const updatedTicket: Partial<TicketData> = {
                    ...t, // Start with original data
                    ...ticketData, // Apply form changes
                    status: status, // Apply status change
                };

                if (status === 'on-hold') {
                    if (onHoldReasonType === 'pending') {
                        updatedTicket.onHoldReason = 'Pending change of dates';
                    } else {
                        updatedTicket.onHoldReason = customOnHoldNote;
                    }
                } else {
                    // If status is not 'on-hold', ensure the onHoldReason field is removed.
                    delete updatedTicket.onHoldReason;
                }
                return updatedTicket;
            }
            return t; // Return other tickets unchanged.
        });

        try {
            await updatePassenger(flight.passenger.id, { tickets: updatedTickets });
            onSave();
            onClose();
        } catch (err) {
            console.error("Failed to update ticket", err);
            setError("Could not save changes. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const inputClasses = "p-2 border border-border-default bg-background rounded-md text-text-primary placeholder:text-text-secondary focus:ring-1 focus:ring-primary focus:outline-none w-full";
    const labelClasses = "block text-sm font-medium text-text-secondary mb-1";
    const passengerName = flight ? ((flight.passenger.passports || []).length > 0 ? `${flight.passenger.passports[0].firstNames} ${flight.passenger.passports[0].surname}` : 'No Passport') : '';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Ticket Details">
            <div className="p-6 space-y-4">
                {error && <p className="text-danger bg-danger/10 p-3 rounded-md text-sm text-center">{error}</p>}
                
                <div className="bg-surface-soft p-3 rounded-md">
                    <p className="text-sm font-medium text-text-secondary">Passenger</p>
                    <p className="font-semibold text-text-primary">{passengerName}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="ticketNumber" className={labelClasses}>Ticket Number</label>
                        <input id="ticketNumber" name="ticketNumber" type="text" value={ticketData.ticketNumber || ''} onChange={handleChange} className={inputClasses} placeholder="(Optional)" />
                    </div>
                     <div>
                        <label htmlFor="airline" className={labelClasses}>Airline</label>
                        <input id="airline" name="airline" type="text" value={ticketData.airline || ''} onChange={handleChange} className={inputClasses} />
                    </div>
                     <div>
                        <label htmlFor="departureCity" className={labelClasses}>Departure City</label>
                        <input id="departureCity" name="departureCity" type="text" value={ticketData.departureCity || ''} onChange={handleChange} className={inputClasses} />
                    </div>
                     <div>
                        <label htmlFor="arrivalCity" className={labelClasses}>Arrival City</label>
                        <input id="arrivalCity" name="arrivalCity" type="text" value={ticketData.arrivalCity || ''} onChange={handleChange} className={inputClasses} />
                    </div>
                    <div>
                        <label htmlFor="travelDate" className={labelClasses}>Travel Date</label>
                        <input id="travelDate" name="travelDate" type="date" value={ticketData.travelDate || ''} onChange={handleChange} className={inputClasses} />
                    </div>
                    <div>
                        <label htmlFor="travelTime" className={labelClasses}>Travel Time (Optional)</label>
                        <input id="travelTime" name="travelTime" type="time" value={ticketData.travelTime || ''} onChange={handleChange} className={inputClasses} />
                    </div>
                     <div className="sm:col-span-2">
                        <label htmlFor="status" className={labelClasses}>Booking Status</label>
                         <select id="status" name="status" value={status} onChange={e => setStatus(e.target.value as TicketStatus)} className={inputClasses}>
                            {TICKET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                
                {status === 'on-hold' && (
                    <div className="p-4 bg-surface-soft rounded-md space-y-3">
                        <h4 className="font-semibold text-text-primary">On-Hold Details</h4>
                        <div>
                            <label htmlFor="onHoldReasonType" className={labelClasses}>Reason</label>
                            <select id="onHoldReasonType" value={onHoldReasonType} onChange={e => setOnHoldReasonType(e.target.value as any)} className={inputClasses}>
                                <option value="" disabled>Select a reason</option>
                                <option value="pending">Pending change of dates</option>
                                <option value="other">Other (specify in notes)</option>
                            </select>
                        </div>
                        {onHoldReasonType === 'other' && (
                            <div>
                                <label htmlFor="customOnHoldNote" className={labelClasses}>Notes</label>
                                <textarea id="customOnHoldNote" value={customOnHoldNote} onChange={e => setCustomOnHoldNote(e.target.value)} rows={2} className={inputClasses} placeholder="Enter reason for on-hold status..."/>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className="flex justify-end gap-3 bg-surface-soft p-4 border-t border-border-default rounded-b-lg">
                <Button onClick={onClose} variant="secondary">Cancel</Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </Modal>
    );
};
