
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Bars3Icon, ChevronDownIcon, PowerIcon, ChartPieIcon, UsersIcon, DocumentTextIcon, BugAntIcon, PaintBrushIcon, ServerStackIcon, UserCircleIcon, ShieldCheckIcon } from '../../components/icons';
import { User, UserSettings } from '../../types';
import { RootScreen } from './RootApp';
import { useBranding } from '../../context/BrandingContext';

interface RootHeaderProps {
    onToggleSidebar: () => void;
    currentUser: User & UserSettings;
    activeScreen: RootScreen;
    onNavigate: (screen: RootScreen) => void;
    sticky: boolean;
    onLogout: () => void;
}

const rootNavItems: { id: RootScreen, label: string, icon: React.ElementType, roles: ('developer' | 'app_manager')[] }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: ChartPieIcon, roles: ['developer', 'app_manager'] },
    { id: 'users', label: 'User Management', icon: UsersIcon, roles: ['developer', 'app_manager'] },
    { id: 'logs', label: 'Activity Logs', icon: DocumentTextIcon, roles: ['developer', 'app_manager'] },
    { id: 'errors', label: 'Error Logs', icon: BugAntIcon, roles: ['developer', 'app_manager'] },
    { id: 'appearance', label: 'Appearance', icon: PaintBrushIcon, roles: ['developer', 'app_manager'] },
    { id: 'data_management', label: 'Data Management', icon: ServerStackIcon, roles: ['developer', 'app_manager'] },
    { id: 'security', label: 'Security', icon: ShieldCheckIcon, roles: ['developer', 'app_manager'] },
    { id: 'my_account', label: 'My Account', icon: UserCircleIcon, roles: ['developer', 'app_manager'] },
];

const HeaderNavDropdown: React.FC<{
    currentUser: User & UserSettings;
    activeScreen: RootScreen;
    onNavigate: (screen: RootScreen) => void;
}> = ({ currentUser, activeScreen, onNavigate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownContentRef = useRef<HTMLDivElement>(null);

    const visibleNavItems = rootNavItems.filter(item => item.roles.includes(currentUser.role));
    const activeScreenLabel = visibleNavItems.find(item => item.id === activeScreen)?.label || 'Menu';

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    useEffect(() => {
        if (!isOpen) return;
        const handleClose = () => setIsOpen(false);
        window.addEventListener('scroll', handleClose, true);
        window.addEventListener('resize', handleClose);
        return () => {
            window.removeEventListener('scroll', handleClose, true);
            window.removeEventListener('resize', handleClose);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (
                buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
                dropdownContentRef.current && !dropdownContentRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);
    
    const handleNavigate = (screen: RootScreen) => {
        onNavigate(screen);
        setIsOpen(false);
    };

    const dropdownContent = (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
                    onClick={() => setIsOpen(false)}
                >
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        ref={dropdownContentRef}
                        className="w-72 bg-surface rounded-md shadow-lg border border-border-default p-2 max-h-[calc(100vh-120px)] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {visibleNavItems.map(({ id, label, icon: Icon }) => (
                            <button key={id} onClick={() => handleNavigate(id)} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm ${activeScreen === id ? 'bg-primary/10 text-primary' : 'text-text-primary hover:bg-surface-soft'}`}>
                                <Icon className="h-5 w-5" />
                                <span>{label}</span>
                            </button>
                        ))}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <div>
            <button
                ref={buttonRef}
                onClick={handleToggle}
                className="flex items-center gap-2 text-lg sm:text-xl font-bold text-on-header hover:text-primary transition-colors"
            >
                <span>{activeScreenLabel}</span>
                <ChevronDownIcon className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && createPortal(dropdownContent, document.body)}
        </div>
    );
};

const RootHeader: React.FC<RootHeaderProps> = ({ onToggleSidebar, currentUser, activeScreen, onNavigate, sticky, onLogout }) => {
    const { appName, appLogo, brandColor } = useBranding();

    return (
        <header className={`flex-shrink-0 bg-header border-b border-border-default h-[var(--header-height)] flex items-center px-4 sm:px-6 lg:px-6 z-50 relative`}>
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4">
                    <button onClick={onToggleSidebar} className="p-2 text-on-header lg:hidden">
                        <Bars3Icon className="h-6 w-6" />
                    </button>
                    
                    {/* Branding */}
                    <div className="flex items-center gap-3 mr-6">
                         {appLogo && <img src={appLogo} alt="App Logo" className="h-8 w-8 object-contain shrink-0" />}
                         <h1 
                            className="text-xl font-bold hidden sm:block truncate"
                            style={{ color: brandColor || 'rgb(var(--color-on-header) / var(--opacity-header, 1))' }}
                        >
                            {appName}
                        </h1>
                    </div>
                    
                    <div className="hidden lg:block border-l border-on-header/10 pl-6">
                        <HeaderNavDropdown 
                            currentUser={currentUser}
                            activeScreen={activeScreen}
                            onNavigate={onNavigate}
                        />
                    </div>
                </div>
                <div className="lg:hidden">
                     <button 
                        onClick={onLogout} 
                        className="p-2 text-on-header hover:text-danger rounded-full transition-colors"
                        aria-label="Logout"
                    >
                        <PowerIcon className="h-6 w-6" />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default RootHeader;
