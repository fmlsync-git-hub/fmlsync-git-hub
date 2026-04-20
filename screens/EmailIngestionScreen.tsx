
import React, { useState, useMemo } from 'react';
import { Company, Passenger, VisaData, TicketData } from '../types';
import { getPassengersByCompany, updatePassenger } from '../services/firebase';
import { useCompanies } from '../context/CompanyContext';
import { ArrowLeftIcon } from '../components/icons/index';

// --- Re-defined components to keep this file self-contained for the feature ---

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`bg-surface rounded-lg shadow-md border border-border-default p-4 sm:p-6 transition-all duration-300 ${className || ''}`}>
        {children}
    </div>
);

type ButtonVariant = 'primary' | 'secondary';
const Button: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string; type?: 'button'|'submit'|'reset', disabled?: boolean; variant?: ButtonVariant }> = ({ children, onClick, className, type = 'button', disabled = false, variant = 'primary' }) => {
    const baseClasses = `px-4 py-2 rounded-md font-semibold shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2`;
    const variantClasses = {
        primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
        secondary: 'bg-surface-soft text-text-primary hover:bg-border-default focus:ring-primary',
    };
    const disabledClasses = disabled ? 'bg-neutral-600 text-neutral-400 cursor-not-allowed' : '';
    return <button type={type} onClick={onClick} disabled={disabled} className={`${baseClasses} ${variantClasses[variant]} ${className} ${disabledClasses}`}>{children}</button>;
};

const FormInput: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void; type?: string; placeholder?: string; children?: React.ReactNode; required?: boolean }> = ({ label, name, value, onChange, type = "text", placeholder, children, required = false }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-text-secondary">{label}{required && ' *'}</label>
        {type === 'select' ? (
            <select name={name} id={name} value={value} onChange={onChange} required={required} className="mt-1 block w-full px-3 py-2 bg-background border border-border-default rounded-md shadow-sm text-text-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                {children}
            </select>
        ) : (
            <input type={type} name={name} id={name} value={value} onChange={onChange} placeholder={placeholder} required={required} className="mt-1 block w-full px-3 py-2 bg-background border border-border-default rounded-md shadow-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
        )}
    </div>
);

const BackButton: React.FC<{ onClick: () => void, children?: React.ReactNode}> = ({ onClick, children }) => (
    <Button onClick={onClick} variant="secondary" className="mb-4">
        <span className="flex items-center gap-2">
            <ArrowLeftIcon />
            {children || 'Back'}
        </span>
    </Button>
);

// --- Main Ingestion Screen Component ---

// FIX: Defined the example payload as a constant to avoid potential JSX parsing issues with inline objects.
const zapierExamplePayload = {
  "passengerName": "[Passenger Name from Parser]",
  "companyId": "modec",
  "ticketData": {
    "ticketNumber": "[Ticket Number from Parser]",
    "airline": "[Airline from Parser]"
  }
};


const EmailIngestionScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const { companies } = useCompanies();

    // Common state
    const [passengerName, setPassengerName] = useState('');
    const [companyId, setCompanyId] = useState('');

    // Form states
    const [visaData, setVisaData] = useState<Partial<Omit<VisaData, 'id'>>>({});
    const [ticketData, setTicketData] = useState<Partial<Omit<TicketData, 'id'>>>({});

    const handleCommonChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setter(e.target.value);
    };

    const handleFormChange = <T extends {}>(setter: React.Dispatch<React.SetStateAction<Partial<T>>>) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setter(prev => ({ ...prev, [name]: value }));
    };

    const findPassenger = async (): Promise<Passenger | null> => {
        if (!passengerName.trim() || !companyId) {
            setMessage({ type: 'error', text: 'Passenger Full Name and Company are required to find a profile.' });
            return null;
        }
        const passengers = await getPassengersByCompany(companyId);
        const found = passengers.find(p =>
            (p.passports?.length > 0 ? `${p.passports[0].firstNames} ${p.passports[0].surname}` : '').trim().toLowerCase() === passengerName.trim().toLowerCase()
        );
        if (!found) {
             setMessage({ type: 'error', text: `No passenger found with the name "${passengerName}" for the selected company.` });
             return null;
        }
        return found;
    };

    const handleSubmit = async (type: 'visa' | 'ticket') => {
        setIsLoading(true);
        setMessage(null);
        
        const passenger = await findPassenger();
        if (!passenger) {
            setIsLoading(false);
            return;
        }

        try {
            if (type === 'visa') {
                if (!visaData.visaNumber) {
                     setMessage({ type: 'error', text: 'Visa Number is a required field.' });
                     setIsLoading(false);
                     return;
                }
                const newVisa: VisaData = { ...visaData, id: Date.now().toString() } as VisaData;
                const updatedVisas = [...passenger.visas, newVisa];
                await updatePassenger(passenger.id, { visas: updatedVisas });
                setVisaData({}); // Clear form
            }

            if (type === 'ticket') {
                // Removed mandatory ticket number check to allow optional input
                const newTicket: TicketData = { ...ticketData, id: Date.now().toString() } as TicketData;
                const updatedTickets = [...passenger.tickets, newTicket];
                await updatePassenger(passenger.id, { tickets: updatedTickets });
                setTicketData({}); // Clear form
            }
            
            setMessage({ type: 'success', text: `Successfully added ${type} information for ${passengerName}.`});

        } catch (error) {
            console.error("Update error:", error);
            setMessage({ type: 'error', text: 'Failed to update passenger profile. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <BackButton onClick={onBack} />
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-text-primary">Email Ingestion</h2>
                <p className="mt-2 text-text-secondary max-w-3xl mx-auto">This section is for adding Visa or Ticket details extracted from emails, typically automated via a service like Zapier.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Forms Column */}
                <div className="space-y-8">
                    <Card>
                        <h3 className="text-xl font-semibold mb-4 border-b border-border-default pb-2">1. Identify Passenger</h3>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormInput label="Passenger Full Name" name="passengerName" value={passengerName} onChange={handleCommonChange(setPassengerName)} placeholder="e.g., John Doe" required/>
                            <FormInput label="Company" name="companyId" value={companyId} onChange={handleCommonChange(setCompanyId)} type="select" required>
                                <option value="">Select Company</option>
                                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </FormInput>
                        </div>
                    </Card>

                    {/* Visa Form */}
                    <Card>
                         <h3 className="text-xl font-semibold mb-4 border-b border-border-default pb-2">2. Add Visa Details</h3>
                         <div className="space-y-4">
                            <FormInput label="Visa Number" name="visaNumber" value={visaData.visaNumber || ''} onChange={handleFormChange(setVisaData)} required/>
                            <FormInput label="Country" name="country" value={visaData.country || ''} onChange={handleFormChange(setVisaData)} />
                            <FormInput label="Date of Issue" name="dateOfIssue" value={visaData.dateOfIssue || ''} onChange={handleFormChange(setVisaData)} type="date" />
                            <FormInput label="Date of Expiry" name="dateOfExpiry" value={visaData.dateOfExpiry || ''} onChange={handleFormChange(setVisaData)} type="date" />
                            <Button onClick={() => handleSubmit('visa')} disabled={isLoading} className="w-full">
                                {isLoading ? 'Saving...' : 'Save Visa to Profile'}
                            </Button>
                         </div>
                    </Card>

                    {/* Ticket Form */}
                    <Card>
                         <h3 className="text-xl font-semibold mb-4 border-b border-border-default pb-2">3. Add Ticket Details</h3>
                         <div className="space-y-4">
                            <FormInput label="Ticket Number" name="ticketNumber" value={ticketData.ticketNumber || ''} onChange={handleFormChange(setTicketData)} placeholder="(Optional)"/>
                            <FormInput label="Airline" name="airline" value={ticketData.airline || ''} onChange={handleFormChange(setTicketData)} />
                            <FormInput label="Departure City" name="departureCity" value={ticketData.departureCity || ''} onChange={handleFormChange(setTicketData)} />
                            <FormInput label="Arrival City" name="arrivalCity" value={ticketData.arrivalCity || ''} onChange={handleFormChange(setTicketData)} />
                            <FormInput label="Travel Date" name="travelDate" value={ticketData.travelDate || ''} onChange={handleFormChange(setTicketData)} type="date" />
                             <Button onClick={() => handleSubmit('ticket')} disabled={isLoading} className="w-full">
                                {isLoading ? 'Saving...' : 'Save Ticket to Profile'}
                            </Button>
                         </div>
                    </Card>
                     {message && (
                        <div className={`p-4 rounded-md text-sm font-semibold ${message.type === 'success' ? 'bg-success text-white' : 'bg-danger text-white'}`}>
                            {message.text}
                        </div>
                    )}
                </div>

                {/* Zapier Guide Column */}
                <Card className="sticky top-24">
                    <h3 className="text-xl font-semibold mb-4 border-b border-border-default pb-2 text-indigo-400">How to Integrate with Zapier</h3>
                    <div className="space-y-4 text-text-secondary text-sm">
                        <p>To automatically create ticket or visa records from emails, use a service like <strong className="font-semibold text-text-primary">Zapier</strong>. This form simulates the API endpoint where Zapier would send data.</p>
                        
                        <div>
                            <h4 className="font-semibold text-base mb-1 text-text-primary">Sample Zapier Workflow:</h4>
                            <ol className="list-decimal list-inside space-y-2 pl-2">
                                <li>
                                    <strong className="text-text-primary">Trigger: New Email in Gmail</strong><br />
                                    Set up a filter/label in Gmail (e.g., "FML-Travel-Docs"). In Zapier, use the "New Labeled Email" trigger.
                                </li>
                                <li>
                                    <strong className="text-text-primary">Action: Parser by Zapier (or AI)</strong><br />
                                    {/* FIX: Escaped the curly braces to prevent JSX parsing errors. */}
                                    {/* FIX: Corrected a typo in an HTML tag that caused a JSX parsing error. */}
                                    This step extracts data from the email body. Create a template to teach the parser what to look for (e.g., <code>Passenger: {'{{passengerName}}'}</code>, <code>Ticket No: {'{{ticketNumber}}'}</code>).
                                </li>
                                <li>
                                    <strong className="text-text-primary">Action: Webhooks by Zapier (POST Request)</strong><br />
                                    This step sends the extracted data to your application's API endpoint.
                                    <ul className="list-disc list-inside mt-1 pl-4 bg-surface-soft p-2 rounded">
                                        <li><strong>URL:</strong> `https://yourapi.com/ingest-document` (This is hypothetical)</li>
                                        <li><strong>Payload Type:</strong> JSON</li>
                                        <li><strong>Data:</strong> Map the fields from the parser step to JSON keys. Example:
                                            <pre className="text-xs bg-background text-text-primary p-2 rounded mt-1 overflow-x-auto">{JSON.stringify(zapierExamplePayload, null, 2)}</pre>
                                        </li>
                                    </ul>
                                </li>
                            </ol>
                        </div>
                         <p className="mt-4 pt-4 border-t border-border-default"><strong>Note:</strong> Since this is a demo app without a live API endpoint, you can use the forms on this page to manually enter data you would otherwise parse from an email to test the record-updating functionality.</p>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default EmailIngestionScreen;
