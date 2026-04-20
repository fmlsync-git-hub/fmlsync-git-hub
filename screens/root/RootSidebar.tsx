
import React, { useState, useEffect } from 'react';
import { User, UserSettings, DuplicateAlert } from '../../types';
import { RootScreen } from './RootApp';
import { ChartPieIcon, UsersIcon, PowerIcon, DocumentTextIcon, BugAntIcon, PaintBrushIcon, ServerStackIcon, UserCircleIcon, ShieldCheckIcon, XMarkIcon, DocumentDuplicateIcon, TrashIcon } from '../../components/icons';

interface RootSidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  activeScreen: RootScreen;
  onNavigate: (screen: RootScreen) => void;
  onLogout: () => void;
  currentUser: User & UserSettings;
}

const NavItem: React.FC<{
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}> = ({ label, icon: Icon, isActive, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full px-4 py-3 text-sm font-medium transition-colors duration-200 rounded-lg relative ${
      isActive
        ? 'bg-primary text-white shadow'
        : 'text-on-sidebar/70 hover:bg-surface-soft hover:text-on-sidebar'
    }`}
  >
    <Icon className="h-5 w-5 mr-3" />
    <span className="flex-1 text-left">{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className="ml-auto bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
        {badge > 99 ? '99+' : badge}
      </span>
    )}
  </button>
);

const RootSidebar: React.FC<RootSidebarProps> = ({ isOpen, setIsOpen, activeScreen, onNavigate, onLogout, currentUser }) => {
  const [alertCount, setAlertCount] = useState(0);
  const [trashCount, setTrashCount] = useState(0);

  useEffect(() => {
    // Mock counts
    setAlertCount(0);
    setTrashCount(0);
  }, []);

  const handleNavigate = (screen: RootScreen) => {
    onNavigate(screen);
    setIsOpen(false);
  };

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
             <button onClick={() => setIsOpen(false)} className="p-1 text-on-sidebar/70 hover:text-on-sidebar">
                <XMarkIcon className="h-6 w-6"/>
            </button>
        </div>

        <div className="px-2 mb-6">
            <span className="text-xs font-semibold text-danger bg-danger/10 px-2 py-1 rounded-full">
                {currentUser.role === 'developer' ? 'DEVELOPER ACCESS' : 'APP MANAGER ACCESS'}
            </span>
        </div>
        
        <nav className="flex-1 space-y-2 text-on-sidebar">
            <NavItem
            label="Dashboard"
            icon={ChartPieIcon}
            isActive={activeScreen === 'dashboard'}
            onClick={() => handleNavigate('dashboard')}
            />
            <NavItem
            label="User Management"
            icon={UsersIcon}
            isActive={activeScreen === 'users'}
            onClick={() => handleNavigate('users')}
            />
            <NavItem
            label="Activity Logs"
            icon={DocumentTextIcon}
            isActive={activeScreen === 'logs'}
            onClick={() => handleNavigate('logs')}
            />
            <NavItem
            label="Error Logs"
            icon={BugAntIcon}
            isActive={activeScreen === 'errors'}
            onClick={() => handleNavigate('errors')}
            />
            <NavItem
            label="Appearance"
            icon={PaintBrushIcon}
            isActive={activeScreen === 'appearance'}
            onClick={() => handleNavigate('appearance')}
            />
            <NavItem
            label="Data Management"
            icon={ServerStackIcon}
            isActive={activeScreen === 'data_management'}
            onClick={() => handleNavigate('data_management')}
            />
            <NavItem
            label="Duplicates"
            icon={DocumentDuplicateIcon}
            isActive={activeScreen === 'duplicates'}
            onClick={() => handleNavigate('duplicates')}
            badge={alertCount}
            />
            <NavItem
            label="Trash Bin"
            icon={TrashIcon}
            isActive={activeScreen === 'trash_bin'}
            onClick={() => handleNavigate('trash_bin')}
            badge={trashCount}
            />
            {(currentUser.role === 'developer' || currentUser.role === 'app_manager') && (
                <NavItem
                    label="Security"
                    icon={ShieldCheckIcon}
                    isActive={activeScreen === 'security'}
                    onClick={() => handleNavigate('security')}
                />
            )}
        </nav>

        <div className="mt-auto space-y-2 text-on-sidebar">
            <NavItem
            label="My Account"
            icon={UserCircleIcon}
            isActive={activeScreen === 'my_account'}
            onClick={() => handleNavigate('my_account')}
            />
            <div className="text-center text-xs text-on-sidebar/70 p-2">
                Logged in as <strong className="text-on-sidebar">{currentUser.username}</strong>
            </div>
            <NavItem
            label="Logout"
            icon={PowerIcon}
            isActive={false}
            onClick={onLogout}
            />
        </div>
      </aside>
    </>
  );
};

export default RootSidebar;
