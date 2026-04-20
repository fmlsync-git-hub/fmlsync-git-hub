
import React, { useState, lazy, Suspense } from 'react';
import { User, UserSettings, Screen, Passenger } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useBranding } from '../context/BrandingContext';
import { SparklesIcon } from '../components/icons/index';
import { GlobalPassengerDetailModal } from '../components/GlobalPassengerDetailModal';
import { useCompanies } from '../context/CompanyContext';
import HealthAppHeader from '../components/health_app_layout/HealthAppHeader';
import HealthAppBottomNav from '../components/health_app_layout/HealthAppBottomNav';

// Lazy load all standard screens
const DashboardScreen = lazy(() => import('../screens/DashboardScreen'));
const MapDashboardScreen = lazy(() => import('../screens/MapDashboardScreen'));
const CompanyFlow = lazy(() => import('../screens/CompanyFlow'));
const TravelManagementScreen = lazy(() => import('../screens/TravelManagementScreen'));
const DocumentsScreen = lazy(() => import('../screens/DocumentsScreen'));
const NotificationsScreen = lazy(() => import('../screens/NotificationsScreen'));
const TechnicalScreen = lazy(() => import('../screens/TechnicalScreen'));
const AdminUserManagementScreen = lazy(() => import('../screens/AdminUserManagementScreen'));
const MyAccountScreen = lazy(() => import('../screens/MyAccountScreen'));
const SettingsScreen = lazy(() => import('../screens/SettingsScreen'));
const AppearanceScreen = lazy(() => import('../screens/AppearanceScreen'));
const HelpScreen = lazy(() => import('../screens/HelpScreen'));
const UIDesignerScreen = lazy(() => import('../screens/UIDesignerScreen'));
const AssistantChat = lazy(() => import('../components/AssistantChat'));

interface HealthAppLayoutProps {
  currentUser: User & UserSettings;
  onLogout: () => void;
}

const HealthAppLayout: React.FC<HealthAppLayoutProps> = ({ currentUser, onLogout }) => {
  const { companies } = useCompanies();
  const { animationStyle, featureFlags, pageLayout } = useBranding();
  
  const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');
  
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [globallySelectedPassenger, setGloballySelectedPassenger] = useState<Passenger | null>(null);
  const [editTargetPassenger, setEditTargetPassenger] = useState<Passenger | null>(null);

  const handleShowPassengerDetails = (passenger: Passenger) => {
    setGloballySelectedPassenger(passenger);
  };
  
  const handleEditPassenger = (passenger: Passenger) => {
      setGloballySelectedPassenger(null);
      setEditTargetPassenger(passenger);
      setActiveScreen('company_flow');
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
        return <CompanyFlow currentUser={currentUser} initialPassenger={editTargetPassenger} />;
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
        return <DashboardScreen onSelectPassenger={handleShowPassengerDetails} currentUser={currentUser} />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-background-margin flex flex-col items-center">
        <div className={`h-screen w-full flex flex-col bg-background text-on-background ${pageLayout === 'wide' ? 'max-w-screen-2xl mx-auto shadow-2xl' : pageLayout === 'large' ? 'max-w-[1400px] mx-auto shadow-2xl' : pageLayout === 'boxed' ? 'max-w-7xl mx-auto shadow-2xl my-4 rounded-xl overflow-hidden border border-border-default' : pageLayout === 'half' ? 'max-w-[720px] mx-auto shadow-2xl my-4 rounded-xl overflow-hidden border border-border-default' : ''}`}>
            
            <HealthAppHeader 
            activeScreen={activeScreen}
            />
            
            <main className="flex-1 overflow-y-auto py-4 sm:py-6 lg:py-8 pb-24 lg:pb-8 w-full min-w-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <Suspense fallback={<LoadingSpinner />}>
                <div key={activeScreen} className={`${animationClass} w-full`}>
                    {renderScreen()}
                </div>
                </Suspense>
            </div>
            </main>

            <HealthAppBottomNav 
            currentUser={currentUser}
            activeScreen={activeScreen}
            onNavigate={(screen) => { setActiveScreen(screen); setEditTargetPassenger(null); }}
            />

            {/* AI Assistant FAB - Restricted */}
            {(currentUser.role === 'developer' || currentUser.role === 'app_manager') && featureFlags.ai_assistant !== false && (
            <button 
                onClick={() => setIsAssistantOpen(true)}
                className="fixed bottom-24 right-6 lg:bottom-6 bg-primary text-white rounded-full p-4 shadow-lg hover:bg-primary-dark transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary z-30"
                title="Open AI Assistant"
            >
                <SparklesIcon className="h-7 w-7" />
            </button>
            )}

            <Suspense>
            {isAssistantOpen && (
                <AssistantChat 
                    isOpen={isAssistantOpen}
                    onClose={() => setIsAssistantOpen(false)}
                    onSelectPassenger={handleShowPassengerDetails}
                />
            )}
            </Suspense>

            {globallySelectedPassenger && (
                <GlobalPassengerDetailModal
                    passenger={globallySelectedPassenger}
                    onClose={() => setGloballySelectedPassenger(null)}
                    onEdit={handleEditPassenger}
                    companyName={getCompanyName(globallySelectedPassenger.companyId)}
                />
            )}
        </div>
    </div>
  );
};
export default HealthAppLayout;
