
import React from 'react';
import { Screen, User, UserSettings } from './types';
import { HomeIcon, UsersIcon, TicketIcon, DocumentDuplicateIcon, Cog6ToothIcon, PaintBrushIcon, LinkIcon, QuestionMarkCircleIcon, BellIcon, ChartBarIcon, UserGroupIcon, UserCircleIcon, BuildingOfficeIcon, SwatchIcon, MapIcon, ChatBubbleLeftEllipsisIcon, ArrowPathIcon, CommandLineIcon } from './components/icons/index';

export interface NavItemConfig {
    id: Screen;
    label: string;
    icon: React.ElementType;
}

export const mainNavItems: NavItemConfig[] = [
    { id: 'dashboard', label: 'Home', icon: HomeIcon },
    { id: 'chat', label: 'Messaging', icon: ChatBubbleLeftEllipsisIcon },
    { id: 'live_map', label: 'Live Map', icon: MapIcon },
    { id: 'company_flow', label: 'Clients', icon: UsersIcon },
    { id: 'travel', label: 'Travel', icon: TicketIcon },
    { id: 'documents', label: 'Documents', icon: DocumentDuplicateIcon },
];

export const toolsNavItems: NavItemConfig[] = [
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'technical', label: 'Technical', icon: LinkIcon },
    { id: 'backend_diagnostic', label: 'Backend Diagnostic', icon: CommandLineIcon },
    { id: 'restore_points', label: 'Restore Points', icon: ArrowPathIcon },
    { id: 'ui_designer', label: 'Web App Builder', icon: SwatchIcon },
];

export const settingsNavItems: NavItemConfig[] = [
    { id: 'my_account', label: 'My Account', icon: UserCircleIcon },
    { id: 'user_management', label: 'User Management', icon: UserGroupIcon },
    { id: 'settings', label: 'Company Settings', icon: BuildingOfficeIcon },
    { id: 'appearance', label: 'Appearance', icon: PaintBrushIcon },
    { id: 'help', label: 'Help & FAQ', icon: QuestionMarkCircleIcon },
];

export const allNavItems = [...mainNavItems, ...toolsNavItems, ...settingsNavItems];

// Defines which items should be prioritized in the mobile bottom navigation bar.
export const mobileBottomNavItems: Screen[] = ['dashboard', 'chat', 'company_flow', 'travel', 'my_account'];

export const getVisibleNavItems = (currentUser: User & UserSettings) => {
    const { role, disabledMenus = [] } = currentUser;

    const allMainIDs = mainNavItems.map(i => i.id);
    const allToolsIDs = toolsNavItems.map(i => i.id);
    const allSettingsIDs = settingsNavItems.map(i => i.id);

    let allowedMain: Set<Screen> = new Set();
    let allowedTools: Set<Screen> = new Set();
    let allowedSettings: Set<Screen> = new Set();

    switch (role) {
        case 'developer':
        case 'app_manager':
            allowedMain = new Set(allMainIDs);
            allowedTools = new Set(allToolsIDs);
            allowedSettings = new Set(allSettingsIDs);
            break;
        case 'admin':
            allowedMain = new Set(allMainIDs);
            allowedTools = new Set(allToolsIDs.filter(id => id !== 'ui_designer' && id !== 'backend_diagnostic'));
            allowedSettings = new Set(allSettingsIDs);
            break;
        case 'officer':
            allowedMain = new Set(allMainIDs);
            allowedTools = new Set(allToolsIDs.filter(id => id !== 'ui_designer' && id !== 'restore_points' && id !== 'backend_diagnostic'));
            allowedSettings = new Set(['my_account', 'help']);
            break;
        case 'designer':
            allowedTools = new Set(['ui_designer']);
            allowedSettings = new Set(['appearance', 'my_account', 'help']);
            break;
        case 'client':
            // Clients have a custom UI, this is just a fallback.
            allowedSettings = new Set(['help']);
            break;
        default:
            // Safe default for unknown roles.
            allowedSettings = new Set(['help']);
            break;
    }

    const filterDisabled = (item: NavItemConfig) => !disabledMenus.includes(item.id);

    // Initial filtering
    let visibleMainNavItems = mainNavItems.filter(item => allowedMain.has(item.id) && filterDisabled(item));
    let visibleToolsNavItems = toolsNavItems.filter(item => allowedTools.has(item.id) && filterDisabled(item));
    let visibleSettingsNavItems = settingsNavItems.filter(item => allowedSettings.has(item.id) && filterDisabled(item));

    // Special handling for 'designer' role to make the UI Designer a top-level item
    if (currentUser.role === 'designer') {
        const uiDesignerItemIndex = visibleToolsNavItems.findIndex(item => item.id === 'ui_designer');
        if (uiDesignerItemIndex > -1) {
            // Extract the item from the tools list
            const [uiDesignerItem] = visibleToolsNavItems.splice(uiDesignerItemIndex, 1);
            // Add it to the main navigation list
            visibleMainNavItems.push(uiDesignerItem);
        }
    }
    
    return { visibleMainNavItems, visibleToolsNavItems, visibleSettingsNavItems };
};
