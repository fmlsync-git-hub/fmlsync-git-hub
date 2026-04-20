import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';

export type LayoutName = 'default' | 'mobile_booking' | 'neon' | 'vibrantChat' | 'wellness' | 'glassmorphism' | 'travelApp' | 'financeApp' | 'healthApp' | 'mindfulnessApp' | 'classicDark';

interface LayoutContextType {
  layout: LayoutName;
  isMobile: boolean;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
};

interface LayoutProviderProps {
  children: React.ReactNode;
  userLayout?: LayoutName;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children, userLayout }) => {
  const isMobile = useIsMobile();
  const [layout, setLayout] = useState<LayoutName>(userLayout || 'default');
  
  useEffect(() => {
    setLayout(userLayout || 'default');
  }, [userLayout]);

  // Apply a class to the body for layout-specific global styles
  useEffect(() => {
    const body = document.body;
    // Remove previous layout classes
    const layoutClasses = ['layout-booking', 'layout-neon', 'layout-vibrant-chat', 'layout-wellness', 'layout-glassmorphism', 'layout-travel-app', 'layout-finance-app', 'layout-health-app', 'layout-mindfulness-app', 'layout-classic-dark'];
    body.classList.remove(...layoutClasses);

    // Add current layout class
    if (layout === 'mobile_booking') {
        body.classList.add('layout-booking');
    } else if (layout === 'neon') {
        body.classList.add('layout-neon');
    } else if (layout === 'vibrantChat') {
        body.classList.add('layout-vibrant-chat');
    } else if (layout === 'wellness') {
        body.classList.add('layout-wellness');
    } else if (layout === 'glassmorphism') {
        body.classList.add('layout-glassmorphism');
    } else if (layout === 'travelApp') {
        body.classList.add('layout-travel-app');
    } else if (layout === 'financeApp') {
        body.classList.add('layout-finance-app');
    } else if (layout === 'healthApp') {
        body.classList.add('layout-health-app');
    } else if (layout === 'mindfulnessApp') {
        body.classList.add('layout-mindfulness-app');
    } else if (layout === 'classicDark') {
        body.classList.add('layout-classic-dark');
    }
  }, [layout]);


  const value = useMemo(() => ({ 
      layout,
      isMobile,
  }), [layout, isMobile]);

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = (): LayoutContextType => {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};