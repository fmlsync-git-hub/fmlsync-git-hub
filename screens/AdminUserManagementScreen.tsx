import React, { useState, useEffect } from 'react';
import { listenToUsersAndSettings, deleteUser, functions, httpsCallable } from '../services/firebase';
import { User, UserSettings } from '../types';
import { PencilIcon, TrashIcon, Cog6ToothIcon } from '../components/icons';
import { AdminEditOfficerCredentialsModal } from './AdminEditOfficerCredentialsModal';
import { AdminAddNewUserModal } from './AdminAddNewUserModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { EditUserSettingsModal } from '../components/EditUserSettingsModal';
// FIX: Changed to a named import for useFormatters to resolve module loading issue.
import { useFormatters } from '../hooks/useFormatters';
import { useCompanies } from '../context/CompanyContext';


const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`bg-surface rounded-lg shadow-md border border-border-default ${className || ''}`}>{children}</div>
);
const Button: React.FC<{ children: React.ReactNode; onClick?: () => void; disabled?: boolean, className?: string }> = ({ children, onClick, disabled, className }) => (
    <button onClick={onClick} disabled={disabled} className={`px-3 py-1.5 text-sm font-semibold rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-primary text-white hover:bg-primary-dark focus:ring-primary disabled:bg-neutral-600 ${className}`}>{children}</button>
);

type FullUserData = User & UserSettings;

const isUserOnline = (lastSeen: any): boolean => {
    if (!lastSeen?.toDate) return false;
    // User is online if last seen within the last 2 minutes
    const TWO_MINUTES_IN_MS = 2 * 60 * 1000;
    return (Date.now() - lastSeen.toDate().getTime()) < TWO_MINUTES_IN_MS;
};

interface AdminUserManagementScreenProps {
  currentUser: User & UserSettings;
}


