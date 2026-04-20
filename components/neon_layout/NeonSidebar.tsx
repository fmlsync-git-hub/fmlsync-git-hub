
import React from 'react';
import { Screen, User, UserSettings, UserRole } from '../../types';
import { getVisibleNavItems, NavItemConfig } from '../../navigation';
import { useBranding } from '../../context/BrandingContext';
import { PowerIcon, SparklesIcon, XMarkIcon } from '../icons';

interface NavItemProps {
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ label, icon: Icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`relative group flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg ${
      isActive
        ? 'bg-primary/20 text-on-primary'
        : 'text-on-sidebar/70 hover:bg-white/10 hover:text-on-sidebar'
    }`}
  >
    <div className={`absolute left-0 top-0 h-full w-1 rounded-r-full bg-primary transition-all duration-300 shadow-[0_0_12px] shadow-primary ${isActive ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'}`}></div>
    <Icon className="h-5 w-5 mr-4 shrink-0" />
    <span>{label}</span>
  </button>
);

interface NeonSidebarProps {
  currentUser: User & UserSettings;
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const NeonSidebar: React.FC<NeonSidebarProps> = ({ currentUser, activeScreen, onNavigate, onLogout, isOpen, setIsOpen }) => {
    const { appName, appLogo, featureFlags } = useBranding();

    const { visibleMainNavItems, visibleToolsNavItems, visibleSettingsNavItems } = getVisibleNavItems(currentUser);

    const handleNavigate = (screen: Screen) => {
        onNavigate(screen);
        setIsOpen(false);
    };
  
    const finalVisibleMainNavItems = visibleMainNavItems.filter(item => featureFlags[item.id] !== false);
    const finalVisibleToolsNavItems = visibleToolsNavItems.filter(item => featureFlags[item.id] !== false);
    const finalVisibleSettingsNavItems = visibleSettingsNavItems.filter(item => featureFlags[item.id] !== false);

    return (
        <>
            {/* Overlay for mobile */}
            <div 
                className={`fixed inset-0 bg-black/60 z-30 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
            ></div>

            <aside 
                className={`fixed lg:absolute lg:inset-y-0 lg:left-0 lg:flex lg:flex-col lg:w-[var(--sidebar-width)] inset-y-0 left-0 flex flex-col w-[var(--sidebar-width)] z-40 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 
                bg-sidebar/60 backdrop-blur-xl border-r border-primary/20 p-4 text-on-sidebar`}
            >
                <div className="flex items-center justify-between gap-3 mb-8 px-2 min-h-[40px]">
                    <div className="flex items-center gap-3 overflow-hidden">
                        {appLogo && <img src={appLogo} alt="App Logo" className="h-8 w-8 object-contain shrink-0" />}
                        <h1 className="text-2xl font-bold truncate">{appName}</h1>
                    </div>
                     <button onClick={() => setIsOpen(false)} className="p-1 text-on-sidebar/70 hover:text-on-sidebar lg:hidden">
                        <XMarkIcon className="h-6 w-6"/>
                    </button>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto">
                    {finalVisibleMainNavItems.map(item => (
                        <NavItem
                            key={item.id}
                            label={item.label}
                            icon={item.icon}
                            isActive={activeScreen === item.id}
                            onClick={() => handleNavigate(item.id as Screen)}
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
                                    onClick={() => handleNavigate(item.id as Screen)}
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
                                    onClick={() => handleNavigate(item.id as Screen)}
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
                        className={`group flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg text-on-sidebar/70 hover:bg-white/10 hover:text-on-sidebar`}
                    >
                        <PowerIcon className="h-5 w-5 mr-4 shrink-0" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default NeonSidebar;
