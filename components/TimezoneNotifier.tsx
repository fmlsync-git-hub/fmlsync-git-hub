import React, { useState, useEffect } from 'react';
import { InformationCircleIcon, XMarkIcon } from './icons/index';

const TimezoneNotifier: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const hasBeenDismissed = sessionStorage.getItem('timezoneNotificationDismissed') === 'true';
        if (hasBeenDismissed) {
            return;
        }

        // getTimezoneOffset returns the difference in minutes between UTC and the local time.
        // A value of 0 indicates UTC.
        const isNotUtc = new Date().getTimezoneOffset() !== 0;

        if (isNotUtc) {
            setIsVisible(true);
        }
    }, []);

    const handleDismiss = () => {
        sessionStorage.setItem('timezoneNotificationDismissed', 'true');
        setIsVisible(false);
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 max-w-md w-full">
            <div className="bg-surface rounded-lg shadow-lg border border-border-default p-4 flex items-start gap-4">
                <div className="flex-shrink-0 pt-0.5">
                    <InformationCircleIcon className="h-6 w-6 text-info" />
                </div>
                <div className="flex-grow">
                    <h4 className="font-semibold text-text-primary">Time Zone Recommendation</h4>
                    <p className="text-sm text-text-secondary mt-1">
                        Your system's time zone is not set to Universal Time (UTC). To ensure accurate tracking of critical deadlines like document expiry and flight schedules, we recommend adjusting your system's time zone settings.
                    </p>
                </div>
                <div className="flex-shrink-0">
                    <button
                        onClick={handleDismiss}
                        className="p-1 rounded-full text-text-secondary hover:bg-surface-soft hover:text-text-primary transition-colors"
                        aria-label="Dismiss notification"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TimezoneNotifier;
