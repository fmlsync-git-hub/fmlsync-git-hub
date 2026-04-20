
import React, { lazy, Suspense, useState } from 'react';
import { User, UserSettings } from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import ClientSidebar from '../client/ClientSidebar';
import ClientHeader from '../client/ClientHeader';
import { useBranding } from '../../context/BrandingContext';

// We reuse the ClientDashboardScreen because it's a perfect fit for a read-only or limited view,
// but we wrap it in a specific Guest Context if needed.
const ClientDashboardScreen = lazy(() => import('../client/ClientDashboardScreen'));

interface GuestAppProps {
  currentUser: User & UserSettings;
  onLogout: () => void;
}

const GuestApp: React.FC<GuestAppProps> = ({ currentUser, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { stickyHeaderEnabled } = useBranding();

  // Hardcoded layout for guest to ensure consistency regardless of global settings
  const containerClass = 'max-w-7xl mx-auto shadow-2xl my-4 rounded-xl overflow-hidden border border-amber-500/30';

  return (
    <div className="min-h-screen w-full bg-[#0f172a] flex flex-col items-center">
        {/* Guest Mode Banner */}
        <div className="w-full bg-amber-600 text-white text-center text-sm font-bold py-2 px-4 shadow-md z-[60]">
            ⚠️ INTERACTIVE DEMO MODE — DATA IS RESET DAILY
        </div>

        <div className={`h-[calc(100vh-40px)] flex flex-col bg-background text-text-primary w-full ${containerClass}`}>
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
                
                <main className="flex-1 overflow-y-auto py-6 sm:py-8 lg:py-10 px-6 sm:px-8 lg:px-10 relative z-0 min-w-0 w-full bg-surface/30">
                    <Suspense fallback={<LoadingSpinner />}>
                        <div className="w-full">
                            <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-200 text-sm">
                                <h3 className="font-bold mb-1">Welcome to the Guest Experience</h3>
                                <p>You are viewing the application as a <strong>Client User</strong>. This dashboard allows clients to monitor their own personnel status, document compliance, and travel schedules in real-time.</p>
                            </div>
                            <ClientDashboardScreen currentUser={currentUser} />
                        </div>
                    </Suspense>
                </main>
            </div>
        </div>
    </div>
  );
};

export default GuestApp;
