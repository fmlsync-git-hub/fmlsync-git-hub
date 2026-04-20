import React from 'react';
import { Screen } from '../../types';
import { allNavItems } from '../../navigation';

interface FinanceAppHeaderProps {
    activeScreen: Screen;
}

const FinanceAppHeader: React.FC<FinanceAppHeaderProps> = ({ activeScreen }) => {
    const activeScreenLabel = allNavItems.find(item => item.id === activeScreen)?.label || 'Dashboard';

    return (
        <header className="flex-shrink-0 bg-primary text-on-primary h-28 flex items-end p-6 sticky top-0 z-20 rounded-b-3xl shadow-lg">
            <h1 className="text-3xl font-bold tracking-tight text-on-header">{activeScreenLabel}</h1>
        </header>
    );
};

export default FinanceAppHeader;