
import React from 'react';
import { User, UserSettings } from '../../types';
import { PowerIcon, HomeIcon, XMarkIcon } from '../../components/icons';

interface ClientSidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onLogout: () => void;
  currentUser: User & UserSettings;
}

const NavItem: React.FC<{
  label: string;
  icon: React.ElementType;
}> = ({ label, icon: Icon }) => (
  <button
    className={`flex items-center w-full px-4 py-3 text-sm font-medium transition-colors duration-200 rounded-lg bg-primary text-white shadow`}
  >
    <Icon className="h-5 w-5 mr-3" />
    <span>{label}</span>
  </button>
);


const ClientSidebar: React.FC<ClientSidebarProps> = ({ isOpen, setIsOpen, onLogout, currentUser }) => {

  return (
    <>
        <div 
            className={`fixed inset-0 bg-black/60 z-30 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
        ></div>
        <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-[var(--sidebar-width)] border-r border-border-default bg-sidebar transition-transform duration-300 ease-in-out flex flex-col p-4 overflow-y-auto 
            ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
            <div className="flex justify-end lg:hidden mb-2">
                 <button onClick={() => setIsOpen(false)} className="p-1 text-on-sidebar hover:text-on-sidebar">
                    <XMarkIcon className="h-6 w-6"/>
                </button>
            </div>
            
            <div className="px-2 mb-6">
                <span className="text-xs font-semibold text-info bg-info/10 px-2 py-1 rounded-full">
                    CLIENT PORTAL
                </span>
            </div>
            
            <nav className="flex-1 space-y-2">
                <NavItem
                label="Home"
                icon={HomeIcon}
                />
            </nav>

            <div className="mt-auto space-y-2">
                <div className="text-center text-xs text-on-sidebar/70 p-2">
                    Logged in as <strong className="text-on-sidebar">{currentUser.username}</strong>
                </div>
                <button
                    onClick={onLogout}
                    className={`flex items-center w-full px-4 py-3 text-sm font-medium transition-colors duration-200 rounded-lg text-on-sidebar/70 hover:bg-surface-soft hover:text-on-sidebar`}
                >
                    <PowerIcon className="h-5 w-5 mr-3" />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    </>
  );
};

export default ClientSidebar;
