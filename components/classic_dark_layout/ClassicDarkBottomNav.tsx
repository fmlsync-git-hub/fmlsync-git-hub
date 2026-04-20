import React from 'react';
import { Screen, User, UserSettings } from '../../types';
import { getVisibleNavItems, mobileBottomNavItems, allNavItems } from '../../navigation';
import { useBranding } from '../../context/BrandingContext';

interface ClassicDarkBottomNavProps {
    currentUser: User & UserSettings;
    activeScreen: Screen;
    onNavigate: (screen: Screen) => void;
}

const ClassicDarkBottomNav: React.FC<ClassicDarkBottomNavProps> = ({ currentUser, activeScreen, onNavigate }) => {
    const { featureFlags } = useBranding();

    const { visibleMainNavItems, visibleSettingsNavItems, visibleToolsNavItems } = getVisibleNavItems(currentUser);
    
    const allVisibleForUser = new Set([
        ...visibleMainNavItems, 
        ...visibleSettingsNavItems, 
        ...visibleToolsNavItems
    ]
    .filter(item => featureFlags[item.id] !== false)
    .map(i => i.id));

    const userNavItems = allNavItems.filter(item => 
        mobileBottomNavItems.includes(item.id) && allVisibleForUser.has(item.id)
    );

    return (
        <div className="fixed bottom-0 left-0 right-0 h-20 bg-sidebar border-t border-border-default flex justify-around items-center shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.2)] z-30 lg:hidden">
            {userNavItems.map(item => {
                const isActive = activeScreen === item.id;
                return (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id as Screen)}
                        className={`flex flex-col items-center justify-center w-full h-full transition-colors duration-200 relative ${isActive ? 'text-primary' : 'text-on-sidebar/70 hover:text-primary'}`}
                    >
                        <item.icon className="h-7 w-7" />
                        {isActive && <div className="absolute bottom-3 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_theme(colors.primary)]"></div>}
                    </button>
                );
            })}
        </div>
    );
};

export default ClassicDarkBottomNav;