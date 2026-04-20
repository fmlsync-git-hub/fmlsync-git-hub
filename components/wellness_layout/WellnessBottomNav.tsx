import React from 'react';
import { Screen, User, UserSettings } from '../../types';
import { getVisibleNavItems, NavItemConfig, mobileBottomNavItems, allNavItems } from '../../navigation';
import { useBranding } from '../../context/BrandingContext';

interface WellnessBottomNavProps {
    currentUser: User & UserSettings;
    activeScreen: Screen;
    onNavigate: (screen: Screen) => void;
}

const WellnessBottomNav: React.FC<WellnessBottomNavProps> = ({ currentUser, activeScreen, onNavigate }) => {
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
        <div className="fixed bottom-0 left-0 right-0 h-20 bg-surface border-t border-border-default flex justify-around items-center shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)] z-30 lg:hidden">
            {userNavItems.map(item => {
                const isActive = activeScreen === item.id;
                return (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id as Screen)}
                        className={`flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${isActive ? 'text-primary' : 'text-text-secondary hover:text-primary'}`}
                    >
                        <item.icon className="h-7 w-7 mb-1" />
                        <span className="text-xs font-semibold">{item.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default WellnessBottomNav;