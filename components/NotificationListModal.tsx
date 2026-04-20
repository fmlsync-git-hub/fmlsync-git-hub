import React, { useMemo } from 'react';
import { toast } from 'sonner';
import { NotificationType } from '../services/notificationService';
import { Passenger } from '../types';
import { getExpiryStatus } from '../hooks/useFormatters';

interface NotificationListModalProps {
  type: NotificationType;
  passengers: Passenger[];
  onClose: () => void;
}

export const NotificationListModal: React.FC<NotificationListModalProps> = ({ type, passengers, onClose }) => {
  const filteredData = useMemo(() => {
    return passengers.filter(p => {
        const now = new Date();
        switch (type) {
            case 'FLIGHT_24_72_HOURS':
            case 'FLIGHT_6_12_HOURS':
            case 'FLIGHT_0_2_HOURS':
                return p.tickets.some(t => {
                    if (!t.travelDate) return false;
                    const travelDate = new Date(t.travelDate);
                    const diffHours = (travelDate.getTime() - now.getTime()) / (1000 * 60 * 60);
                    
                    if (type === 'FLIGHT_24_72_HOURS') return diffHours > 24 && diffHours <= 72;
                    if (type === 'FLIGHT_6_12_HOURS') return diffHours > 6 && diffHours <= 12;
                    if (type === 'FLIGHT_0_2_HOURS') return diffHours >= 0 && diffHours <= 2;
                    return false;
                });
            case 'DOC_EXPIRY_30_90_DAYS':
                return p.passports.some(passport => getExpiryStatus(passport.dateOfExpiry).days > 30 && getExpiryStatus(passport.dateOfExpiry).days <= 90);
            case 'DOC_EXPIRY_0_29_DAYS':
                return p.passports.some(passport => getExpiryStatus(passport.dateOfExpiry).days >= 0 && getExpiryStatus(passport.dateOfExpiry).days <= 29);
            case 'NEW_DOCUMENT':
            case 'FLIGHT_SCHEDULE_CHANGE':
            case 'PROFILE_UPDATE_REQUIRED':
                return false; // Placeholder
            default:
                return false;
        }
    });
  }, [type, passengers]);

  const renderIssueDetails = (p: Passenger) => {
    switch (type) {
        case 'FLIGHT_24_72_HOURS':
        case 'FLIGHT_6_12_HOURS':
        case 'FLIGHT_0_2_HOURS':
            const ticket = p.tickets.find(t => t.travelDate);
            return ticket ? `${ticket.airline} - ${ticket.departureCity} to ${ticket.arrivalCity} on ${ticket.travelDate}` : 'No flight details';
        case 'DOC_EXPIRY_30_90_DAYS':
        case 'DOC_EXPIRY_0_29_DAYS':
            return `Passport expires on ${p.passports.map(passport => passport.dateOfExpiry).join(', ')}`;
        default:
            return '';
    }
  };

  const handleCopy = () => {
    const textToCopy = filteredData.map(p => `${p.passports.map(passport => passport.surname).join(', ')}, ${p.passports.map(passport => passport.firstNames).join(', ')}`).join('\n');
    navigator.clipboard.writeText(textToCopy).then(() => {
        toast.success('List copied to clipboard!');
    }).catch(() => {
        toast.error('Failed to copy list.');
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-lg max-h-[70vh] flex flex-col border border-border-default">
        <div className="p-4 border-b border-border-default flex justify-between items-center">
          <h2 className="text-lg font-bold text-on-surface">Notifications: {type}</h2>
          <div className="flex gap-2">
            <button onClick={handleCopy} className="text-sm px-3 py-1 bg-primary text-on-primary rounded-lg hover:opacity-90">Copy</button>
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary">Close</button>
          </div>
        </div>
        <div className="p-4 overflow-y-auto flex-grow">
          <ul className="space-y-2">
            {filteredData.map(p => (
              <li key={p.id} className="p-3 bg-surface-soft rounded-lg border border-border-default">
                <p className="font-semibold text-on-surface">{p.passports.map(passport => `${passport.surname}, ${passport.firstNames}`).join('; ')}</p>
                <p className="text-sm text-text-secondary">{renderIssueDetails(p)}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
