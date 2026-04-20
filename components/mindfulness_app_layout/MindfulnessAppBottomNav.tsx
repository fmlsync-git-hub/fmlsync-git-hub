import React from 'react';
import { Screen, User, UserSettings } from '../../types';
import { getVisibleNavItems, mobileBottomNavItems, allNavItems } from '../../navigation';
import { useBranding } from '../../context/BrandingContext';

interface MindfulnessAppBottomNavProps {
    currentUser: User & UserSettings;
    activeScreen: Screen;
    onNavigate: (screen: Screen) => void;
}

const MindfulnessAppBottomNav: React.FC<MindfulnessAppBottomNavProps> = ({ currentUser, activeScreen, onNavigate }) => {
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
                        className={`flex flex-col items-center justify-center w-full h-full transition-colors duration-200 relative ${isActive ? 'text-primary' : 'text-text-secondary hover:text-primary'}`}
                    >
                        <div className={`p-1 rounded-full transition-transform transform ${isActive ? 'scale-110' : 'scale-100'}`}>
                           <item.icon className="h-7 w-7" />
                        </div>
                        <span className={`text-xs font-semibold mt-1 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}>{item.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default MindfulnessAppBottomNav;