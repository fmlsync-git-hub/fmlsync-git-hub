import React, { lazy } from 'react';
import { Company } from '../types';
import { useCompanies } from '../context/CompanyContext';

interface CompanySelectionScreenProps {
  onSelectCompany: (company: Company) => void;
}

const CompanyLogo: React.FC<{ company: Company; className?: string }> = ({ company, className }) => {
    const LogoComponent = company.logo;
    const logoStyle = {
        maxWidth: company.logoSize || '100%',
        maxHeight: company.logoSize || '100%',
    };
    if (typeof LogoComponent === 'string') {
        if (LogoComponent.startsWith('data:video')) {
            return <video src={LogoComponent} autoPlay loop muted playsInline className={className} style={logoStyle} />;
        }
        return <img src={LogoComponent} alt={`${company.name} logo`} className={className} style={logoStyle} />;
    }
    return <LogoComponent className={className} title={`${company.name} logo`} style={logoStyle} />;
};

const CompanySelectionScreen: React.FC<CompanySelectionScreenProps> = ({ onSelectCompany }) => {
  const { companies } = useCompanies();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 sm:p-6">
      
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Select a client</h1>
        <p className="mt-2 text-text-secondary">Choose a client to manage their personnel</p>
      </div>
      <div className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
        {companies.map((company) => {
            const previewBg = company.bgStyle === 'transparent' ? 'transparent' : company.logoBg || 'var(--color-surface-soft)';
            const transparentBgStyle: React.CSSProperties = {
                backgroundImage: 'linear-gradient(45deg, rgb(var(--color-border-default)) 25%, transparent 25%), linear-gradient(-45deg, rgb(var(--color-border-default)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgb(var(--color-border-default)) 75%), linear-gradient(-45deg, transparent 75%, rgb(var(--color-border-default)) 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
            };
            const containerStyle = previewBg === 'transparent' ? transparentBgStyle : { backgroundColor: previewBg };

            return (
              <div
                key={company.id}
                onClick={() => onSelectCompany(company)}
                className="group flex flex-col items-center justify-center bg-surface rounded-lg shadow-md border border-border-default cursor-pointer transition-all duration-300 hover:shadow-xl hover:border-primary hover:-translate-y-1"
              >
                <div 
                    className="flex items-center justify-center h-32 sm:h-40 w-full p-4 rounded-t-lg"
                    style={containerStyle}
                >
                    <CompanyLogo company={company} className="h-full w-full object-contain" />
                </div>
                <div className="w-full text-center p-3 bg-surface-soft/50 rounded-b-lg">
                  <p className="font-semibold text-text-primary group-hover:text-primary transition-colors">{company.name}</p>
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
};

export default CompanySelectionScreen;