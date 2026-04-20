
import React, { useState, useEffect } from 'react';
import { Screen, User, UserSettings, UserRole } from '../types';
import { useBranding } from '../context/BrandingContext';
import { Cog6ToothIcon, PowerIcon, ChartBarIcon, ChevronDownIcon, XMarkIcon } from './icons/index';
import { NavItemConfig, getVisibleNavItems } from '../navigation';


interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
  currentUser: User & UserSettings;
}

const NavItem: React.FC<{
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
  isCollapsed: boolean;
}> = ({ label, icon: Icon, isActive, onClick, isCollapsed }) => (
  <button
    onClick={onClick}
    title={isCollapsed ? label : ''}
    className={`group flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl mb-1 ${
      isActive
        ? 'bg-primary text-on-primary shadow-md shadow-primary/20'
        : 'text-on-sidebar/80 hover:bg-surface-soft hover:text-on-sidebar'
    }`}
  >
    <Icon className={`h-5 w-5 mr-3 shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
    <span className={`transition-opacity duration-200 lg:opacity-100 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>{label}</span>
  </button>
);


interface DropdownNavItemProps {
  label: string;
  icon: React.ElementType;
  items: NavItemConfig[];
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
  isCollapsed: boolean;
}

const DropdownNavItem: React.FC<DropdownNavItemProps> = ({ label, icon: Icon, items, activeScreen, onNavigate, isCollapsed }) => {
  const isActive = items.some(item => item.id === activeScreen);
  const [isOpen, setIsOpen] = useState(isActive);

  useEffect(() => {
    if (isActive && !isOpen) {
      setIsOpen(true);
    }
  }, [isActive, isOpen]);

  if (items.length === 0) return null;

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={isCollapsed ? label : ''}
        className={`group flex items-center justify-between w-full px-4 py-3 text-sm font-medium transition-colors duration-200 rounded-xl ${
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-on-sidebar/80 hover:bg-surface-soft hover:text-on-sidebar'
        }`}
      >
        <div className="flex items-center">
          <Icon className={`h-5 w-5 mr-3 shrink-0 ${isActive ? 'text-primary' : ''}`} />
          <span className={`transition-opacity duration-200 lg:opacity-100 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>{label}</span>
        </div>
        <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 lg:inline-block ${isOpen ? 'rotate-180' : ''} ${isCollapsed ? 'hidden' : 'inline-block'}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className={`pl-4 pt-1 space-y-1 lg:block ${isCollapsed ? 'hidden' : 'block'}`}>
          {items.map(item => (
            <NavItem
              key={item.id}
              label={item.label}
              icon={item.icon}
              isActive={activeScreen === item.id}
              onClick={() => onNavigate(item.id)}
              isCollapsed={isCollapsed}
            />
          ))}
        </div>
      </div>
    </div>
  );
};


const RoleIndicator: React.FC<{ role: UserRole }> = ({ role }) => {
    const roleInfo: Record<UserRole, { label: string; className: string } | null> = {
        admin: {
            label: 'Admin',
            className: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
        },
        officer: {
            label: 'Ticket Officer',
            className: 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
        },
        app_manager: {
            label: 'App Manager',
            className: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
        },
        developer: null, 
        client: null,
        designer: {
            label: 'Web App Builder',
            className: 'bg-pink-500/20 text-pink-400 border border-pink-500/30',
        },
        dashboard_only: {
            label: 'Dashboard View',
            className: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
        }
    };

    const currentRole = roleInfo[role];
    if (!currentRole) return null;

    return (
        <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${currentRole.className}`}>
            {currentRole.label}
        </span>
    );
};


