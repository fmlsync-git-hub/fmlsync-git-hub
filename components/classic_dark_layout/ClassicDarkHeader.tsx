import React from 'react';
import { Screen } from '../../types';
import { allNavItems } from '../../navigation';

interface ClassicDarkHeaderProps {
    activeScreen: Screen;
}

const ClassicDarkHeader: React.FC<ClassicDarkHeaderProps> = ({ activeScreen }) => {
    const activeScreenLabel = allNavItems.find(item => item.id === activeScreen)?.label || 'Dashboard';

    return (
        <header className="flex-shrink-0 bg-header h-16 flex items-center px-6 sticky top-0 z-20 border-b border-border-default">
            <h1 className="text-xl font-semibold text-on-header">{activeScreenLabel}</h1>
        </header>
    );
};

export default ClassicDarkHeader;