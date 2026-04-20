
import { useMemo } from 'react';
import { Passenger, TicketData } from '../types';

export interface PersonnelStatusInfo {
    status: string;
    details: string;
    relevantFlight?: TicketData;
    sortOrder: number; // Helper for sorting lists by status priority
}

const parseLocalDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    const parts = dateString.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
}

// Pure function to determine status (can be used in loops)
export const determinePassengerStatus = (passenger: Passenger): PersonnelStatusInfo => {
    if (!passenger) {
        return { status: 'Unknown', details: 'No passenger data.', sortOrder: 99 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!passenger.tickets || passenger.tickets.length === 0) {
        if (passenger.category === 'Expatriate') {
            return { status: 'In-Country', details: 'Assumed in-country, no travel data.', sortOrder: 3 };
        }
        return { status: 'Off-Site', details: 'Assumed off-site, no travel data.', sortOrder: 4 };
    }
    
    const sortedTickets = passenger.tickets
        .map(t => ({ ...t, localTravelDate: parseLocalDate(t.travelDate) }))
        .filter(t => t.localTravelDate)
        .sort((a, b) => b.localTravelDate!.getTime() - a.localTravelDate!.getTime());

    const transitTicket = sortedTickets.find(t => t.localTravelDate!.toDateString() === today.toDateString());
    if (transitTicket) {
        return {
            status: 'In-Transit',
            details: `Traveling from ${transitTicket.departureCity || 'N/A'} to ${transitTicket.arrivalCity || 'N/A'}.`,
            relevantFlight: transitTicket,
            sortOrder: 1
        };
    }
    
    const lastFlight = sortedTickets.find(t => t.localTravelDate! < today);
    if (!lastFlight || !lastFlight.arrivalCity) {
        if (passenger.category === 'Expatriate') {
             return { status: 'In-Country', details: 'Assumed in-country, no recent valid travel data.', sortOrder: 3 };
        }
        return { status: 'Off-Site', details: 'Assumed off-site, no recent valid travel data.', sortOrder: 4 };
    }

    const arrivalCity = lastFlight.arrivalCity.toLowerCase().trim();

    if (passenger.category === 'Expatriate') {
        const localCities = ['accra', 'takoradi', 'kumasi'];
        if (localCities.includes(arrivalCity)) {
            return { status: 'In-Country', details: `Last arrival in ${lastFlight.arrivalCity}.`, relevantFlight: lastFlight, sortOrder: 3 };
        }
        return { status: 'Home-Country', details: `Last arrival in ${lastFlight.arrivalCity}.`, relevantFlight: lastFlight, sortOrder: 5 };
    } else { // Local
        const localCities = ['accra', 'takoradi', 'kumasi', 'tamale'];
        const workSiteCity = 'takoradi';
        if (arrivalCity === workSiteCity) {
             return { status: 'On-Site', details: 'Last arrival was at the work site.', relevantFlight: lastFlight, sortOrder: 2 };
        } else if (localCities.includes(arrivalCity)) {
             return { status: 'Off-Site', details: `Last local travel to ${lastFlight.arrivalCity}.`, relevantFlight: lastFlight, sortOrder: 4 };
        }
        return { status: 'Outside Country', details: `Last arrival was outside Ghana in ${lastFlight.arrivalCity}.`, relevantFlight: lastFlight, sortOrder: 5 };
    }
};

// Hook wrapper for single passenger use in components
export const usePersonnelStatus = (passenger: Passenger | null): PersonnelStatusInfo => {
    return useMemo(() => {
        if (!passenger) return { status: 'Unknown', details: 'No data', sortOrder: 99 };
        return determinePassengerStatus(passenger);
    }, [passenger]);
};
