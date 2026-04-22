
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { CompanyProvider } from './context/CompanyContext';
import { BrandingProvider, useBranding } from './context/BrandingContext';
import { DateTimeProvider } from './context/DateTimeContext';
import { LayoutProvider } from './context/LayoutContext';
import { DEFAULT_USERS } from './services/users';
import { User, UserSettings, UserRole } from './types';
import { ArrowUturnLeftIcon } from './components/icons';
import ErrorBoundary from './components/ErrorBoundary';
import { LoadingSpinner } from './components/LoadingSpinner';
import { NotificationService } from './services/notificationService';

const LoginScreen = lazy(() => import('./screens/LoginScreen'));
const MainApp = lazy(() => import('./screens/MainApp'));
const RootApp = lazy(() => import('./screens/root/RootApp'));
const ClientApp = lazy(() => import('./screens/client/ClientApp'));
const HeadsUpLayout = lazy(() => import('./layouts/HeadsUpLayout'));

// Dedicated Splash Screen Component
const SplashScreen: React.FC = () => {
    const branding = useBranding();
    
    // Fallback if branding is not yet loaded or context is missing
    const splashLogo = branding?.splashLogo;
    const spinnerStyle = branding?.spinnerStyle || 'pulse';
    const loginSettings = branding?.loginSettings || { backgroundColor: '#0f172a', accentColor: '#6366f1' };

    const renderMedia = () => {
        if (!splashLogo) return null;
        
        // Simple check for video extensions or data URI types
        const isVideo = typeof splashLogo === 'string' && (
                        splashLogo.startsWith('data:video') || 
                        splashLogo.endsWith('.mp4') || 
                        splashLogo.endsWith('.webm') ||
                        splashLogo.endsWith('.mov')
        );

        if (isVideo) {
            return (
                <video src={splashLogo} autoPlay loop muted playsInline className="max-w-xs max-h-64 mb-8 object-contain rounded-lg shadow-lg"></video>
            );
        }
        return (
            <img src={splashLogo} alt="Loading..." className="max-w-xs max-h-64 mb-8 object-contain animate-pulse" />
        );
    };

    const containerStyle: React.CSSProperties = {
        backgroundColor: loginSettings.backgroundColor,
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center transition-opacity duration-500" style={containerStyle}>
            {renderMedia()}
            <LoadingSpinner style={spinnerStyle} color={loginSettings.accentColor} />
        </div>
    );
};

const ViewingAsBanner: React.FC<{ user: User, onStop: () => void }> = ({ user, onStop }) => (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-amber-500 text-amber-900 px-6 py-3 rounded-full shadow-2xl z-[9999] flex items-center gap-4 animate-slideUp border-2 border-amber-600">
        <div className="flex flex-col">
            <span className="text-xs font-bold uppercase opacity-80">Viewing System As</span>
            <span className="font-bold text-sm">{user.username} ({user.role})</span>
        </div>
        <button 
            onClick={onStop} 
            className="bg-white/20 hover:bg-white/40 text-amber-950 p-2 rounded-full transition-colors"
            title="Return to my account"
        >
            <ArrowUturnLeftIcon className="h-5 w-5" />
        </button>
    </div>
);


const AppContent: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<(User & UserSettings) | null>(null);
  const [viewingAsUser, setViewingAsUser] = useState<(User & UserSettings) | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showSplash, setShowSplash] = useState(false); // Disable splash screen

  useEffect(() => {
    // Initialize notification service worker
    NotificationService.init();

    // Authentication Initialization - Forced to Login Screen every load
    const initialize = async () => {
        // We explicitly don't load from localStorage here to satisfy the requirement
        // of showing the login page every single time the app starts.
        
        // localStorage.removeItem('fml_current_user'); // Optional: truly clear it
        setIsInitializing(false);
    };

    initialize();
  }, []);
  
  const handleLogout = async () => {
    localStorage.removeItem('fml_current_user');
    setCurrentUser(null);
    setViewingAsUser(null);
  };
  
  const handleLoginAs = (userToViewAs: User & UserSettings) => {
    if (currentUser?.role === 'developer' || currentUser?.role === 'app_manager') {
        setViewingAsUser(userToViewAs);
    }
  };

  const handleStopViewingAs = () => {
     if ((currentUser?.role === 'developer' || currentUser?.role === 'app_manager') && viewingAsUser) {
        setViewingAsUser(null);
     }
  };

  const effectiveUser = viewingAsUser || currentUser;

  if (isInitializing || showSplash) {
      return <SplashScreen />;
  }

  if (!currentUser) {
      return <LoginScreen onLogin={(user: User & UserSettings) => {
          localStorage.setItem('fml_current_user', JSON.stringify(user));
          setCurrentUser(user);
      }} />;
  }
  
  const renderApp = () => {
      if ((currentUser.role === 'developer' || currentUser.role === 'app_manager') && !viewingAsUser) {
          return <RootApp currentUser={currentUser} onLogout={handleLogout} onLoginAs={handleLoginAs} />;
      }

      if (effectiveUser?.role === 'dashboard_only') {
          return <HeadsUpLayout currentUser={effectiveUser} onLogout={handleLogout} />;
      }

      if (effectiveUser) {
          const themeStorageKey = (effectiveUser.role === 'developer' || effectiveUser.role === 'app_manager' || effectiveUser.role === 'designer') ? 'developerTheme' : 'theme';
          
          const AppToRender = () => {
            if (effectiveUser.role === 'client') {
                return <ClientApp currentUser={effectiveUser} onLogout={handleLogout} />;
            }
            return (
                <div className="flex flex-col h-screen">
                    <MainApp 
                        currentUser={effectiveUser}
                        onLogout={handleLogout}
                    />
                </div>
            );
          };

          return (
            <ThemeProvider storageKey={themeStorageKey} userLayout={effectiveUser.layout}>
                <LayoutProvider userLayout={effectiveUser.layout}>
                    <AppToRender />
                </LayoutProvider>
            </ThemeProvider>
          );
      }
      return <LoginScreen onLogin={(user: User & UserSettings) => {
          localStorage.setItem('fml_current_user', JSON.stringify(user));
          setCurrentUser(user);
      }} />;
  }

  return (
      <>
        {renderApp()}
        {viewingAsUser && (
            <ViewingAsBanner user={viewingAsUser} onStop={handleStopViewingAs} />
        )}
      </>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
        <BrandingProvider>
            <CompanyProvider>
                <DateTimeProvider>
                    <LayoutProvider>
                        <div className="min-h-screen bg-background font-sans">
                            <ErrorBoundary>
                                <Suspense fallback={<SplashScreen />}>
                                    <AppContent />
                                </Suspense>
                            </ErrorBoundary>
                        </div>
                    </LayoutProvider>
                </DateTimeProvider>
            </CompanyProvider>
        </BrandingProvider>
    </ThemeProvider>
  );
};

export default App;
