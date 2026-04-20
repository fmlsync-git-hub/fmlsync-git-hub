import React, { lazy, Suspense } from 'react';
import { Screen, Passenger } from '../../types';
import { allNavItems } from '../../navigation';

const GlobalPersonnelSearch = lazy(() => import('../GlobalPersonnelSearch'));

interface WellnessHeaderProps {
    activeScreen: Screen;
    onSelectPassenger: (passenger: Passenger) => void;
}

const WellnessHeader: React.FC<WellnessHeaderProps> = ({ activeScreen, onSelectPassenger }) => {
    const activeScreenLabel = allNavItems.find(item => item.id === activeScreen)?.label || 'Dashboard';

    return (
        <header className="hidden lg:flex flex-shrink-0 bg-header/80 backdrop-blur-sm border-b border-border-default h-20 items-center px-6 sticky top-0 z-20">
            <div className="flex items-center justify-between w-full">
                <h1 className="text-2xl font-bold text-on-header tracking-wide">{activeScreenLabel}</h1>
                
                <div className="w-full max-w-lg">
                    <Suspense fallback={null}>
                         <GlobalPersonnelSearch onSelectPassenger={onSelectPassenger} />
                    </Suspense>
                </div>
            </div>
        </header>
    );
};

export default WellnessHeader;