import React from 'react';
import { Screen, User, UserSettings } from '../../types';
import { TicketIcon, PowerIcon } from '../icons';
import { getVisibleNavItems } from '../../navigation';
import { useBranding } from '../../context/BrandingContext';

interface NavItemProps {
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ label, icon: Icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`group flex items-center w-full px-4 py-3 text-sm font-medium transition-colors duration-200 rounded-lg ${
      isActive
        ? 'bg-on-primary text-primary shadow'
        : 'text-on-sidebar/80 hover:bg-black/10'
    }`}
  >
    <Icon className="h-6 w-6 mr-4 shrink-0" />
    <span>{label}</span>
  </button>
);

interface DesktopSidebarProps {
  currentUser: User & UserSettings;
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
}

const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ currentUser, activeScreen, onNavigate, onLogout }) => {
  const { appName, appLogo, featureFlags } = useBranding();
  
  let finalVisibleMainNavItems, finalVisibleToolsNavItems, finalVisibleSettingsNavItems;

  if (currentUser.role === 'designer') {
      // For the designer, we show a representative preview of a normal user's sidebar.
      const typicalUser = { ...currentUser, role: 'admin', disabledMenus: [] } as User & UserSettings; // Simulate an admin to see most items.
      const navItems = getVisibleNavItems(typicalUser);
      finalVisibleMainNavItems = navItems.visibleMainNavItems.filter(item => featureFlags[item.id] !== false);
      finalVisibleToolsNavItems = navItems.visibleToolsNavItems.filter(item => featureFlags[item.id] !== false && item.id !== 'ui_designer'); // Exclude designer tool from preview
      finalVisibleSettingsNavItems = navItems.visibleSettingsNavItems.filter(item => featureFlags[item.id] !== false);
  } else {
      const navItems = getVisibleNavItems(currentUser);
      finalVisibleMainNavItems = navItems.visibleMainNavItems.filter(item => featureFlags[item.id] !== false);
      finalVisibleToolsNavItems = navItems.visibleToolsNavItems.filter(item => featureFlags[item.id] !== false);
      finalVisibleSettingsNavItems = navItems.visibleSettingsNavItems.filter(item => featureFlags[item.id] !== false);
  }


  return (
    <aside className="hidden lg:flex flex-col w-64 bg-sidebar text-on-sidebar p-4 lg:absolute h-full">
      <div className="flex items-center gap-3 mb-8 px-2 min-h-[40px]">
        {appLogo ? (
            <img src={appLogo} alt="App Logo" className="h-8 w-8 object-contain shrink-0" />
        ) : (
            <div className="w-8 h-8 bg-on-sidebar rounded-md flex items-center justify-center flex-shrink-0">
                <TicketIcon className="h-6 w-6 text-sidebar"/>
            </div>
        )}
        <h1 className="text-2xl font-bold truncate">{appName}</h1>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {finalVisibleMainNavItems.map(item => (
          <NavItem
            key={item.id}
            label={item.label}
            icon={item.icon}
            isActive={activeScreen === item.id}
            onClick={() => onNavigate(item.id as Screen)}
          />
        ))}

        {finalVisibleToolsNavItems.length > 0 && (
            <div className="pt-4">
                <div className="px-4 py-2 text-xs font-semibold text-on-sidebar/50">Tools</div>
                {finalVisibleToolsNavItems.map(item => (
                    <NavItem
                        key={item.id}
                        label={item.label}
                        icon={item.icon}
                        isActive={activeScreen === item.id}
                        onClick={() => onNavigate(item.id as Screen)}
                    />
                ))}
            </div>
        )}
        
        {finalVisibleSettingsNavItems.length > 0 && (
            <div className="pt-4">
                <div className="px-4 py-2 text-xs font-semibold text-on-sidebar/50">Settings</div>
                {finalVisibleSettingsNavItems.map(item => (
                    <NavItem
                        key={item.id}
                        label={item.label}
                        icon={item.icon}
                        isActive={activeScreen === item.id}
                        onClick={() => onNavigate(item.id as Screen)}
                    />
                ))}
            </div>
        )}
      </nav>
      
      <div className="mt-auto">
        <div className="p-2 text-center text-xs text-on-sidebar/70">
            Logged in as <strong className="text-on-sidebar">{currentUser.username}</strong>
        </div>
         <button
            onClick={onLogout}
            className={`group flex items-center w-full px-4 py-3 text-sm font-medium transition-colors duration-200 rounded-lg text-on-sidebar/80 hover:bg-black/10`}
        >
            <PowerIcon className="h-6 w-6 mr-4 shrink-0" />
            <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default DesktopSidebar;