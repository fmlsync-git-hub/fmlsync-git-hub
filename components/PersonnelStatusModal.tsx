import React from 'react';
import { Passenger, VisaData, PermitData } from '../types';
import { XMarkIcon, CheckCircleIcon, DocumentWarningIcon, XCircleIcon } from './icons/index';
// FIX: Changed to a named import for useFormatters to resolve module loading issue.
import { useFormatters, getExpiryStatus } from '../hooks/useFormatters';

// --- Reusable Components ---
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-border-default p-4">
                    <div className="text-xl font-semibold text-text-primary">{title}</div>
                    <button onClick={onClose} className="text-text-secondary hover:text-danger p-1 rounded-full transition-colors">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`bg-surface-soft rounded-lg border border-border-default ${className || ''}`}>
        {children}
    </div>
);

const CardHeader: React.FC<{ title: string, children?: React.ReactNode }> = ({ title, children }) => (
    <div className="flex justify-between items-center p-3 border-b border-border-default">
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        {children}
    </div>
);

const DataField: React.FC<{ label: string, value: React.ReactNode, className?: string }> = ({ label, value, className }) => (
    <div className={className}>
        <p className="text-xs font-medium text-text-secondary uppercase">{label}</p>
        <p className="text-base text-text-primary truncate" title={typeof value === 'string' ? value : ''}>{value || 'N/A'}</p>
    </div>
);


// --- Main Modal Component ---

interface PersonnelStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  passenger: Passenger | null;
  companyName: string;
}

export const PersonnelStatusModal: React.FC<PersonnelStatusModalProps> = ({ isOpen, onClose, passenger, companyName }) => {
    const { formatDate } = useFormatters();

    if (!passenger) return null;

    const { passports, contactData, visas, permits, category } = passenger;
    const passportData = passports.length > 0 ? passports[0] : null;

    const title = (
        <div className="flex items-center gap-3">
            <span>{passportData ? `${passportData.firstNames} ${passportData.surname}` : 'No Passport'}</span>
             <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                category === 'Expatriate' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-teal-500/20 text-teal-300'
            }`}>
                {category}
            </span>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-6">
                <Card>
                    <CardHeader title="Biodata" />
                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <DataField label="Company" value={companyName} />
                        <DataField label="Nationality" value={passportData ? passportData.nationality : 'N/A'} />
                        <DataField label="Date of Birth" value={passportData ? formatDate(passportData.dateOfBirth) : 'N/A'} />
                        <DataField label="Email" value={contactData.email} className="col-span-2 sm:col-span-1" />
                        <DataField label="Phone" value={contactData.phone} />
                    </div>
                </Card>

                <Card>
                    <CardHeader title="Document Status" />
                    <div className="p-4 space-y-4">
                        {/* Passports */}
                        {passports.map((passport, index) => {
                            const status = getExpiryStatus(passport.dateOfExpiry);
                            return (
                                <div key={passport.id || index} className="grid grid-cols-2 gap-4 pt-4 border-t border-border-default first:border-t-0 first:pt-0">
                                    <DataField label="Passport No." value={passport.passportNumber} />
                                    <DataField label="Expiry Status" value={
                                        <span className={status.colorClass}>
                                            {status.icon}
                                            {status.text} ({formatDate(passport.dateOfExpiry)})
                                        </span>
                                    } />
                                </div>
                            );
                        })}
                        {/* Visas */}
                        {visas.length > 0 && (
                            <div className="pt-4 border-t border-border-default">
                                <h4 className="text-sm font-semibold text-text-primary mb-2">Visas</h4>
                                <div className="space-y-2">
                                    {visas.map((visa, index) => {
                                        const status = getExpiryStatus(visa.dateOfExpiry);
                                        return (
                                            <div key={visa.id || index} className="grid grid-cols-2 gap-4 text-sm p-2 bg-surface rounded-md">
                                                <DataField label="Country / Number" value={<>{visa.country} <span className="text-text-secondary font-mono">({visa.visaNumber})</span></>} />
                                                <DataField label="Expiry Status" value={
                                                    <span className={status.colorClass}>
                                                        {status.icon} {status.text} ({formatDate(visa.dateOfExpiry)})
                                                    </span>
                                                } />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                         {/* Permits */}
                        {permits.length > 0 && (
                             <div className="pt-4 border-t border-border-default">
                                <h4 className="text-sm font-semibold text-text-primary mb-2">Permits</h4>
                                <div className="space-y-2">
                                    {permits.map((permit, index) => {
                                        const status = getExpiryStatus(permit.dateOfExpiry);
                                        return (
                                            <div key={permit.id || index} className="grid grid-cols-2 gap-4 text-sm p-2 bg-surface rounded-md">
                                                <DataField label="Type / Number" value={<>{permit.type || 'Permit'} <span className="text-text-secondary font-mono">({permit.permitNumber})</span></>} />
                                                <DataField label="Expiry Status" value={
                                                    <span className={status.colorClass}>
                                                         {status.icon} {status.text} ({formatDate(permit.dateOfExpiry)})
                                                    </span>
                                                } />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </Modal>
    );
};
