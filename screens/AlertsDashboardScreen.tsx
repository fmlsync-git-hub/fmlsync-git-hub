import React from 'react';
import { DocumentWarningIcon } from '../components/icons/index';

const AlertsDashboardScreen: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col items-center justify-center h-96 bg-surface rounded-lg shadow-md border border-border-default">
                <DocumentWarningIcon className="w-16 h-16 text-text-secondary opacity-50 mb-4" />
                <h2 className="text-2xl font-bold text-text-primary">Alerts Dashboard</h2>
                <p className="mt-2 text-text-secondary max-w-md text-center">
                    This feature is coming soon. You'll be able to see a centralized dashboard for all important alerts and notifications.
                </p>
            </div>
        </div>
    );
};

export default AlertsDashboardScreen;
