import React from 'react';
import { UsersIcon } from '../components/icons/index';

const PassengerProfileScreen: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col items-center justify-center h-96 bg-surface rounded-lg shadow-md border border-border-default">
                <UsersIcon className="w-16 h-16 text-text-secondary opacity-50 mb-4" />
                <h2 className="text-2xl font-bold text-text-primary">Passenger Profile</h2>
                <p className="mt-2 text-text-secondary max-w-md text-center">
                    This is a placeholder for a detailed passenger profile screen.
                </p>
            </div>
        </div>
    );
};

export default PassengerProfileScreen;
