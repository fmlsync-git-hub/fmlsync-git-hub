
import React, { useState, useEffect } from 'react';
import { DuplicateAlert, Passenger } from '../../types';
import { 
    DocumentDuplicateIcon, 
    ArrowPathIcon, 
    CheckCircleIcon, 
    XCircleIcon,
    TrashIcon,
    UserIcon,
    TicketIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    ChevronDownIcon,
    ChevronUpIcon
} from '../../components/icons';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmationModal } from '../../components/ConfirmationModal';

const DuplicateManagementScreen: React.FC = () => {
    const [alerts, setAlerts] = useState<DuplicateAlert[]>([]);
    const [isChecking, setIsChecking] = useState(false);
    const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState<{ show: boolean, passengerId: string, alertId: string } | null>(null);
    const [showResolveModal, setShowResolveModal] = useState<{ show: boolean, alertId: string, action: 'resolved' | 'ignored' } | null>(null);

    useEffect(() => {
        // Mock alerts
        setAlerts([]);
    }, []);

    const handleRunCheck = async () => {
        setIsChecking(true);
        try {
            // Mock check
            await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
            console.error("Failed to run duplicate check:", error);
        } finally {
            setIsChecking(false);
        }
    };

    const handleResolve = async (alertId: string, action: 'resolved' | 'ignored') => {
        // Mock resolve
        setAlerts(prev => prev.filter(a => a.id !== alertId));
        setShowResolveModal(null);
    };

    const handleDeletePassenger = async (passengerId: string, alertId: string) => {
        try {
            // Mock delete
            setShowDeleteModal(null);
        } catch (error) {
            console.error("Failed to delete passenger:", error);
        }
    };

    const handleRemoveTicket = async (passengerId: string, ticketId: string, alertId: string) => {
        try {
            // Mock remove ticket
        } catch (error) {
            console.error("Failed to remove ticket:", error);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'medium': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
            case 'low': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
            default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'passenger': return <UserIcon className="w-5 h-5" />;
            case 'ticket': return <TicketIcon className="w-5 h-5" />;
            default: return <DocumentDuplicateIcon className="w-5 h-5" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                        <DocumentDuplicateIcon className="w-8 h-8 text-brand-primary" />
                        Duplicate Management
                    </h1>
                    <p className="text-text-secondary mt-1">
                        Cross-check and resolve duplicate travel documentation and personnel entries.
                    </p>
                </div>
                <button
                    onClick={handleRunCheck}
                    disabled={isChecking}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
                >
                    <ArrowPathIcon className={`w-5 h-5 ${isChecking ? 'animate-spin' : ''}`} />
                    {isChecking ? 'Checking...' : 'Run Cross-check'}
                </button>
            </div>

            {alerts.length === 0 ? (
                <div className="bg-background-card border border-border-default rounded-xl p-12 text-center">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircleIcon className="w-10 h-10 text-green-500" />
                    </div>
                    <h3 className="text-lg font-medium text-text-primary">No Duplicates Found</h3>
                    <p className="text-text-secondary mt-2 max-w-md mx-auto">
                        Your data is clean! No duplicate passengers or travel documents were detected in the latest scan.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    <AnimatePresence>
                        {alerts.map((alert) => (
                            <motion.div
                                key={alert.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-background-card border border-border-default rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div 
                                    className="p-4 flex items-center justify-between cursor-pointer"
                                    onClick={() => setExpandedAlertId(expandedAlertId === alert.id ? null : alert.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${getSeverityColor(alert.severity)} border`}>
                                            {getTypeIcon(alert.type)}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-text-primary">{alert.description}</h3>
                                            <p className="text-sm text-text-secondary">
                                                Found {alert.affectedIds.length} potential duplicates for {alert.metadata.field}: <span className="font-mono text-brand-primary">{alert.metadata.value}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="hidden sm:block text-right mr-4">
                                            <p className="text-xs text-text-secondary">Detected</p>
                                            <p className="text-sm font-medium">{new Date(alert.createdAt).toLocaleString()}</p>
                                        </div>
                                        {expandedAlertId === alert.id ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {expandedAlertId === alert.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t border-border-default bg-background-margin/30"
                                        >
                                            <div className="p-4 space-y-4">
                                                <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3 flex gap-3">
                                                    <ExclamationTriangleIcon className="w-5 h-5 text-orange-500 shrink-0" />
                                                    <p className="text-sm text-orange-700 dark:text-orange-300">
                                                        Review the entries below carefully before taking action. Deleting a record is permanent and will remove all associated documents.
                                                    </p>
                                                </div>

                                                <div className="grid sm:grid-cols-2 gap-4">
                                                    {alert.metadata.passengerNames?.map((name, idx) => (
                                                        <div key={idx} className="bg-background-card border border-border-default rounded-lg p-3 flex justify-between items-center">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-xs">
                                                                    {name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-text-primary">{name}</p>
                                                                    <p className="text-xs text-text-secondary">ID: {alert.affectedIds[idx]}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                {alert.type === 'passenger' && (
                                                                    <button 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setShowDeleteModal({ show: true, passengerId: alert.affectedIds[idx], alertId: alert.id });
                                                                        }}
                                                                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                                        title="Delete this entry"
                                                                    >
                                                                        <TrashIcon className="w-5 h-5" />
                                                                    </button>
                                                                )}
                                                                {alert.type === 'ticket' && alert.metadata.details?.[idx] && (
                                                                    <button 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleRemoveTicket(alert.metadata.details[idx].passengerId, alert.metadata.details[idx].ticketId, alert.id);
                                                                        }}
                                                                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                                        title="Remove duplicate ticket"
                                                                    >
                                                                        <TrashIcon className="w-5 h-5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="flex justify-end gap-3 pt-2">
                                                    <button
                                                        onClick={() => setShowResolveModal({ show: true, alertId: alert.id, action: 'ignored' })}
                                                        className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background-margin rounded-lg transition-colors"
                                                    >
                                                        Ignore Alert
                                                    </button>
                                                    <button
                                                        onClick={() => setShowResolveModal({ show: true, alertId: alert.id, action: 'resolved' })}
                                                        className="px-4 py-2 text-sm font-medium bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                                                    >
                                                        <CheckCircleIcon className="w-4 h-4" />
                                                        Mark as Resolved
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Modals */}
            {showDeleteModal && (
                <ConfirmationModal
                    isOpen={showDeleteModal.show}
                    onClose={() => setShowDeleteModal(null)}
                    onConfirm={() => handleDeletePassenger(showDeleteModal.passengerId, showDeleteModal.alertId)}
                    title="Delete Duplicate Entry?"
                    confirmText="Delete Permanently"
                    confirmVariant="danger"
                >
                    <p>Are you absolutely sure you want to delete this passenger entry? This will permanently remove all their travel documents, visas, and permits. This action cannot be undone.</p>
                </ConfirmationModal>
            )}

            {showResolveModal && (
                <ConfirmationModal
                    isOpen={showResolveModal.show}
                    onClose={() => setShowResolveModal(null)}
                    onConfirm={() => handleResolve(showResolveModal.alertId, showResolveModal.action)}
                    title={showResolveModal.action === 'resolved' ? "Mark as Resolved?" : "Ignore this Alert?"}
                    confirmText={showResolveModal.action === 'resolved' ? "Mark Resolved" : "Ignore Alert"}
                    confirmVariant={showResolveModal.action === 'resolved' ? 'primary' : 'secondary'}
                >
                    <p>
                        {showResolveModal.action === 'resolved' 
                            ? "Have you manually fixed the duplicates? Marking as resolved will remove this alert from your pending list."
                            : "Ignoring this alert will hide it from your pending list. You can run a new check later to find it again if it still exists."}
                    </p>
                </ConfirmationModal>
            )}
        </div>
    );
};

export default DuplicateManagementScreen;
