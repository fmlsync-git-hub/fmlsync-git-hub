
import React, { useState, lazy, Suspense } from 'react';
import { Sidebar } from './components/Sidebar';
import { useBranding } from './context/BrandingContext';
import TimezoneNotifier from './components/TimezoneNotifier';
import { User, UserSettings, Screen, Passenger } from './types';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Header } from './components/Header';
import { useLayout } from './context/LayoutContext';
import { SparklesIcon } from './components/icons/index';
import { GlobalPassengerDetailModal } from './components/GlobalPassengerDetailModal';
import { useCompanies } from './context/CompanyContext';

// Lazy load screens
const DashboardScreen = lazy(() => import('./screens/DashboardScreen'));
const MapDashboardScreen = lazy(() => import('./screens/MapDashboardScreen'));
const CompanyFlow = lazy(() => import('./screens/CompanyFlow'));
const TravelManagementScreen = lazy(() => import('./screens/TravelManagementScreen'));
const DocumentsScreen = lazy(() => import('./screens/DocumentsScreen'));
const EmailIngestionScreen = lazy(() => import('./screens/EmailIngestionScreen'));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen'));
const AppearanceScreen = lazy(() => import('./screens/AppearanceScreen'));
const TechnicalScreen = lazy(() => import('./screens/TechnicalScreen'));
const HelpScreen = lazy(() => import('./screens/HelpScreen'));
const NotificationsScreen = lazy(() => import('./screens/NotificationsScreen'));
const AdminUserManagementScreen = lazy(() => import('./screens/AdminUserManagementScreen'));
const MyAccountScreen = lazy(() => import('./screens/MyAccountScreen'));
const UIDesignerScreen = lazy(() => import('./screens/UIDesignerScreen'));
const AssistantChat = lazy(() => import('./components/AssistantChat'));


// Lazy load the new layout
const MobileBookingLayout = lazy(() => import('./layouts/MobileBookingLayout'));
const NeonLayout = lazy(() => import('./layouts/NeonLayout'));
const VibrantChatLayout = lazy(() => import('./layouts/VibrantChatLayout'));


interface MainAppProps {
  currentUser: User & UserSettings;
  onLogout: () => void;
}

const Watermark: React.FC = () => {
    const { appLogo, watermarkEnabled, watermarkLocation, watermarkOpacity, watermarkSize } = useBranding();

    if (!watermarkEnabled || watermarkLocation !== 'main' || !appLogo) {
        return null;
    }

    const watermarkStyle: React.CSSProperties = {
        width: `${watermarkSize}%`,
        height: `${watermarkSize}%`,
        opacity: watermarkOpacity,
    };
    
    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <div className="w-full h-full flex items-center justify-center" style={watermarkStyle}>
                <img src={appLogo} alt="Watermark" className="max-w-full max-h-full object-contain" />
            </div>
        </div>
    );
};


