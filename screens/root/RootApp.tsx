
import React, { useState, lazy, Suspense } from 'react';
import RootSidebar from './RootSidebar';
import { User, UserSettings } from '../../types';
import { ThemeProvider } from '../../context/ThemeContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import RootHeader from './RootHeader';
import { useBranding } from '../../context/BrandingContext';

// Lazy load screens
const RootDashboardScreen = lazy(() => import('./RootDashboardScreen'));
const UserManagementScreen = lazy(() => import('./UserManagementScreen'));
const ActivityLogsScreen = lazy(() => import('./ActivityLogsScreen'));
const ErrorLogsScreen = lazy(() => import('./ErrorLogsScreen'));
const RootAppearanceScreen = lazy(() => import('./RootAppearanceScreen'));
const DataManagementScreen = lazy(() => import('./DataManagementScreen'));
const DuplicateManagementScreen = lazy(() => import('./DuplicateManagementScreen'));
const TrashBinScreen = lazy(() => import('./TrashBinScreen'));
const MyAccountScreen = lazy(() => import('../MyAccountScreen'));
const SecurityScreen = lazy(() => import('./SecurityScreen'));
const ReportsScreen = lazy(() => import('./ReportsScreen'));


export type RootScreen = 'dashboard' | 'users' | 'logs' | 'errors' | 'appearance' | 'data_management' | 'my_account' | 'security' | 'duplicates' | 'trash_bin' | 'reports';

interface RootAppProps {
  currentUser: User & UserSettings;
  onLogout: () => void;
  onLoginAs: (userToViewAs: User & UserSettings) => void;
}

const RootApp: React.FC<RootAppProps> = ({ currentUser, onLogout, onLoginAs }) => {
  const [activeScreen, setActiveScreen] = useState<RootScreen>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { stickyHeaderEnabled, animationStyle, pageLayout: defaultPageLayout } = useBranding();

  const animationClass = {
    fade: 'page-fade',
    slide: 'page-slide',
    none: '',
  }[animationStyle] || '';

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <RootDashboardScreen onNavigate={setActiveScreen} />;
      case 'users':
        return <UserManagementScreen currentUser={currentUser} onLoginAs={onLoginAs} />;
      case 'logs':
        return <ActivityLogsScreen currentUser={currentUser} />;
      case 'errors':
        return <ErrorLogsScreen />;
      case 'appearance':
        return <RootAppearanceScreen />;
      case 'data_management':
        return <DataManagementScreen />;
      case 'duplicates':
        return <DuplicateManagementScreen />;
      case 'trash_bin':
        return <TrashBinScreen />;
      case 'my_account':
        return <MyAccountScreen currentUser={currentUser} onLogout={onLogout} />;
      case 'security':
        return <SecurityScreen />;
      case 'reports':
        return <ReportsScreen />;
      default:
        return <RootDashboardScreen />;
    }
  };

  const effectivePageLayout = currentUser.pageLayout ?? defaultPageLayout;

  const getContainerClass = () => {
      switch (effectivePageLayout) {
          case 'wide': return 'max-w-screen-2xl mx-auto';
          case 'large': return 'max-w-[1400px] mx-auto';
          case 'boxed': return 'max-w-7xl mx-auto my-4 rounded-xl overflow-hidden border border-border-default shadow-2xl';
          case 'half': return 'max-w-[720px] mx-auto my-4 rounded-xl overflow-hidden border border-border-default shadow-2xl';
          case 'full': 
          default: return 'w-full';
      }
  };

  return (
       <div className="min-h-screen w-full bg-background-margin flex flex-col items-center">
           <div className={`h-screen flex flex-col bg-background text-text-primary w-full ${getContainerClass()}`}>
              <RootHeader
                  onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                  currentUser={currentUser}
                  onLogout={onLogout}
                  activeScreen={activeScreen}
                  onNavigate={setActiveScreen}
                  sticky={stickyHeaderEnabled}
              />
              
              <div className="flex flex-1 overflow-hidden relative w-full">
                   <RootSidebar
                    isOpen={isSidebarOpen}
                    setIsOpen={setIsSidebarOpen}
                    activeScreen={activeScreen}
                    onNavigate={setActiveScreen}
                    onLogout={onLogout}
                    currentUser={currentUser}
                  />
                  
                  <main className="flex-1 overflow-y-auto py-6 sm:py-8 lg:py-10 px-6 sm:px-8 lg:px-10 relative z-0 min-w-0 w-full">
                    <Suspense fallback={<LoadingSpinner />}>
                    <div key={activeScreen} className={`${animationClass} w-full`}>
                        {renderScreen()}
                    </div>
                    </Suspense>
                  </main>
              </div>
           </div>
       </div>
  );
};

export default RootApp;
