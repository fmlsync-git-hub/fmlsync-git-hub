
import React, { lazy, Suspense } from 'react';
import { Bars3Icon } from '../icons';
import { Screen, Passenger, User, UserSettings } from '../../types';
import { allNavItems } from '../../navigation';

const GlobalPersonnelSearch = lazy(() => import('../GlobalPersonnelSearch'));

interface NeonHeaderProps {
    onToggleSidebar: () => void;
    activeScreen: Screen;
    onSelectPassenger: (passenger: Passenger) => void;
    currentUser: User & UserSettings;
}

const NeonHeader: React.FC<NeonHeaderProps> = ({ onToggleSidebar, activeScreen, onSelectPassenger, currentUser }) => {
    const activeScreenLabel = allNavItems.find(item => item.id === activeScreen)?.label || 'Dashboard';

    return (
        <header className="flex-shrink-0 bg-header/30 backdrop-blur-xl border-b border-primary/20 h-[var(--header-height)] flex items-center px-4 sm:px-6 sticky top-0 z-20">
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4">
                    <button onClick={onToggleSidebar} className="p-2 text-on-header/80 lg:hidden">
                        <Bars3Icon className="h-7 w-7" />
                    </button>
                    <h1 className="text-2xl font-bold text-on-header tracking-wider">{activeScreenLabel}</h1>
                </div>

                <div className="hidden lg:block w-full max-w-lg">
                    <Suspense fallback={null}>
                         <GlobalPersonnelSearch onSelectPassenger={onSelectPassenger} currentUser={currentUser} />
                    </Suspense>
                </div>
            </div>
        </header>
    );
};

export default NeonHeader;