const MainApp: React.FC<MainAppProps> = ({ currentUser, onLogout }) => {
  const { layout } = useLayout();
  const { companies } = useCompanies();
  const [activeScreen, setActiveScreen] = useState<Screen>(
    currentUser.role === 'designer' ? 'ui_designer' : 'dashboard'
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { stickyHeaderEnabled, animationStyle, featureFlags, pageLayout } = useBranding();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [globallySelectedPassenger, setGloballySelectedPassenger] = useState<Passenger | null>(null);

  const handleShowPassengerDetails = (passenger: Passenger) => {
    setGloballySelectedPassenger(passenger);
  };

  const getCompanyName = (companyId: string) => companies.find(c => c.id === companyId)?.name || 'Unknown';


  const animationClass = {
    fade: 'page-fade',
    slide: 'page-slide',
    none: '',
  }[animationStyle] || '';

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <DashboardScreen onSelectPassenger={handleShowPassengerDetails} currentUser={currentUser} />;
      case 'live_map':
        return <MapDashboardScreen onSelectPassenger={handleShowPassengerDetails} currentUser={currentUser} />;
      case 'company_flow':
        return <CompanyFlow currentUser={currentUser} />;
      case 'travel':
        return <TravelManagementScreen currentUser={currentUser} />;
      case 'documents':
        return <DocumentsScreen currentUser={currentUser} />;
      case 'notifications':
        return <NotificationsScreen />;
      case 'technical':
        return <TechnicalScreen />;
      case 'user_management':
        return <AdminUserManagementScreen currentUser={currentUser} />;
      case 'my_account':
        return <MyAccountScreen currentUser={currentUser} onLogout={onLogout} onNavigate={setActiveScreen} />;
      case 'settings':
        return <SettingsScreen />;
      case 'appearance':
        return <AppearanceScreen />;
      case 'help':
        return <HelpScreen />;
      case 'ui_designer':
        return <UIDesignerScreen onLogout={onLogout} />;
      default:
        return <DashboardScreen onSelectPassenger={handleShowPassengerDetails} />;
    }
  };
  
  // Conditionally render the entire layout based on the context
  // The 'designer' role is a special case and should always use the default layout to access the designer tools,
  // regardless of which layout is currently active for other users.
  if (layout === 'mobile_booking' && currentUser.role !== 'designer') {
    return <MobileBookingLayout currentUser={currentUser} onLogout={onLogout} />;
  }
  
  if (layout === 'neon' && currentUser.role !== 'designer') {
    return <NeonLayout currentUser={currentUser} onLogout={onLogout} />;
  }

  if (layout === 'vibrantChat' && currentUser.role !== 'designer') {
    return <VibrantChatLayout currentUser={currentUser} onLogout={onLogout} />;
  }

  // Default layout
  // Added bg-background to ensure the application layer has its own background color, sitting on top of the body's margin pattern
  return (
    <div className={`flex h-full w-full bg-background text-on-background ${pageLayout === 'wide' ? 'max-w-screen-2xl mx-auto shadow-2xl' : pageLayout === 'large' ? 'max-w-[1400px] mx-auto shadow-2xl' : pageLayout === 'boxed' ? 'max-w-7xl mx-auto shadow-2xl my-4 rounded-xl overflow-hidden border border-border-default' : pageLayout === 'half' ? 'max-w-5xl mx-auto shadow-2xl my-4 rounded-xl overflow-hidden border border-border-default' : ''}`}>
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        activeScreen={activeScreen}
        onNavigate={setActiveScreen}
        onLogout={onLogout}
        currentUser={currentUser}
      />
      <div className="relative flex-1 grid grid-rows-[auto_1fr] h-full overflow-hidden transition-all duration-300 ease-in-out lg:ml-0">
        <Header
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            currentUser={currentUser}
            activeScreen={activeScreen}
            onNavigate={setActiveScreen}
            sticky={stickyHeaderEnabled}
            onLogout={onLogout}
            onSelectPassenger={handleShowPassengerDetails}
        />
        <div className="relative overflow-hidden flex flex-col">
            <Watermark />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative z-10">
                <Suspense fallback={<LoadingSpinner />}>
                  <div key={activeScreen} className={animationClass}>
                    {renderScreen()}
                  </div>
                </Suspense>
            </main>
            <TimezoneNotifier />
        </div>
      </div>
      
      {/* AI Assistant FAB */}
      {featureFlags.ai_assistant !== false && (
        <button 
          onClick={() => setIsAssistantOpen(true)}
          className="fixed bottom-6 right-6 bg-primary text-on-primary rounded-full p-4 shadow-lg hover:bg-primary-dark transition-all hover:scale-110 hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-primary/30 z-30"
          title="Open AI Assistant"
        >
          <SparklesIcon className="h-7 w-7" />
        </button>
      )}

      {/* AI Assistant Chat Modal */}
      <Suspense>
        {isAssistantOpen && (
            <AssistantChat 
                isOpen={isAssistantOpen}
                onClose={() => setIsAssistantOpen(false)}
                onSelectPassenger={handleShowPassengerDetails}
            />
        )}
      </Suspense>

      {/* Global Passenger Detail Modal */}
       {globallySelectedPassenger && (
          <GlobalPassengerDetailModal
              passenger={globallySelectedPassenger}
              onClose={() => setGloballySelectedPassenger(null)}
              companyName={getCompanyName(globallySelectedPassenger.companyId)}
          />
       )}
    </div>
  );
};

export default MainApp;
