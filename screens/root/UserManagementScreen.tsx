import React, { useState, useEffect } from 'react';
import { User, UserSettings, Screen } from '../../types';
import { Cog6ToothIcon, UserCircleIcon, PencilIcon, TrashIcon, ArrowRightOnRectangleIcon, MapPinIcon } from '../../components/icons';
import { EditUserSettingsModal } from '../../components/EditUserSettingsModal';
import { EditCredentialsModal } from './EditCredentialsModal';
import { AddNewUserModal } from './AddNewUserModal';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { useFormatters } from '../../hooks/useFormatters';
import { useCompanies } from '../../context/CompanyContext';
import { DEFAULT_USERS } from '../../services/users';


// --- Reusable Components ---
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`bg-surface rounded-lg shadow-md border border-border-default ${className || ''}`}>{children}</div>
);
const Button: React.FC<{ children: React.ReactNode; onClick?: () => void; disabled?: boolean, className?: string }> = ({ children, onClick, disabled, className }) => (
    <button onClick={onClick} disabled={disabled} className={`px-3 py-1.5 text-sm font-semibold rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-primary text-white hover:bg-primary-dark focus:ring-primary disabled:bg-neutral-600 ${className}`}>{children}</button>
);

// --- Main Screen ---
type FullUserData = User & UserSettings;

const isUserOnline = (lastSeen: any): boolean => {
    if (!lastSeen) return false;
    // User is online if last seen within the last 2 minutes
    const TWO_MINUTES_IN_MS = 2 * 60 * 1000;
    const lastSeenTime = typeof lastSeen === 'number' ? lastSeen : (lastSeen.toDate ? lastSeen.toDate().getTime() : 0);
    return (Date.now() - lastSeenTime) < TWO_MINUTES_IN_MS;
};

interface UserManagementScreenProps {
  onLoginAs: (user: FullUserData) => void;
  currentUser: FullUserData;
}