const AdminUserManagementScreen: React.FC<AdminUserManagementScreenProps> = ({ currentUser }) => {
    const [users, setUsers] = useState<FullUserData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingCredsUser, setEditingCredsUser] = useState<FullUserData | null>(null);
    const [editingSettingsUser, setEditingSettingsUser] = useState<FullUserData | null>(null);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<FullUserData | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdatingEmails, setIsUpdatingEmails] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [updateResult, setUpdateResult] = useState<string | null>(null);
    const { formatTimestamp } = useFormatters();
    const { companies } = useCompanies();

    const handleBulkUpdateEmails = async () => {
        setIsUpdatingEmails(true);
        setError(null);
        setUpdateResult(null);
        try {
            const bulkUpdateEmailDomain = httpsCallable(functions, 'bulkUpdateUserEmailDomain');
            const result = await bulkUpdateEmailDomain({ 
                oldDomain: '@fmlticketing.cloud', 
                newDomain: '@fmlsync.com' 
            });
            setUpdateResult((result.data as any).message);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update emails.");
            console.error(err);
        } finally {
            setIsUpdatingEmails(false);
        }
    };

    const getCompanyName = (companyId?: string) => {
        if (!companyId) return 'N/A';
        return companies.find(c => c.id === companyId)?.name || 'Unknown';
    };


    useEffect(() => {
        setIsLoading(true);
        const unsubscribe = listenToUsersAndSettings((fullUsersData) => {
            const managedUsers = fullUsersData.filter(user => user.role === 'officer' || user.role === 'client' || (user.role === 'admin' && user.username !== currentUser.username));
            setUsers(managedUsers);
            setIsLoading(false);
        });
        
        return () => unsubscribe();
    }, [currentUser.username]);
    
    const handleConfirmDelete = async () => {
        if (!userToDelete) return;
        setIsDeleting(true);
        setError(null);
        try {
            await deleteUser(userToDelete.username);
            setUserToDelete(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete user.");
            console.error(err);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSaveNewUser = () => {
        // The listener will update the user list automatically.
        setIsAddUserModalOpen(false);
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-text-primary">User Management</h2>
                <p className="mt-1 text-text-secondary">Create and manage credentials and permissions for Admins, Officers and Clients.</p>
            </div>

            <Card className="overflow-hidden bg-transparent md:bg-surface md:border md:border-border-default">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="hidden md:table-header-group bg-surface-soft">
                            <tr>
                                {['User', 'Role', 'Status', 'Last Login', 'Actions'].map(header => (
                                    <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="block md:table-row-group">
                            {isLoading ? (
                                <tr><td colSpan={5} className="block md:table-cell text-center py-10 text-text-secondary">Loading users...</td></tr>
                            ) : users.map(user => {
                                const online = isUserOnline(user.lastSeen);
                                const tdBaseClasses = "px-4 py-3 md:px-6 md:py-4 whitespace-nowrap block md:table-cell text-right md:text-left border-b md:border-b-0 border-border-default/50 relative before:content-[attr(data-label)] before:float-left before:font-bold md:before:content-none";
                                
                                return (
                                <tr key={user.username} className="block md:table-row mb-4 md:mb-0 border md:border-b md:border-border-default rounded-lg shadow-sm md:shadow-none bg-surface">
                                    <td className={tdBaseClasses} data-label="User"><span className="font-medium text-text-primary">{user.username}</span></td>
                                    <td className={tdBaseClasses} data-label="Role">
                                      <div className="flex flex-col text-right md:text-left">
                                        <span className="text-sm text-text-secondary uppercase">{user.role}</span>
                                        {user.role === 'client' && (
                                            <span className="text-xs text-primary">{getCompanyName(user.companyId)}</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className={tdBaseClasses} data-label="Status">
                                        <div className="flex items-center gap-4 justify-end md:justify-start">
                                            <div className="flex items-center gap-2" title={online ? 'Online' : 'Offline'}>
                                                <div className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-success' : 'bg-neutral-500'}`}></div>
                                                <span className="text-sm text-text-primary">{online ? 'Online' : 'Offline'}</span>
                                            </div>
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                                {user.isActive ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className={`${tdBaseClasses} text-sm text-text-secondary`} data-label="Last Login">{formatTimestamp(user.lastLogin)}</td>
                                    <td className={`${tdBaseClasses} text-right text-sm font-medium space-x-2`} data-label="Actions">
                                        <button onClick={() => setEditingSettingsUser(user)} className="p-2 text-text-secondary hover:text-primary transition-colors" title="Edit Permissions"><Cog6ToothIcon className="h-5 w-5"/></button>
                                        <button onClick={() => setEditingCredsUser(user)} className="p-2 text-text-secondary hover:text-primary transition-colors" title="Edit Credentials"><PencilIcon className="h-5 w-5"/></button>
                                        <button onClick={() => setUserToDelete(user)} className="p-2 text-text-secondary hover:text-danger transition-colors" title="Delete User"><TrashIcon className="h-5 w-5"/></button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </Card>
            <div className="text-center space-y-4">
                 <Button onClick={() => setIsAddUserModalOpen(true)}>
                    + Add New User
                </Button>
                <div className="pt-4 border-t border-border-default">
                    <Button onClick={handleBulkUpdateEmails} disabled={isUpdatingEmails} className="bg-danger hover:bg-danger-dark">
                        {isUpdatingEmails ? 'Updating Emails...' : 'Bulk Update Email Domains (@fmlticketing.cloud -> @fmlsync.com)'}
                    </Button>
                    {updateResult && <p className="mt-2 text-sm text-success">{updateResult}</p>}
                    {error && <p className="mt-2 text-sm text-danger">{error}</p>}
                </div>
            </div>
            {editingSettingsUser && <EditUserSettingsModal user={editingSettingsUser} onClose={() => setEditingSettingsUser(null)} onSave={() => {}} currentUserRole={currentUser.role} />}
            {editingCredsUser && <AdminEditOfficerCredentialsModal user={editingCredsUser} onClose={() => setEditingCredsUser(null)} onSave={() => {}} />}
            {isAddUserModalOpen && <AdminAddNewUserModal isOpen={isAddUserModalOpen} onClose={() => setIsAddUserModalOpen(false)} onSave={handleSaveNewUser} />}
            <ConfirmationModal
                isOpen={!!userToDelete}
                onClose={() => setUserToDelete(null)}
                onConfirm={handleConfirmDelete}
                title={`Confirm Deletion for ${userToDelete?.role}`}
                confirmText="Delete"
                isConfirming={isDeleting}
            >
                <p>
                    Are you sure you want to delete the user <strong className="text-text-primary">{userToDelete?.username}</strong>?
                </p>
                {error && <p className="mt-2 text-sm text-danger">{error}</p>}
                <p className="mt-2 text-sm">This action is permanent and cannot be undone.</p>
            </ConfirmationModal>
        </div>
    );
};

export default AdminUserManagementScreen;
