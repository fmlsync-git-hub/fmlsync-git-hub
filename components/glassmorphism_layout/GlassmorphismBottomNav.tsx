import React from 'react';
import { Screen, User, UserSettings } from '../../types';
import { getVisibleNavItems, NavItemConfig, mobileBottomNavItems, allNavItems } from '../../navigation';
import { useBranding } from '../../context/BrandingContext';

interface GlassmorphismBottomNavProps {
    currentUser: User & UserSettings;
    activeScreen: Screen;
    onNavigate: (screen: Screen) => void;
}

const GlassmorphismBottomNav: React.FC<GlassmorphismBottomNavProps> = ({ currentUser, activeScreen, onNavigate }) => {
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
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md h-16 bg-surface/80 backdrop-blur-lg border border-border-default/50 flex justify-around items-center rounded-2xl shadow-2xl z-30 lg:hidden">
            {userNavItems.map(item => {
                const isActive = activeScreen === item.id;
                return (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id as Screen)}
                        className={`flex flex-col items-center justify-center w-full h-full transition-colors duration-200 relative ${isActive ? 'text-primary' : 'text-text-secondary hover:text-primary'}`}
                    >
                        <item.icon className="h-6 w-6" />
                        <span className={`text-xs font-bold transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0'}`}>{item.label}</span>
                         {isActive && <div className="absolute bottom-1.5 w-1.5 h-1.5 bg-primary rounded-full"></div>}
                    </button>
                );
            })}
        </div>
    );
};

export default GlassmorphismBottomNav;