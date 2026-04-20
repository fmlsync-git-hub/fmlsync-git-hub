
import React, { lazy, Suspense } from 'react';
import { User, UserSettings } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';

const SummaryDashboardScreen = lazy(() => import('../screens/SummaryDashboardScreen'));

interface HeadsUpLayoutProps {
  currentUser: User & UserSettings;
  onLogout: () => void;
}

const HeadsUpLayout: React.FC<HeadsUpLayoutProps> = ({ currentUser, onLogout }) => {
  return (
    <div className="h-screen w-full bg-[#13131a] text-gray-100 overflow-hidden relative">
      <Suspense fallback={<LoadingSpinner fullScreen style="dots" />}>
        {/* Pass currentUser and onLogout to ensure functionality */}
        <SummaryDashboardScreen currentUser={currentUser} onLogout={onLogout} />
      </Suspense>
    </div>
  );
};

export default HeadsUpLayout;
