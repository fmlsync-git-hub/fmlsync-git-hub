import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Bars3Icon, ChevronDownIcon, PowerIcon, BellIcon } from './icons';
import { User, UserSettings, Screen, Passenger } from '../types';
import { allNavItems, getVisibleNavItems } from '../navigation';
import { useBranding } from '../context/BrandingContext';
import { NotificationCenter } from './NotificationCenter';

const GlobalPersonnelSearch = lazy(() => import('./GlobalPersonnelSearch'));

interface HeaderProps {
    onToggleSidebar: () => void;
    currentUser: User & UserSettings;
    activeScreen: Screen;
    onNavigate: (screen: Screen) => void;
    sticky: boolean;
    onLogout: () => void;
    onSelectPassenger: (passenger: Passenger) => void;
}

const HeaderNavDropdown: React.FC<{
    currentUser: User & UserSettings;
    activeScreen: Screen;
    onNavigate: (screen: Screen) => void;
}> = ({ currentUser, activeScreen, onNavigate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownContentRef = useRef<HTMLDivElement>(null);
    const { featureFlags } = useBranding();

    const { visibleMainNavItems, visibleToolsNavItems, visibleSettingsNavItems } = getVisibleNavItems(currentUser);
    const activeScreenLabel = allNavItems.find(item => item.id === activeScreen)?.label || 'Menu';
    
    const finalVisibleMainNavItems = visibleMainNavItems.filter(item => featureFlags[item.id] !== false);
    const finalVisibleToolsNavItems = visibleToolsNavItems.filter(item => featureFlags[item.id] !== false);
    const finalVisibleSettingsNavItems = visibleSettingsNavItems.filter(item => featureFlags[item.id] !== false);

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    useEffect(() => {
        if (isOpen && dropdownContentRef.current) {
            dropdownContentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
    }, [isOpen]);

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
    
    const handleNavigate = (screen: Screen) => {
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
                    className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
                    onClick={() => setIsOpen(false)}
                >
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        ref={dropdownContentRef}
                        className="w-72 bg-surface rounded-md shadow-lg border border-border-default p-2 max-h-[calc(100vh-120px)] overflow-y-auto pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-2 py-1 text-xs font-semibold text-text-secondary">Main Menu</div>
                        {finalVisibleMainNavItems.map(({ id, label, icon: Icon }) => (
                            <button key={id} onClick={() => handleNavigate(id)} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm ${activeScreen === id ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-surface-soft'}`}>
                                <Icon className="h-5 w-5" />
                                <span>{label}</span>
                            </button>
                        ))}
                        <div className="px-2 py-1 mt-2 text-xs font-semibold text-text-secondary">Tools</div>
                        {finalVisibleToolsNavItems.map(({ id, label, icon: Icon }) => (
                            <button key={id} onClick={() => handleNavigate(id)} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm ${activeScreen === id ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-surface-soft'}`}>
                                <Icon className="h-5 w-5" />
                                <span>{label}</span>
                            </button>
                        ))}
                        <div className="px-2 py-1 mt-2 text-xs font-semibold text-text-secondary">Settings</div>
                        {finalVisibleSettingsNavItems.map(({ id, label, icon: Icon }) => (
                            <button key={id} onClick={() => handleNavigate(id)} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm ${activeScreen === id ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-surface-soft'}`}>
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


export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, currentUser, activeScreen, onNavigate, sticky, onLogout, onSelectPassenger }) => {
    const { appName, appLogo, brandColor, headerHeight: defaultHeaderHeight } = useBranding();

    // Use user-specific override if present, else fallback to global default
    const effectiveHeaderHeight = currentUser.headerHeight ?? defaultHeaderHeight;

    return (
        <header 
            className={`flex-shrink-0 bg-header border-b border-border-default flex items-center px-4 sm:px-6 z-10 relative shadow-sm transition-all duration-300`}
            style={{ height: `${effectiveHeaderHeight}px` }}
        >
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4">
                    <button onClick={onToggleSidebar} className="p-2 text-on-header lg:hidden">
                        <Bars3Icon className="h-6 w-6" />
                    </button>

                    {/* Branding Section */}
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
                
                <div className="hidden lg:flex items-center gap-2 w-full max-w-lg">
                    <NotificationCenter currentUser={currentUser} />
                    <Suspense fallback={null}>
                         <GlobalPersonnelSearch onSelectPassenger={onSelectPassenger} currentUser={currentUser} />
                    </Suspense>
                </div>

                <div className="lg:hidden flex items-center gap-2">
                     <NotificationCenter currentUser={currentUser} />
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