export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, activeScreen, onNavigate, onLogout, currentUser }) => {
  const { 
    fontColor, 
    watermarkEnabled,
    watermarkLocation,
    watermarkOpacity,
    watermarkSize,
    featureFlags,
    appLogo,
    sidebarWidth: defaultSidebarWidth // Global default
  } = useBranding();

  // Use user-specific override if present, else fallback to global default
  const effectiveSidebarWidth = currentUser.sidebarWidth ?? defaultSidebarWidth;

  const isCollapsed = !isOpen;

  // Apply width directly via style to ensure it works
  const sidebarStyle: React.CSSProperties = {
    color: fontColor || 'var(--color-on-sidebar)',
    width: isOpen ? `${effectiveSidebarWidth}px` : '0px', 
  };
  
  // Specific style for desktop where it might be static
  const desktopStyle: React.CSSProperties = {
    width: `${effectiveSidebarWidth}px`,
    color: fontColor || 'var(--color-on-sidebar)',
  };

  const watermarkStyle: React.CSSProperties = {
    opacity: watermarkOpacity,
    width: `${watermarkSize}%`,
    height: `${watermarkSize}%`,
  };

  const { visibleMainNavItems, visibleToolsNavItems, visibleSettingsNavItems } = getVisibleNavItems(currentUser);

  const finalVisibleMainNavItems = visibleMainNavItems.filter(item => featureFlags[item.id] !== false);
  const finalVisibleToolsNavItems = visibleToolsNavItems.filter(item => featureFlags[item.id] !== false);
  const finalVisibleSettingsNavItems = visibleSettingsNavItems.filter(item => featureFlags[item.id] !== false);


  return (
    <>
        {/* Overlay for mobile */}
        <div 
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden transition-all duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
        ></div>

        {/* Sidebar Container */}
        {/* Using style prop to strictly enforce width from settings */}
        <aside 
            className={`fixed lg:static inset-y-0 left-0 z-[101] border-r border-border-default bg-sidebar transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col p-4 overflow-y-auto ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}`}
            style={window.innerWidth >= 1024 ? desktopStyle : sidebarStyle}
        >
            <div className="flex justify-end lg:hidden mb-4">
                 <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg bg-surface-soft text-on-sidebar/70 hover:text-on-sidebar hover:bg-surface transition-colors">
                    <XMarkIcon className="h-6 w-6"/>
                </button>
            </div>

            <div className={`px-2 mb-8 transition-opacity duration-200 lg:opacity-100 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
                <RoleIndicator role={currentUser.role} />
            </div>

            <nav className="flex-1 space-y-2 text-on-sidebar">
                {finalVisibleMainNavItems.map(item => (
                    <NavItem
                        key={item.id}
                        label={item.label}
                        icon={item.icon}
                        isActive={activeScreen === item.id}
                        onClick={() => {
                            onNavigate(item.id);
                            setIsOpen(false);
                        }}
                        isCollapsed={isCollapsed}
                    />
                ))}
                <DropdownNavItem
                    label="Tools"
                    icon={ChartBarIcon}
                    items={finalVisibleToolsNavItems}
                    activeScreen={activeScreen}
                    onNavigate={(screen) => {
                        onNavigate(screen);
                        setIsOpen(false);
                    }}
                    isCollapsed={isCollapsed}
                />
            </nav>

            {watermarkEnabled && watermarkLocation === 'sidebar' && appLogo && (
                <div 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center p-4 pointer-events-none z-0"
                    style={watermarkStyle}
                >
                    <img src={appLogo} alt="Watermark" className="max-w-full max-h-full object-contain grayscale opacity-50" />
                </div>
            )}

            <div className="mt-auto space-y-2 z-10 pt-6 border-t border-border-default/20">
                <DropdownNavItem
                    label="Settings"
                    icon={Cog6ToothIcon}
                    items={finalVisibleSettingsNavItems}
                    activeScreen={activeScreen}
                    onNavigate={(screen) => {
                        onNavigate(screen);
                        setIsOpen(false);
                    }}
                    isCollapsed={isCollapsed}
                />
                <NavItem
                label="Logout"
                icon={PowerIcon}
                isActive={false}
                onClick={onLogout}
                isCollapsed={isCollapsed}
                />
            </div>
        </aside>
    </>
  );
};
