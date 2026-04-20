import React, { lazy, Suspense } from 'react';
import { Screen, Passenger } from '../../types';
import { allNavItems } from '../../navigation';

const GlobalPersonnelSearch = lazy(() => import('../GlobalPersonnelSearch'));

interface GlassmorphismHeaderProps {
    activeScreen: Screen;
    onSelectPassenger: (passenger: Passenger) => void;
}

const GlassmorphismHeader: React.FC<GlassmorphismHeaderProps> = ({ activeScreen, onSelectPassenger }) => {
    const activeScreenLabel = allNavItems.find(item => item.id === activeScreen)?.label || 'Dashboard';

    return (
        <header className="hidden lg:flex flex-shrink-0 bg-surface/60 backdrop-blur-xl border-b border-border-default/30 h-20 items-center px-6 sticky top-0 z-20">
            <div className="flex items-center justify-between w-full">
                <h1 className="text-2xl font-bold text-on-background tracking-wide">{activeScreenLabel}</h1>
                
                <div className="w-full max-w-lg">
                    <Suspense fallback={null}>
                         <GlobalPersonnelSearch onSelectPassenger={onSelectPassenger} />
                    </Suspense>
                </div>
            </div>
        </header>
    );
};

export default GlassmorphismHeader;