
import React, { useState, useEffect } from 'react';
import { 
    TrashIcon, 
    ArrowPathIcon, 
    CheckCircleIcon, 
    XCircleIcon,
    TrashIconSolid,
    UserIcon,
    TicketIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    DocumentDuplicateIcon,
    ServerStackIcon,
    ChecklistIcon
} from '../../components/icons';
import { motion, AnimatePresence } from 'motion/react';
import { TrashItem } from '../../types';
import { ConfirmationModal } from '../../components/ConfirmationModal';

const TrashBinScreen: React.FC = () => {
    const [items, setItems] = useState<TrashItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showEmptyModal, setShowEmptyModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState<{ show: boolean, itemId: string } | null>(null);
    const [showRestoreModal, setShowRestoreModal] = useState<{ show: boolean, item: TrashItem } | null>(null);
    const [expandedItem, setExpandedItem] = useState<string | null>(null);

    useEffect(() => {
        // Mock trash items
        setItems([]);
        setIsLoading(false);
    }, []);

    const handleRestore = async (item: TrashItem) => {
        // Mock restore
        setItems(prev => prev.filter(i => i.id !== item.id));
        setShowRestoreModal(null);
    };

    const handleDelete = async (itemId: string) => {
        // Mock delete
        setItems(prev => prev.filter(i => i.id !== itemId));
        setShowDeleteModal(null);
    };

    const handleEmptyTrash = async () => {
        // Mock empty
        setItems([]);
        setShowEmptyModal(false);
    };

    const getTypeIcon = (type: TrashItem['type']) => {
        switch (type) {
            case 'passenger': return <UserIcon className="h-5 w-5 text-blue-500" />;
            case 'user': return <UserIcon className="h-5 w-5 text-purple-500" />;
            case 'checklist': return <ServerStackIcon className="h-5 w-5 text-emerald-500" />;
            case 'ticket_issue': return <TicketIcon className="h-5 w-5 text-amber-500" />;
            case 'restore_point': return <ArrowPathIcon className="h-5 w-5 text-indigo-500" />;
            default: return <InformationCircleIcon className="h-5 w-5 text-neutral-400" />;
        }
    };

    const getTypeLabel = (type: TrashItem['type']) => {
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <ArrowPathIcon className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                        <TrashIcon className="h-7 w-7 text-danger" />
                        Trash Bin
                    </h2>
                    <p className="text-text-secondary mt-1">
                        Manage deleted items. You can restore them or delete them permanently.
                    </p>
                </div>
                {items.length > 0 && (
                    <button
                        onClick={() => setShowEmptyModal(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-danger text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                    >
                        <TrashIconSolid className="h-5 w-5" />
                        Empty Trash
                    </button>
                )}
            </div>

            {items.length === 0 ? (
                <div className="bg-surface border border-border-default rounded-xl p-12 text-center">
                    <div className="bg-surface-soft w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <TrashIcon className="h-8 w-8 text-text-secondary opacity-20" />
                    </div>
                    <h3 className="text-lg font-medium text-text-primary">Trash is empty</h3>
                    <p className="text-text-secondary mt-1">Items you delete will appear here.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    <AnimatePresence mode="popLayout">
                        {items.map((item) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="p-2.5 bg-surface-soft rounded-lg shrink-0">
                                            {getTypeIcon(item.type)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary opacity-60">
                                                    {getTypeLabel(item.type)}
                                                </span>
                                                <span className="text-xs text-text-secondary opacity-40">•</span>
                                                <span className="text-xs text-text-secondary">
                                                    Deleted {new Date(item.deletedAt).toLocaleString()} by {item.deletedBy}
                                                </span>
                                            </div>
                                            <h4 className="text-lg font-semibold text-text-primary truncate">
                                                {item.label}
                                            </h4>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setShowRestoreModal({ show: true, item })}
                                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                            title="Restore"
                                        >
                                            <ArrowPathIcon className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => setShowDeleteModal({ show: true, itemId: item.id })}
                                            className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                                            title="Delete Permanently"
                                        >
                                            <TrashIconSolid className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                                            className="p-2 text-text-secondary hover:bg-surface-soft rounded-lg transition-colors"
                                        >
                                            {expandedItem === item.id ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {expandedItem === item.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t border-border-default bg-surface-soft/30"
                                        >
                                            <div className="p-5 overflow-x-auto">
                                                <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap">
                                                    {JSON.stringify(item.data, null, 2)}
                                                </pre>
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
            {showEmptyModal && (
                <ConfirmationModal
                    isOpen={showEmptyModal}
                    onClose={() => setShowEmptyModal(false)}
                    onConfirm={handleEmptyTrash}
                    title="Empty Trash Bin?"
                    confirmText="Empty All"
                    confirmVariant="danger"
                >
                    <p>Are you sure you want to permanently delete all items in the trash? This action cannot be undone.</p>
                </ConfirmationModal>
            )}

            {showDeleteModal && (
                <ConfirmationModal
                    isOpen={showDeleteModal.show}
                    onClose={() => setShowDeleteModal(null)}
                    onConfirm={() => handleDelete(showDeleteModal.itemId)}
                    title="Delete Permanently?"
                    confirmText="Delete"
                    confirmVariant="danger"
                >
                    <p>This item will be permanently removed from the database. This action cannot be undone.</p>
                </ConfirmationModal>
            )}

            {showRestoreModal && (
                <ConfirmationModal
                    isOpen={showRestoreModal.show}
                    onClose={() => setShowRestoreModal(null)}
                    onConfirm={() => handleRestore(showRestoreModal.item)}
                    title="Restore Item?"
                    confirmText="Restore"
                    confirmVariant="primary"
                >
                    <p>This will move the item back to its original location.</p>
                </ConfirmationModal>
            )}
        </div>
    );
};

export default TrashBinScreen;
