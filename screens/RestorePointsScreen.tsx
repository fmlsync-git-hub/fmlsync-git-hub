
import React, { useState, useEffect } from 'react';
import { RestorePoint, User, UserSettings } from '../types';
import { listenToRestorePoints, deleteRestorePoint, restoreToPoint } from '../services/firebase';
import { useFormatters } from '../hooks/useFormatters';
import { 
    ArrowPathIcon, 
    TrashIcon, 
    ClockIcon, 
    UserIcon, 
    InformationCircleIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon
} from '../components/icons';
import { motion, AnimatePresence } from 'motion/react';

const RestorePointsScreen: React.FC<{ currentUser: User & UserSettings }> = ({ currentUser }) => {
    const [restorePoints, setRestorePoints] = useState<RestorePoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPoint, setSelectedPoint] = useState<RestorePoint | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [restoreSuccess, setRestoreSuccess] = useState(false);
    const { formatTimestamp } = useFormatters();

    useEffect(() => {
        const unsubscribe = listenToRestorePoints((points) => {
            setRestorePoints(points);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleRestore = async () => {
        if (!selectedPoint) return;
        
        setIsRestoring(true);
        try {
            await restoreToPoint(selectedPoint, currentUser.username);
            setRestoreSuccess(true);
            setTimeout(() => {
                setRestoreSuccess(false);
                setShowConfirmModal(false);
                setSelectedPoint(null);
            }, 3000);
        } catch (error) {
            console.error("Restore failed:", error);
            alert("Failed to restore application state. Please check logs.");
        } finally {
            setIsRestoring(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this restore point? This cannot be undone.")) {
            await deleteRestorePoint(id);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">System Restore Points</h1>
                    <p className="text-text-secondary">Backtrack or restore application data to a previous state.</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg flex items-center gap-3 max-w-md">
                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-700 font-medium">
                        Restoring a point will overwrite ALL current data with the snapshot from that time. 
                        Proceed with extreme caution.
                    </p>
                </div>
            </div>

            <div className="flex-1 overflow-hidden bg-surface border border-border-default rounded-xl shadow-sm flex flex-col">
                <div className="overflow-y-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-surface-soft border-b border-border-default z-10">
                            <tr>
                                <th className="p-4 text-xs font-bold uppercase text-text-secondary tracking-wider">Timestamp</th>
                                <th className="p-4 text-xs font-bold uppercase text-text-secondary tracking-wider">Action Trigger</th>
                                <th className="p-4 text-xs font-bold uppercase text-text-secondary tracking-wider">Created By</th>
                                <th className="p-4 text-xs font-bold uppercase text-text-secondary tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-default/50">
                            {restorePoints.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-text-secondary">
                                        <ClockIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                        <p>No restore points found. They are automatically created when data is modified.</p>
                                    </td>
                                </tr>
                            ) : (
                                restorePoints.map((point) => (
                                    <tr key={point.id} className="hover:bg-surface-soft transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <ClockIcon className="h-4 w-4 text-text-secondary" />
                                                <span className="text-sm font-medium text-text-primary">
                                                    {formatTimestamp(point.timestamp)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <InformationCircleIcon className="h-4 w-4 text-primary" />
                                                <span className="text-sm text-text-primary">{point.action}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <UserIcon className="h-4 w-4 text-text-secondary" />
                                                <span className="text-sm text-text-secondary">{point.createdBy}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => { setSelectedPoint(point); setShowConfirmModal(true); }}
                                                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                                                    title="Restore to this point"
                                                >
                                                    <ArrowPathIcon className="h-4 w-4" />
                                                    Restore
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(point.id)}
                                                    className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                                                    title="Delete restore point"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Confirm Restore Modal */}
            <AnimatePresence>
                {showConfirmModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-surface border border-border-default rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                        >
                            <div className="p-6">
                                {restoreSuccess ? (
                                    <div className="flex flex-col items-center text-center py-8">
                                        <div className="h-20 w-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                                            <CheckCircleIcon className="h-12 w-12 text-green-500" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-text-primary mb-2">System Restored!</h3>
                                        <p className="text-text-secondary">The application state has been successfully reverted.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="h-12 w-12 bg-amber-500/20 rounded-full flex items-center justify-center shrink-0">
                                                <ExclamationTriangleIcon className="h-6 w-6 text-amber-500" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-text-primary">Confirm Restore</h3>
                                                <p className="text-sm text-text-secondary">You are about to revert the system state.</p>
                                            </div>
                                        </div>

                                        <div className="bg-surface-soft border border-border-default rounded-xl p-4 mb-6">
                                            <p className="text-xs font-bold uppercase text-text-secondary mb-2">Restore Point Details</p>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-text-secondary">Time:</span>
                                                    <span className="text-text-primary font-medium">{formatTimestamp(selectedPoint?.timestamp)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-text-secondary">Action:</span>
                                                    <span className="text-text-primary font-medium">{selectedPoint?.action}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-text-secondary">Created By:</span>
                                                    <span className="text-text-primary font-medium">{selectedPoint?.createdBy}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-sm text-danger font-medium mb-6">
                                            WARNING: This will overwrite all current passengers, checklists, and settings. 
                                            This action is irreversible.
                                        </p>

                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => setShowConfirmModal(false)}
                                                disabled={isRestoring}
                                                className="flex-1 py-3 px-4 bg-surface border border-border-default text-text-primary font-bold rounded-xl hover:bg-surface-soft transition-colors disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                onClick={handleRestore}
                                                disabled={isRestoring}
                                                className="flex-1 py-3 px-4 bg-danger text-white font-bold rounded-xl hover:bg-danger-dark transition-colors shadow-lg shadow-danger/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {isRestoring ? (
                                                    <>
                                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                        Restoring...
                                                    </>
                                                ) : (
                                                    'Confirm Restore'
                                                )}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RestorePointsScreen;
