
import React, { lazy, Suspense, useState } from 'react';
import { User, UserSettings } from '../../types';
import ClientSidebar from './ClientSidebar';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import ClientHeader from './ClientHeader';
import { useBranding } from '../../context/BrandingContext';

const ClientDashboardScreen = lazy(() => import('./ClientDashboardScreen'));
const NewPassengerScreen = lazy(() => import('../NewPassengerScreen'));

interface ClientAppProps {
  currentUser: User & UserSettings;
  onLogout: () => void;
}

const ClientApp: React.FC<ClientAppProps> = ({ currentUser, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'new_passenger'>('dashboard');
  const { stickyHeaderEnabled, pageLayout: defaultPageLayout } = useBranding();

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
             <ClientHeader
                  onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                  onLogout={onLogout}
                  sticky={stickyHeaderEnabled}
                  currentUser={currentUser}
              />
            <div className="flex flex-1 overflow-hidden relative w-full">
                <ClientSidebar 
                  isOpen={isSidebarOpen}
                  setIsOpen={setIsSidebarOpen}
                  currentUser={currentUser} 
                  onLogout={onLogout} 
                />
                
                <main className="flex-1 overflow-y-auto py-6 sm:py-8 lg:py-10 px-6 sm:px-8 lg:px-10 relative z-0 min-w-0 w-full">
                    <Suspense fallback={<LoadingSpinner />}>
                        <div className="w-full">
                            {activeScreen === 'dashboard' ? (
                                <ClientDashboardScreen 
                                    currentUser={currentUser} 
                                    onAddNew={() => setActiveScreen('new_passenger')} 
                                />
                            ) : (
                                <NewPassengerScreen 
                                    company={{ id: currentUser.companyId || 'spie', name: currentUser.companyId?.toUpperCase() || 'SPIE', logo: 'https://picsum.photos/seed/spie/200/200' } as any} 
                                    onBack={() => setActiveScreen('dashboard')} 
                                    onSave={() => setActiveScreen('dashboard')} 
                                    currentUser={currentUser} 
                                />
                            )}
                        </div>
                    </Suspense>
                </main>
            </div>
        </div>
    </div>
  );
};

export default ClientApp;
