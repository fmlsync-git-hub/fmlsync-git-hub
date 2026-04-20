import React, { useState, useEffect } from 'react';
import { ErrorLog } from '../../types';
import { BugAntIcon, TrashIcon, ChevronDownIcon } from '../../components/icons';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { useFormatters } from '../../hooks/useFormatters';

const Spinner: React.FC = () => (
    <div className="flex justify-center items-center py-16">
        <div className="flex items-center justify-center space-x-2">
            <div className="h-5 w-5 bg-primary rounded-full animate-pulse [animation-delay:-0.3s]"></div>
            <div className="h-5 w-5 bg-primary rounded-full animate-pulse [animation-delay:-0.15s]"></div>
            <div className="h-5 w-5 bg-primary rounded-full animate-pulse"></div>
        </div>
    </div>
);

const ErrorLogRow: React.FC<{ log: ErrorLog }> = ({ log }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { formatTimestamp } = useFormatters();

    return (
        <>
            <tr className="hover:bg-surface-soft transition-colors cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary font-mono">{formatTimestamp(log.timestamp)}</td>
                <td className="px-6 py-4 text-sm text-text-primary max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg truncate" title={log.errorMessage}>{log.errorMessage}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                    <ChevronDownIcon className={`h-5 w-5 text-text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </td>
            </tr>
            {isExpanded && (
                <tr className="bg-surface-soft">
                    <td colSpan={3} className="p-4">
                        <div className="space-y-2">
                            <div>
                                <h4 className="font-semibold text-text-primary text-sm">Stack Trace</h4>
                                <pre className="text-xs text-text-secondary bg-background p-2 rounded mt-1 overflow-auto max-h-48 font-mono">{log.stackTrace || 'Not available'}</pre>
                            </div>
                            <div>
                                <h4 className="font-semibold text-text-primary text-sm">Component Stack</h4>
                                <pre className="text-xs text-text-secondary bg-background p-2 rounded mt-1 overflow-auto max-h-48 font-mono">{log.componentStack || 'Not available'}</pre>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
};


const ErrorLogsScreen: React.FC = () => {
    const [logs, setLogs] = useState<ErrorLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isClearing, setIsClearing] = useState(false);
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        setError(null);
        // Mock error logs
        setLogs([]);
        setIsLoading(false);
    }, []);
    
    const handleClearLogs = async () => {
        setIsClearing(true);
        try {
            // Mock clear
            setLogs([]); 
        } catch (err) {
            console.error("Failed to clear error logs:", err);
            setError("Could not clear logs. Please try again.");
        } finally {
            setIsClearing(false);
            setIsClearModalOpen(false);
        }
    };
    
    const renderContent = () => {
        if (isLoading) return <Spinner />;
        if (error) return <p className="text-center py-16 text-danger">{error}</p>;
        if (logs.length === 0) {
            return (
                 <div className="text-center py-16 text-text-secondary bg-surface rounded-lg shadow-md border border-border-default">
                    <BugAntIcon className="w-12 h-12 text-border-default mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-text-primary">No Errors Logged</h3>
                    <p className="text-text-secondary mt-1">Client-side application errors will be recorded here.</p>
                </div>
            );
        }
        
        return (
            <div className="bg-surface rounded-lg shadow-md border border-border-default overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border-default">
                        <thead className="bg-surface-soft">
                             <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-1/4">Timestamp</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Error Message</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Expand</span></th>
                            </tr>
                        </thead>
                         <tbody className="bg-surface divide-y divide-border-default">
                            {logs.map(log => <ErrorLogRow key={log.id} log={log} />)}
                         </tbody>
                    </table>
                </div>
            </div>
        );
    };
    
    const buttonClasses = "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md shadow-sm transition-colors disabled:opacity-50";

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div>
                    <h2 className="text-3xl font-bold text-text-primary">Error Logs</h2>
                    <p className="mt-1 text-text-secondary">A record of client-side application errors.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsClearModalOpen(true)} disabled={isLoading || isClearing || logs.length === 0} className={`${buttonClasses} bg-danger text-white hover:bg-red-700`}>
                        <TrashIcon className="h-5 w-5" />
                        Clear Logs
                    </button>
                </div>
            </div>
            {renderContent()}
             <ConfirmationModal
                isOpen={isClearModalOpen}
                onClose={() => setIsClearModalOpen(false)}
                onConfirm={handleClearLogs}
                title="Confirm Clear Logs"
                confirmText="Clear All"
                isConfirming={isClearing}
            >
                <p>Are you sure you want to permanently delete all error logs?</p>
                <p className="mt-2 text-sm">This action cannot be undone.</p>
            </ConfirmationModal>
        </div>
    );
};

export default ErrorLogsScreen;
