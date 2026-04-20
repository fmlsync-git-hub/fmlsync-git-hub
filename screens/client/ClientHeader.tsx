
import React from 'react';
import { Bars3Icon, PowerIcon } from '../../components/icons';
import { useBranding } from '../../context/BrandingContext';
import { useCompanies } from '../../context/CompanyContext';
import { User, UserSettings } from '../../types';

interface ClientHeaderProps {
    onToggleSidebar: () => void;
    onLogout: () => void;
    sticky: boolean;
    currentUser?: User & UserSettings;
}

const ClientHeader: React.FC<ClientHeaderProps> = ({ onToggleSidebar, onLogout, sticky, currentUser }) => {
     const { appName, appLogo, brandColor } = useBranding();
     const { companies } = useCompanies();
     
     // Logic to get client branding if available
     const clientCompany = currentUser?.companyId ? companies.find(c => c.id === currentUser.companyId) : null;
     const displayLogo = clientCompany?.logo && typeof clientCompany.logo === 'string' ? clientCompany.logo : appLogo;
     const displayName = clientCompany?.name || appName;

    return (
        <header className={`flex-shrink-0 bg-header border-b border-border-default h-[var(--header-height)] flex items-center px-4 sm:px-6 lg:px-6 z-50 relative`}>
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4">
                    <button onClick={onToggleSidebar} className="p-2 text-on-header lg:hidden">
                        <Bars3Icon className="h-6 w-6" />
                    </button>
                    
                    <div className="flex items-center gap-3">
                         {displayLogo && <img src={displayLogo} alt="Logo" className="h-8 w-8 object-contain shrink-0" />}
                         <h1 
                            className="text-lg sm:text-xl font-bold text-on-header"
                            style={{ color: brandColor || 'rgb(var(--color-on-header) / var(--opacity-header, 1))' }}
                         >
                             {displayName}
                         </h1>
                    </div>
                </div>
                <div className="lg:hidden">
                     <button 
                        onClick={onLogout} 
                        className="p-2 text-on-header hover:text-danger rounded-full transition-colors"
                        aria-label="Logout"
                    >
                        <PowerIcon className="h-6 w-6" />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default ClientHeader;
