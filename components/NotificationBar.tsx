import React, { useMemo } from 'react';
import { NotificationService, NotificationType } from '../services/notificationService';
import { Passenger } from '../types';
import { getExpiryStatus } from '../hooks/useFormatters';

interface NotificationBarProps {
  passengers: Passenger[];
  onNotificationClick: (type: NotificationType) => void;
}

const notificationTypes: { type: NotificationType; label: string; color: string }[] = [
  { type: 'FLIGHT_24_72_HOURS', label: 'Flights (24-72h)', color: 'bg-blue-500' },
  { type: 'FLIGHT_6_12_HOURS', label: 'Flights (6-12h)', color: 'bg-indigo-500' },
  { type: 'FLIGHT_0_2_HOURS', label: 'Flights (0-2h)', color: 'bg-red-500' },
  { type: 'DOC_EXPIRY_30_90_DAYS', label: 'Docs (30-90d)', color: 'bg-yellow-500' },
  { type: 'DOC_EXPIRY_0_29_DAYS', label: 'Docs (0-29d)', color: 'bg-orange-500' },
  { type: 'NEW_DOCUMENT', label: 'New Docs', color: 'bg-teal-500' },
  { type: 'FLIGHT_SCHEDULE_CHANGE', label: 'Flight Changes', color: 'bg-purple-500' },
  { type: 'PROFILE_UPDATE_REQUIRED', label: 'Profile Updates', color: 'bg-pink-500' },
];

export const NotificationBar: React.FC<NotificationBarProps> = ({ passengers, onNotificationClick }) => {
  const counts = useMemo(() => {
    const newCounts: Record<NotificationType, number> = {} as any;
    notificationTypes.forEach(t => newCounts[t.type] = 0);

    passengers.forEach(p => {
        const now = new Date();
        // Flight notifications
        p.tickets?.forEach(t => {
            if (!t.travelDate) return;
            const travelDate = new Date(t.travelDate);
            const diffHours = (travelDate.getTime() - now.getTime()) / (1000 * 60 * 60);
            
            if (diffHours > 24 && diffHours <= 72) newCounts['FLIGHT_24_72_HOURS']++;
            if (diffHours > 6 && diffHours <= 12) newCounts['FLIGHT_6_12_HOURS']++;
            if (diffHours >= 0 && diffHours <= 2) newCounts['FLIGHT_0_2_HOURS']++;
        });

        // Document expiry notifications
        p.passports?.forEach(passport => {
            const days = getExpiryStatus(passport.dateOfExpiry).days;
            if (days > 30 && days <= 90) newCounts['DOC_EXPIRY_30_90_DAYS']++;
            if (days >= 0 && days <= 29) newCounts['DOC_EXPIRY_0_29_DAYS']++;
        });
    });
    return newCounts;
  }, [passengers]);

  return (
    <div className="flex flex-wrap gap-2 p-4 bg-surface rounded-lg border border-border-default shadow-sm">
      {notificationTypes.map(({ type, label }) => {
        const count = counts[type] || 0;
        
        return (
          <button
            key={type}
            onClick={() => onNotificationClick(type)}
            className="bg-primary text-on-primary px-3 py-1.5 rounded-full text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
          >
            {label} <span>({count})</span>
          </button>
        );
      })}
    </div>
  );
};
