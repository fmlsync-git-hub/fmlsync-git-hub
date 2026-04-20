import { MatchedFlightData } from './geminiService';
import { performMultiOcr } from './multiOcrService';

const KNOWN_AIRLINES = [
    'Emirates', 'KLM', 'British Airways', 'Delta', 'United', 'Qatar Airways',
    'Air France', 'Lufthansa', 'Ethiopian Airlines', 'Kenya Airways',
    'South African Airways', 'Passion Air', 'Africa World Airlines', 'AWA',
    'Brussels Airlines', 'Turkish Airlines', 'TAP Air Portugal', 'RwandAir',
    'EgyptAir', 'Royal Air Maroc', 'Asky', 'Air Cote d\'Ivoire', 'Iberia', 'American Airlines'
];

const KNOWN_CITIES = [
    'Accra', 'Takoradi', 'Kumasi', 'Tamale', 'Sunyani', 'Wa',
    'London', 'Dubai', 'Amsterdam', 'Paris', 'Frankfurt', 'New York',
    'Washington', 'Johannesburg', 'Nairobi', 'Addis Ababa', 'Lagos', 'Abidjan',
    'Doha', 'Istanbul', 'Brussels', 'Kigali', 'Casablanca', 'Cairo', 'Lome'
];

const parseTextToFlightData = (text: string, passengerList: {id: string, name: string}[]): MatchedFlightData[] => {
    const textUpper = text.toUpperCase();

    // 1. Global Year
    const yearMatch = text.match(/\b(202[4-9])\b/);
    const globalYear = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();

    // 2. Airline
    const airlinesMatches: {val: string, idx: number}[] = [];
    for (const a of KNOWN_AIRLINES) {
        const regex = new RegExp(`\\b${a}\\b`, 'gi');
        for (const m of text.matchAll(regex)) {
            airlinesMatches.push({ val: a, idx: m.index! });
        }
    }
    airlinesMatches.sort((a, b) => a.idx - b.idx);
    const defaultAirline = airlinesMatches.length > 0 ? airlinesMatches[0].val : '';

    // 3. Airports
    const airportRegex = /\b[A-Z]{3}\b/g;
    const rawAirports = Array.from(textUpper.matchAll(airportRegex));
    const commonWords = ['THE', 'AND', 'FOR', 'NOT', 'ANY', 'ALL', 'OUT', 'NEW', 'ONE', 'TWO', 'SIX', 'TEN', 'NON', 'REF', 'END', 'FEE', 'TAX', 'USD', 'EUR', 'GBP', 'TKT', 'PNR', 'MR', 'MRS', 'MS', 'DR', 'FLT', 'DEP', 'ARR', 'BAG', 'SEC', 'SEQ', 'PCS', 'WT', 'UNCK', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN', 'ADT', 'CHD', 'INF', 'YQ', 'YR', 'KGS', 'LBS', 'MAX', 'MIN', 'VIP', 'CIP', 'JET', 'BOE', 'ING', 'CHK', 'REQ', 'REC', 'EKT'];
    const airports = rawAirports
        .filter(m => !commonWords.includes(m[0]))
        .map(m => ({ val: m[0], idx: m.index! }));

    // 4. Times
    const timeMatches: {val: string, idx: number}[] = [];
    const timeRegex24 = /\b([01]\d|2[0-3])[:.h]([0-5]\d)\b/gi;
    const timeRegex12 = /\b(1[0-2]|0?[1-9])[:.h]?([0-5]\d)?\s*([AaPp][Mm])\b/gi;
    
    for (const m of text.matchAll(timeRegex24)) {
        timeMatches.push({ val: `${m[1]}:${m[2]}`, idx: m.index! });
    }
    for (const m of text.matchAll(timeRegex12)) {
        let hours = parseInt(m[1], 10);
        const mins = m[2] || '00';
        const modifier = m[3].toUpperCase();
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        timeMatches.push({ val: `${hours.toString().padStart(2, '0')}:${mins}`, idx: m.index! });
    }
    timeMatches.sort((a, b) => a.idx - b.idx);

    // 5. Dates
    const dateMatches: {val: string, idx: number}[] = [];
    const dateRegexWithLetters = /\b(\d{1,2})[\/\.-\s]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\/\.-\s]*(\d{2,4})?\b/gi;
    const dateRegexWithNumbers = /\b(\d{1,2})[\/\.-\s]+([0-1]?\d)[\/\.-\s]+(\d{2,4})\b/gi;
    
    const processDateMatch = (m: RegExpMatchArray) => {
        let day = m[1].padStart(2, '0');
        let monthStr = m[2];
        let year = m[3] || globalYear;
        if (year.length === 2) year = '20' + year;

        let month = '01';
        if (isNaN(Number(monthStr))) {
            const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            const mIndex = months.findIndex(mon => monthStr.toLowerCase().startsWith(mon));
            if (mIndex >= 0) month = (mIndex + 1).toString().padStart(2, '0');
        } else {
            month = monthStr.padStart(2, '0');
        }
        dateMatches.push({ val: `${year}-${month}-${day}`, idx: m.index! });
    };

    for (const m of text.matchAll(dateRegexWithLetters)) processDateMatch(m);
    for (const m of text.matchAll(dateRegexWithNumbers)) processDateMatch(m);
    dateMatches.sort((a, b) => a.idx - b.idx);

    // 6. Ticket Number / PNR
    const ticketMatches: {val: string, idx: number}[] = [];
    const ticketRegex = /\b\d{3}[-\s]?\d{10}\b/g;
    const pnrRegex = /\b[A-Z0-9]{6}\b/g;
    const eTicketRegex = /(?:eTicket Receipt\(s\):\s*|Ticket Number:\s*)(\d{13,14})/gi; // Specific to the sample
    
    for (const m of text.matchAll(ticketRegex)) {
        ticketMatches.push({ val: m[0].replace(/[-\s]/g, ''), idx: m.index! });
    }
    for (const m of text.matchAll(eTicketRegex)) {
        ticketMatches.push({ val: m[1], idx: m.index! });
    }
    for (const m of text.matchAll(pnrRegex)) {
        if (/[0-9]/.test(m[0]) && /[A-Z]/.test(m[0])) {
            ticketMatches.push({ val: m[0], idx: m.index! });
        }
    }
    ticketMatches.sort((a, b) => a.idx - b.idx);

    // 7. Passengers
    const foundPassengers: { id: string, name: string, score: number, idx: number }[] = [];
    const lowerText = text.toLowerCase();
    
    // Try to find passenger name explicitly
    const passengerNameRegex = /Passenger Name:\s*»?\s*([A-Z\s\/]+)/i;
    const nameMatch = text.match(passengerNameRegex);
    let explicitName = nameMatch ? nameMatch[1].trim() : null;

    for (const p of passengerList) {
        const nameParts = p.name.toLowerCase().split(' ');
        let score = 0;
        let firstIdx = -1;
        const validParts = nameParts.filter(part => part.length > 2);
        
        for (const part of validParts) {
            const idx = lowerText.indexOf(part);
            if (idx !== -1) {
                score++;
                if (firstIdx === -1 || idx < firstIdx) firstIdx = idx;
            }
        }
        
        // Boost score if explicit name matches
        if (explicitName && explicitName.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])) {
            score += 2;
        }

        if (score > 0 && score >= Math.ceil(validParts.length / 2)) {
            foundPassengers.push({ id: p.id, name: p.name, score, idx: firstIdx });
        }
    }
    foundPassengers.sort((a, b) => a.idx - b.idx);

    // If we found an explicit name but no match in roster, still record it
    if (explicitName && foundPassengers.length === 0) {
        foundPassengers.push({ id: '', name: explicitName, score: 1, idx: nameMatch!.index! });
    }

    // 8. Construct Legs
    // A leg typically has a departure and arrival time (2 times) or departure and arrival airport (2 airports).
    const numLegs = Math.max(Math.floor(timeMatches.length / 2), Math.floor(airports.length / 2), 1);
    const results: MatchedFlightData[] = [];

    for (let i = 0; i < numLegs; i++) {
        const depTimeObj = timeMatches[i * 2];
        const travelTime = depTimeObj ? depTimeObj.val : (timeMatches[i] ? timeMatches[i].val : '');
        
        const depAirportObj = airports[i * 2];
        const arrAirportObj = airports[i * 2 + 1];
        const departureCity = depAirportObj ? depAirportObj.val : '';
        const arrivalCity = arrAirportObj ? arrAirportObj.val : '';

        const targetIdx = depTimeObj ? depTimeObj.idx : (depAirportObj ? depAirportObj.idx : 0);

        // Find closest date before or slightly after targetIdx
        let travelDate = dateMatches.length > 0 ? dateMatches[0].val : '';
        let minDiff = Infinity;
        for (const d of dateMatches) {
            const diff = Math.abs(targetIdx - d.idx);
            if (d.idx <= targetIdx + 200 && diff < minDiff) { 
                minDiff = diff;
                travelDate = d.val;
            }
        }

        // Find closest ticket
        let ticketNumber = ticketMatches.length > 0 ? ticketMatches[0].val : '';
        minDiff = Infinity;
        for (const t of ticketMatches) {
            const diff = Math.abs(targetIdx - t.idx);
            if (diff < minDiff) {
                minDiff = diff;
                ticketNumber = t.val;
            }
        }

        // Find closest passenger
        let passenger = foundPassengers.length > 0 ? foundPassengers[0] : { id: '', name: 'Unknown', score: 0 };
        minDiff = Infinity;
        for (const p of foundPassengers) {
            const diff = Math.abs(targetIdx - p.idx);
            if (diff < minDiff) {
                minDiff = diff;
                passenger = p;
            }
        }

        // Airline
        let airline = defaultAirline;
        minDiff = Infinity;
        for (const a of airlinesMatches) {
            const diff = Math.abs(targetIdx - a.idx);
            if (diff < minDiff) {
                minDiff = diff;
                airline = a.val;
            }
        }

        results.push({
            ticketData: {
                ticketNumber,
                airline,
                departureCity,
                arrivalCity,
                travelDate,
                travelTime
            },
            passengerName: passenger.name,
            matchedPassengerId: passenger.id,
            confidence: passenger.score > 0 ? 0.8 : 0.2
        });
    }

    // Deduplicate exact identical legs
    const uniqueResults = results.filter((r, index, self) =>
        index === self.findIndex((t) => (
            t.ticketData.departureCity === r.ticketData.departureCity &&
            t.ticketData.arrivalCity === r.ticketData.arrivalCity &&
            t.ticketData.travelDate === r.ticketData.travelDate &&
            t.ticketData.travelTime === r.ticketData.travelTime
        ))
    );

    return uniqueResults.length > 0 ? uniqueResults : results;
};

export const extractFlightDataWithOCR = async (
    base64Image: string,
    mimeType: string,
    passengerList: {id: string, name: string}[]
): Promise<MatchedFlightData[]> => {
    try {
        // Try multi-provider OCR first
        const ocrResult = await performMultiOcr(base64Image, mimeType);
        if (ocrResult && ocrResult.text) {
            console.log(`Using ${ocrResult.provider} for flight data extraction (Regex)`);
            return parseTextToFlightData(ocrResult.text, passengerList);
        }
        throw new Error("OCR provider returned no text.");
    } catch (error: any) {
        console.error("OCR Error:", error);
        throw new Error(error.message || "Failed to extract text using multi-provider OCR.");
    }
};

export const extractFlightDataFromTextRegex = async (
    text: string,
    passengerList: {id: string, name: string}[]
): Promise<MatchedFlightData[]> => {
    return parseTextToFlightData(text || '', passengerList);
};
