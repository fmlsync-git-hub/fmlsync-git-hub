import React from 'react';
import { Screen } from '../../types';
import { allNavItems } from '../../navigation';

interface HealthAppHeaderProps {
    activeScreen: Screen;
}

const HealthAppHeader: React.FC<HealthAppHeaderProps> = ({ activeScreen }) => {
    const activeScreenLabel = allNavItems.find(item => item.id === activeScreen)?.label || 'Dashboard';

    return (
        <header className="flex-shrink-0 bg-header h-16 flex items-center px-6 sticky top-0 z-20 border-b border-border-default">
            <h1 className="text-xl font-bold text-on-header">{activeScreenLabel}</h1>
        </header>
    );
};

export default HealthAppHeader;