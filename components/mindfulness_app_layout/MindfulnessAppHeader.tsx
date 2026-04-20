import React from 'react';
import { Screen } from '../../types';
import { allNavItems } from '../../navigation';

interface MindfulnessAppHeaderProps {
    activeScreen: Screen;
}

const MindfulnessAppHeader: React.FC<MindfulnessAppHeaderProps> = ({ activeScreen }) => {
    const activeScreenLabel = allNavItems.find(item => item.id === activeScreen)?.label || 'Dashboard';

    return (
        <header className="flex-shrink-0 bg-header h-20 flex items-center px-6 sticky top-0 z-20">
            <h1 className="text-3xl font-bold text-on-header">{activeScreenLabel}</h1>
        </header>
    );
};

export default MindfulnessAppHeader;