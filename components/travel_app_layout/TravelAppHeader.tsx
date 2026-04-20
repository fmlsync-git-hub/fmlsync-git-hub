import React from 'react';
import { Screen } from '../../types';
import { allNavItems } from '../../navigation';

interface TravelAppHeaderProps {
    activeScreen: Screen;
}

const TravelAppHeader: React.FC<TravelAppHeaderProps> = ({ activeScreen }) => {
    const activeScreenLabel = allNavItems.find(item => item.id === activeScreen)?.label || 'Dashboard';

    return (
        <header className="flex-shrink-0 bg-header text-on-header h-16 flex items-center px-6 sticky top-0 z-20 shadow-md">
            <h1 className="text-xl font-bold tracking-wide">{activeScreenLabel}</h1>
        </header>
    );
};

export default TravelAppHeader;