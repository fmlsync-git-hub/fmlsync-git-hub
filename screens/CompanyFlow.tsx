
import React, { useState, lazy, Suspense, useEffect } from 'react';
import { Company, Passenger, User, UserSettings } from '../types';
import { getPassengerById } from '../services/firebase';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useCompanies } from '../context/CompanyContext';

// Lazy load screens
const CompanySelectionScreen = lazy(() => import('./CompanySelectionScreen'));
const PassengerListScreen = lazy(() => import('./PassengerListScreen'));
const PassengerDetailsScreen = lazy(() => import('./PassengerDetailsScreen'));
const NewPassengerScreen = lazy(() => import('./NewPassengerScreen'));
const EditPassengerScreen = lazy(() => import('./EditPassengerScreen'));


type CompanyFlowScreen = 'company_selection' | 'passenger_list' | 'passenger_details' | 'new_passenger' | 'edit_passenger';

interface CompanyFlowProps {
    currentUser: User & UserSettings;
    initialPassenger?: Passenger | null; // Prop to support direct deep linking to edit mode
}

const CompanyFlow: React.FC<CompanyFlowProps> = ({ currentUser, initialPassenger }) => {
    const { companies } = useCompanies();
    const [currentScreen, setCurrentScreen] = useState<CompanyFlowScreen>('company_selection');
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);

    // Effect to handle direct navigation request (e.g. from Dashboard "Edit" click)
    useEffect(() => {
        if (initialPassenger) {
            const company = companies.find(c => c.id === initialPassenger.companyId);
            if (company) {
                setSelectedCompany(company);
                setSelectedPassenger(initialPassenger);
                setCurrentScreen('edit_passenger');
            } else {
                console.warn("Could not find company for passenger:", initialPassenger.companyId);
            }
        }
    }, [initialPassenger, companies]);

    const handleSelectCompany = (company: Company) => {
        setSelectedCompany(company);
        setCurrentScreen('passenger_list');
    };

    const handleSelectPassenger = (passenger: Passenger) => {
        setSelectedPassenger(passenger);
        setCurrentScreen('passenger_details');
    };
    
    const handleEditPassenger = (passenger: Passenger) => {
        setSelectedPassenger(passenger);
        setCurrentScreen('edit_passenger');
    }

    const handleBackToCompanySelection = () => {
        setCurrentScreen('company_selection');
        setSelectedCompany(null);
        setSelectedPassenger(null);
    };
    
    const handleBackToPassengerList = () => {
        setCurrentScreen('passenger_list');
        setSelectedPassenger(null);
    };

    const handleBackToPassengerDetails = () => {
        setCurrentScreen('passenger_details');
    };

    const handleAddNew = () => {
        setCurrentScreen('new_passenger');
    };

    const handleSaveNew = () => {
        setCurrentScreen('passenger_list');
    };

    const handleSaveEdit = async () => {
        if (selectedPassenger) {
            // Refetch the passenger to get the latest data after update
            const updatedPassenger = await getPassengerById(selectedPassenger.id);
            setSelectedPassenger(updatedPassenger);
        }
        setCurrentScreen('passenger_details');
    };
    
    const handleDocumentUpdate = async () => {
        if (selectedPassenger) {
            const updatedPassenger = await getPassengerById(selectedPassenger.id);
            setSelectedPassenger(updatedPassenger);
        }
    };

    const renderScreen = () => {
        switch (currentScreen) {
            case 'company_selection':
                return <CompanySelectionScreen onSelectCompany={handleSelectCompany} />;
            case 'passenger_list':
                if (!selectedCompany) return <CompanySelectionScreen onSelectCompany={handleSelectCompany} />;
                return <PassengerListScreen company={selectedCompany} onBack={handleBackToCompanySelection} onAddNew={handleAddNew} onSelectPassenger={handleSelectPassenger} onEditPassenger={handleEditPassenger} currentUser={currentUser}/>;
            case 'passenger_details':
                if (!selectedPassenger) {
                    handleBackToPassengerList();
                    return null;
                };
                return <PassengerDetailsScreen passenger={selectedPassenger} onBack={handleBackToPassengerList} onEdit={handleEditPassenger} onDocumentUpdate={handleDocumentUpdate} />;
            case 'new_passenger':
                if (!selectedCompany) {
                    handleBackToCompanySelection();
                    return null;
                }
                return <NewPassengerScreen company={selectedCompany} onBack={handleBackToPassengerList} onSave={handleSaveNew} currentUser={currentUser} />;
            case 'edit_passenger':
                 if (!selectedPassenger || !selectedCompany) {
                    handleBackToPassengerList();
                    return null;
                }
                return <EditPassengerScreen company={selectedCompany} passenger={selectedPassenger} onBack={handleBackToPassengerDetails} onSave={handleSaveEdit} />;
            default:
                return <CompanySelectionScreen onSelectCompany={handleSelectCompany} />;
        }
    };

    return (
        <Suspense fallback={<LoadingSpinner />}>
            {renderScreen()}
        </Suspense>
    )
};

export default CompanyFlow;