const UserManagementScreen: React.FC<UserManagementScreenProps> = ({ onLoginAs, currentUser }) => {
    const [users, setUsers] = useState<FullUserData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingSettingsUser, setEditingSettingsUser] = useState<FullUserData | null>(null);
    const [editingCredsUser, setEditingCredsUser] = useState<FullUserData | null>(null);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<FullUserData | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [userToLogout, setUserToLogout] = useState<FullUserData | null>(null);
    const [isForcingLogout, setIsForcingLogout] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { formatTimestamp } = useFormatters();
    const { companies } = useCompanies();

    const getCompanyName = (companyId?: string) => {
        if (!companyId) return 'N/A';
        return companies.find(c => c.id === companyId)?.name || 'Unknown';
    };


    useEffect(() => {
        setIsLoading(true);
        // Mock user list
        const mockUsers: FullUserData[] = DEFAULT_USERS.map(u => ({
            ...u,
            id: u.username,
            isActive: true,
            lastLogin: Date.now(),
            lastSeen: Date.now(),
            companyId: '',
            theme: 'royalIndigo',
            layout: 'default',
            animationStyle: 'fade',
            stickyHeaderEnabled: true,
            pageLayout: 'wide',
            featureFlags: {},
            disabledMenus: [],
        } as any));

        const visibleUsers = mockUsers.filter(user => {
            if (currentUser.role === 'developer') {
                return user.username !== currentUser.username;
            }
            if (currentUser.role === 'app_manager') {
                return user.role !== 'developer' && user.username !== currentUser.username;
            }
            return false;
        });
        setUsers(visibleUsers);
        setIsLoading(false);
    }, [currentUser]);
    
    const handleConfirmDelete = async () => {
        if (!userToDelete) return;
        setIsDeleting(true);
        setError(null);
        try {
            // Mock delete
            setUsers(prev => prev.filter(u => u.username !== userToDelete.username));
            setUserToDelete(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete user.");
            console.error(err);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleConfirmForceLogout = async () => {
        if (!userToLogout) return;
        setIsForcingLogout(true);
        setError(null);
        try {
            // Mock force logout
            setUserToLogout(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to log out user.");
             console.error(err);
        } finally {
            setIsForcingLogout(false);
        }
    };

    const handleSaveNewUser = () => {
        setIsAddUserModalOpen(false);
    }

    const renderLocation = (location: FullUserData['lastLocation']) => {
        if (!location) return <span className="text-text-secondary">Unknown</span>;
        if (typeof location === 'string') return <span className="text-text-secondary" title={location}>Denied/Unavailable</span>;
        
        if (typeof location === 'object' && location.lat && location.lng) {
            const url = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
            const locationTimestamp = location.timestamp?.toDate ? formatTimestamp(location.timestamp) : '';
            return (
                <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-end md:justify-start gap-2 text-primary hover:underline" title={`Location recorded at ${locationTimestamp}`}>
                    <MapPinIcon className="h-5 w-5" />
                    <span>View Map</span>
                </a>
            );
        }

        return <span className="text-text-secondary">Unknown</span>;
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-text-primary">User Management</h2>
                <p className="mt-1 text-text-secondary">Activate, deactivate, and configure permissions for all users.</p>
            </div>

            <Card className="overflow-hidden bg-transparent md:bg-surface md:border md:border-border-default">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="hidden md:table-header-group bg-surface-soft">
                            <tr>
                                {['User', 'Role', 'Status', 'Last Login', 'Last Location', 'Actions'].map(header => (
                                    <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="block md:table-row-group">
                            {isLoading ? (
                                <tr><td colSpan={6} className="block md:table-cell text-center py-10 text-text-secondary">Loading users...</td></tr>
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
                                    <td className={`${tdBaseClasses} text-sm`} data-label="Last Location">{renderLocation(user.lastLocation)}</td>
                                    <td className={`${tdBaseClasses} text-right text-sm font-medium space-x-2`} data-label="Actions">
                                        <button onClick={() => onLoginAs(user)} className="p-2 text-text-secondary hover:text-primary transition-colors" title="Login as User"><UserCircleIcon className="h-5 w-5"/></button>
                                        <button onClick={() => setUserToLogout(user)} className="p-2 text-text-secondary hover:text-warning transition-colors" title="Force Logout"><ArrowRightOnRectangleIcon className="h-5 w-5" /></button>
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
            <div className="text-center">
                 <Button onClick={() => setIsAddUserModalOpen(true)}>
                    + Add New User
                </Button>
            </div>
            {editingSettingsUser && <EditUserSettingsModal user={editingSettingsUser} onClose={() => setEditingSettingsUser(null)} onSave={() => {}} />}
            {editingCredsUser && <EditCredentialsModal user={editingCredsUser} onClose={() => setEditingCredsUser(null)} onSave={() => {}} />}
            {isAddUserModalOpen && <AddNewUserModal isOpen={isAddUserModalOpen} onClose={() => setIsAddUserModalOpen(false)} onSave={handleSaveNewUser} currentUser={currentUser} />}
            <ConfirmationModal
                isOpen={!!userToDelete}
                onClose={() => setUserToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Confirm User Deletion"
                confirmText="Delete"
                isConfirming={isDeleting}
            >
                <p>
                    Are you sure you want to delete the user <strong className="text-text-primary">{userToDelete?.username}</strong> ({userToDelete?.role})?
                </p>
                {error && <p className="mt-2 text-sm text-danger">{error}</p>}
                <p className="mt-2 text-sm">This action is permanent and cannot be undone. It will remove the user and all their settings.</p>
            </ConfirmationModal>
             <ConfirmationModal
                isOpen={!!userToLogout}
                onClose={() => setUserToLogout(null)}
                onConfirm={handleConfirmForceLogout}
                title="Confirm Force Logout"
                confirmText="Force Logout"
                isConfirming={isForcingLogout}
            >
                <p>
                    Are you sure you want to force logout <strong className="text-text-primary">{userToLogout?.username}</strong>?
                </p>
                {error && <p className="mt-2 text-sm text-danger">{error}</p>}
                <p className="mt-2 text-sm">This will immediately end their current session.</p>
            </ConfirmationModal>
        </div>
    );
};

export default UserManagementScreen;
