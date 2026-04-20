
import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { Company } from '../types';
import { COMPANIES as defaultCompanies } from '../constants';
import { listenToCompanySettings, updateCompanySettings } from '../services/firebase';

type CompanyAppearance = {
  logo?: string | null;
  logoBg?: string;
  logoSize?: '50%' | '70%' | '100%';
  bgStyle?: 'transparent' | 'color';
};

interface CompanyContextType {
  companies: Company[];
  updateCompanyAppearance: (companyId: string, appearance: CompanyAppearance) => void;
  addCompany: (newCompanyData: { name: string; logo: string }) => void;
  updateCompanyOrder: (orderedIds: string[]) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

// Default order as requested: SPIE, DSL, MODEC, BGH, OTHERS
const DEFAULT_ORDER = ['spie', 'dsl', 'modec', 'bgh', 'others'];

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customCompanies, setCustomCompanies] = useState<Company[]>([]);
  const [companyAppearances, setCompanyAppearances] = useState<Record<string, CompanyAppearance>>({});
  const [companyOrder, setCompanyOrder] = useState<string[]>([]);
  const [companies, setCompanies] = useState<Company[]>(defaultCompanies);

  // Load from Firestore
  useEffect(() => {
    const unsubscribe = listenToCompanySettings((settings) => {
      if (settings.custom) setCustomCompanies(settings.custom);
      if (settings.appearances) setCompanyAppearances(settings.appearances);
      if (settings.order) setCompanyOrder(settings.order);
    });
    return () => unsubscribe();
  }, []);

  // Merge default companies, custom companies, and appearances when any of them change
  useEffect(() => {
    const allBaseCompanies = [...defaultCompanies, ...customCompanies];
    const mergedCompanies = allBaseCompanies.map(company => {
        const customAppearance = companyAppearances[company.id];
        
        if (customAppearance) {
            const { logo, ...restOfAppearance } = customAppearance;
            const finalCompany = { ...company, ...restOfAppearance };
            
            if (logo) { // A new logo URL is provided
                finalCompany.logo = logo;
            } else if (logo === null) { // The custom logo was removed, revert to default
                const baseCompany = defaultCompanies.find(c => c.id === company.id);
                 if (baseCompany) {
                    finalCompany.logo = baseCompany.logo;
                }
            }
            return finalCompany;
        }

        return company;
    });
    
    // Determine the effective order. 
    // If user has arranged things, use that. Otherwise use default.
    // We prioritize users' saved order if it exists.
    const effectiveOrder = companyOrder && companyOrder.length > 0 ? companyOrder : DEFAULT_ORDER;
    const orderMap = new Map<string, number>();
    effectiveOrder.forEach((id, index) => orderMap.set(id, index));
    
    // For companies not in the order list, we want them to stay at the end but in a stable order.
    const END_OF_LIST_INDEX = 999999;

    mergedCompanies.sort((a, b) => {
        const aId = a.id.toLowerCase();
        const bId = b.id.toLowerCase();
        
        const indexA = orderMap.has(aId) ? orderMap.get(aId)! : (orderMap.has(a.id) ? orderMap.get(a.id)! : END_OF_LIST_INDEX);
        const indexB = orderMap.has(bId) ? orderMap.get(bId)! : (orderMap.has(b.id) ? orderMap.get(b.id)! : END_OF_LIST_INDEX);
        
        if (indexA !== indexB) return indexA - indexB;
        
        // Stable fallback: sort by name, then ID if names are identical
        const nameCompare = a.name.localeCompare(b.name);
        if (nameCompare !== 0) return nameCompare;
        return a.id.localeCompare(b.id);
    });

    setCompanies(mergedCompanies);
  }, [customCompanies, companyAppearances, companyOrder]);


  const addCompany = useCallback(async (newCompanyData: { name: string; logo: string }) => {
    const id = newCompanyData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + `-${Date.now()}`;
    
    const newCompany: Company = {
        id,
        name: newCompanyData.name,
        logo: newCompanyData.logo,
    };

    const updatedCustom = [...customCompanies, newCompany];
    
    // Ensure we have a persistent order list starting with the default order if it's currently empty
    const baseOrder = companyOrder.length > 0 ? companyOrder : DEFAULT_ORDER;
    const updatedOrder = [...baseOrder, id];
    
    await updateCompanySettings({
        custom: updatedCustom,
        order: updatedOrder
    });
  }, [customCompanies, companyOrder]);

  const updateCompanyAppearance = useCallback(async (companyId: string, appearance: CompanyAppearance) => {
    const newAppearances = {
        ...companyAppearances,
        [companyId]: {
            ...(companyAppearances[companyId] || {}),
            ...appearance,
        }
    };
    await updateCompanySettings({ appearances: newAppearances });
  }, [companyAppearances]);

  const updateCompanyOrder = useCallback(async (orderedIds: string[]) => {
    await updateCompanySettings({ order: orderedIds });
  }, []);


  const value = useMemo(() => ({ 
      companies, 
      updateCompanyAppearance, 
      addCompany,
      updateCompanyOrder,
  }), [companies, updateCompanyAppearance, addCompany, updateCompanyOrder]);

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompanies = (): CompanyContextType => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompanies must be used within a CompanyProvider');
  }
  return context;
};
