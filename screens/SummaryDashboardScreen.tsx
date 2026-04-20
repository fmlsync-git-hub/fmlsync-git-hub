
import React, { useState, useEffect, useMemo } from 'react';
import { Passenger, TicketData, User, UserSettings } from '../types';
import { listenToAccessiblePassengers } from '../services/firebase';
import { useFormatters, getExpiryStatus } from '../hooks/useFormatters';
import { useCompanies } from '../context/CompanyContext';
import { CalendarIcon, BellIcon, TicketIcon, InformationCircleIcon, DocumentWarningIcon, PowerIcon, MapIcon, SparklesIcon } from '../components/icons/index';
import { useBranding } from '../context/BrandingContext';
import { determinePassengerStatus } from '../hooks/usePersonnelStatus';

// --- GeckoBoard Style Visual Components ---

const Sparkline: React.FC<{ color: string; data: number[] }> = ({ color, data }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const height = 40;
    const width = 120;
    const step = width / (data.length - 1);

    const points = data.map((val, i) => {
        const x = i * step;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={width} height={height} className="overflow-visible">
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="3"
                points={points}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <polygon
                fill={color}
                fillOpacity="0.1"
                points={`${0},${height} ${points} ${width},${height}`}
            />
        </svg>
    );
};

const GaugeChart: React.FC<{ value: number; color: string; label: string }> = ({ value, color, label }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="relative flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
                <svg className="transform -rotate-90 w-32 h-32">
                    <circle
                        className="text-white/10"
                        strokeWidth="10"
                        stroke="currentColor"
                        fill="transparent"
                        r={radius}
                        cx="64"
                        cy="64"
                    />
                    <circle
                        style={{ color }}
                        strokeWidth="10"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r={radius}
                        cx="64"
                        cy="64"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-bold text-white">{value}%</span>
                </div>
            </div>
            <p className="mt-2 text-sm font-medium text-gray-400 uppercase tracking-wider">{label}</p>
        </div>
    );
};

const LiveClock: React.FC = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="text-right">
            <div className="text-4xl font-bold text-white tracking-tight tabular-nums">
                {time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-sm font-bold text-indigo-400 uppercase tracking-widest mt-1">
                {time.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
        </div>
    );
};

const MetricCard: React.FC<{ 
    title: string; 
    value: string | number; 
    subtext?: string; 
    trend?: 'up' | 'down' | 'neutral'; 
    chartData?: number[];
    accentColor?: string;
}> = ({ title, value, subtext, trend, chartData, accentColor = '#4f46e5' }) => (
    <div className="bg-[#24263a] rounded-lg p-6 shadow-xl border border-white/5 flex flex-col justify-between h-full relative overflow-hidden">
        <div className="flex justify-between items-start z-10">
            <div>
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">{title}</h3>
                <div className="text-5xl font-bold text-white tracking-tight">{value}</div>
            </div>
        </div>
        
        <div className="mt-6 flex items-end justify-between z-10">
            <div className="flex flex-col">
                 {trend && (
                    <span className={`text-sm font-bold mb-1 ${trend === 'up' ? 'text-green-400' : 'text-rose-400'}`}>
                        {trend === 'up' ? '▲' : '▼'} {subtext}
                    </span>
                )}
                {!trend && subtext && <span className="text-gray-500 text-xs font-medium">{subtext}</span>}
            </div>
            {chartData && (
                <div className="-mb-2 -mr-2">
                    <Sparkline color={accentColor} data={chartData} />
                </div>
            )}
        </div>
    </div>
);

const FlightRow: React.FC<{ ticket: TicketData, passengerName: string, timeDiff: number }> = ({ ticket, passengerName, timeDiff }) => {
    const { formatTime } = useFormatters();
    let statusColor = "text-gray-500";
    let statusText = "SCHEDULED";
    let rowOpacity = "opacity-100";
    
    if (timeDiff <= 0) { statusText = "DEPARTED"; statusColor = "text-gray-500"; rowOpacity="opacity-60"; }
    else if (timeDiff < 24) { statusText = "BOARDING"; statusColor = "text-emerald-400 animate-pulse"; }
    else if (timeDiff < 72) { statusText = "CONFIRMED"; statusColor = "text-blue-400"; }

    return (
        <div className={`grid grid-cols-12 gap-4 py-4 border-b border-white/5 items-center text-sm ${rowOpacity}`}>
            <div className="col-span-2 text-white font-mono text-lg font-bold">{formatTime(ticket.travelTime) || '--:--'}</div>
            <div className="col-span-5">
                <div className="text-gray-200 font-bold truncate text-base">{passengerName}</div>
                <div className="text-gray-500 text-xs uppercase tracking-wide">{ticket.airline}</div>
            </div>
            <div className="col-span-2 text-gray-300 font-mono font-bold text-base">
                {ticket.departureCity?.substring(0,3).toUpperCase()} <span className="text-gray-600">→</span> {ticket.arrivalCity?.substring(0,3).toUpperCase()}
            </div>
            <div className="col-span-3 text-right">
                <span className={`text-xs font-black tracking-wider px-2 py-1 rounded bg-white/5 ${statusColor}`}>{statusText}</span>
            </div>
        </div>
    );
};

interface DocAlert {
    passengerName: string;
    companyName: string;
    docType: string;
    expiryDate: string;
    daysLeft: number;
    status: 'Expired' | 'Expiring';
}

const DocAlertRow: React.FC<{ alert: DocAlert }> = ({ alert }) => {
    const { formatDate } = useFormatters();
    const isExpired = alert.status === 'Expired';
    return (
        <div className={`grid grid-cols-12 gap-4 py-4 border-b border-white/5 items-center text-sm`}>
            <div className="col-span-4">
                <div className="text-gray-200 font-bold truncate">{alert.passengerName}</div>
                <div className="text-gray-500 text-xs uppercase">{alert.companyName}</div>
            </div>
            <div className="col-span-3 text-gray-400">{alert.docType}</div>
            <div className="col-span-3 text-gray-300 font-mono text-right">{formatDate(alert.expiryDate)}</div>
            <div className="col-span-2 text-right">
                <span className={`text-xs font-black tracking-wider px-2 py-1 rounded ${isExpired ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {isExpired ? 'EXPIRED' : `${alert.daysLeft} DAYS`}
                </span>
            </div>
        </div>
    );
}

const AlertTicker: React.FC<{ alerts: string[] }> = ({ alerts }) => {
    const { tickerSpeed } = useBranding();
    if (alerts.length === 0) return null;

    // Use a simpler 'transform' animation that translates from 100% width to -100%
    return (
        <div className="bg-gradient-to-r from-red-900/40 to-amber-900/40 border-y border-white/10 overflow-hidden relative h-10 flex items-center mb-6">
            <div className="absolute left-0 top-0 bottom-0 bg-[#13131a] z-10 px-4 flex items-center border-r border-white/10 shadow-[5px_0_15px_rgba(0,0,0,0.5)]">
                <span className="text-red-400 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    Flash Alert
                </span>
            </div>
            <div className="relative w-full h-full overflow-hidden">
                <div 
                    className="absolute whitespace-nowrap flex items-center gap-16 animate-marquee-full"
                    style={{ animationDuration: `${tickerSpeed}s` }}
                >
                    {alerts.map((alert, idx) => (
                        <span key={idx} className="text-gray-200 text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                            <DocumentWarningIcon className="h-4 w-4 text-amber-500" />
                            {alert}
                        </span>
                    ))}
                </div>
            </div>
            <style>{`
                @keyframes marquee-full {
                    0% { transform: translateX(100vw); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee-full {
                    animation: marquee-full linear infinite;
                }
            `}</style>
        </div>
    );
};

const SummaryDashboardScreen: React.FC<{ currentUser?: User & UserSettings, onLogout?: () => void }> = ({ currentUser, onLogout }) => {
    const [passengers, setPassengers] = useState<Passenger[]>([]);
    const [loading, setLoading] = useState(true);
    const { companies } = useCompanies();
    const { dashboardTitle, appLogo } = useBranding();
    
    useEffect(() => {
        if (!currentUser) return;
        setLoading(true);
        
        // Using listenToAccessiblePassengers handles role-based data visibility automatically
        const unsubPax = listenToAccessiblePassengers(currentUser, (data) => {
            setPassengers(data);
            setLoading(false);
        });
        
        return () => unsubPax();
    }, [currentUser]);

    // --- Analytics Logic ---
    const stats = useMemo(() => {
        const now = new Date();
        const todayStr = now.toDateString();
        
        let totalPax = 0;
        let flightsToday = 0;
        let flightsUpcoming = 0;
        let expiredDocs = 0;
        let expiringDocs = 0;
        let upcomingFlightsList: { ticket: TicketData, passengerName: string, date: Date, timeDiff: number }[] = [];
        let docAlerts: DocAlert[] = [];
        let tickerAlerts: string[] = [];
        
        // Personnel Status Counts
        let statusCounts = {
            transit: 0,
            active: 0, // On-Site, In-Country
            away: 0,   // Off-Site, Home, Outside
            unknown: 0
        };
        
        const growthData = [totalPax * 0.8, totalPax * 0.85, totalPax * 0.9, totalPax * 0.92, totalPax * 0.95, totalPax]; 
        
        let validDocsCount = 0;
        let totalDocsCount = 0;

        const getCompanyName = (id: string) => companies.find(c => c.id === id)?.name || id;

        passengers.forEach(p => {
            totalPax++;
            
            // Personnel Status
            const status = determinePassengerStatus(p);
            if (status.status === 'In-Transit') statusCounts.transit++;
            else if (['On-Site', 'In-Country'].includes(status.status)) statusCounts.active++;
            else if (['Off-Site', 'Home-Country', 'Outside Country'].includes(status.status)) statusCounts.away++;
            else statusCounts.unknown++;
            
            // Document Checks
            const docs = [
                ...(p.passports && p.passports.length > 0 ? [{ data: p.passports[0], type: 'Passport' }] : []),
                ...(p.visas || []).map(v => ({ data: v, type: `Visa (${v.country})` })),
                ...(p.permits || []).map(pm => ({ data: pm, type: `Permit (${pm.type || 'Res'})` }))
            ];

            docs.forEach(({ data, type }) => {
                if (!data || !data.dateOfExpiry) return;
                totalDocsCount++;
                const status = getExpiryStatus(data.dateOfExpiry);
                if (status.days > 90) validDocsCount++;
                
                if (status.text === 'Expired' || status.text.includes('Expires')) {
                    if (status.text === 'Expired') expiredDocs++;
                    else expiringDocs++;

                    const passport = p.passports && p.passports.length > 0 ? p.passports[0] : null;
                    docAlerts.push({
                        passengerName: passport ? `${passport.firstNames} ${passport.surname}` : 'Unknown',
                        companyName: getCompanyName(p.companyId),
                        docType: type,
                        expiryDate: data.dateOfExpiry,
                        daysLeft: status.days,
                        status: status.text === 'Expired' ? 'Expired' : 'Expiring'
                    });
                    
                    if (status.days <= 30) {
                        const surname = passport ? passport.surname : 'Unknown';
                        tickerAlerts.push(`${surname} - ${type} ${status.text === 'Expired' ? 'Expired' : `Expires in ${status.days} Days`}`);
                    }
                }
            });

            // Flight Checks
            if (p.tickets) {
                p.tickets.forEach(t => {
                    if (!t.travelDate) return;
                    const parts = t.travelDate.split('-').map(Number);
                    if(parts.length !== 3) return;
                    const flightDate = new Date(parts[0], parts[1]-1, parts[2]);
                    
                    let hours = 12, minutes = 0;
                    if(t.travelTime) {
                        const timeParts = t.travelTime.split(':').map(Number);
                        if(timeParts.length === 2) { hours = timeParts[0]; minutes = timeParts[1]; }
                    }
                    flightDate.setHours(hours, minutes);

                    const timeDiffHours = (flightDate.getTime() - now.getTime()) / (1000 * 60 * 60);

                    if (flightDate.toDateString() === todayStr) flightsToday++;
                    else if (flightDate > now) flightsUpcoming++;

                    // Only show flights from today onwards or very recent departures
                    if (timeDiffHours > -4) { 
                        const passport = p.passports && p.passports.length > 0 ? p.passports[0] : null;
                        upcomingFlightsList.push({
                            ticket: t,
                            passengerName: passport ? `${passport.surname}, ${passport.firstNames.charAt(0)}.` : 'Unknown',
                            date: flightDate,
                            timeDiff: timeDiffHours
                        });
                        
                        if (timeDiffHours > 0 && timeDiffHours < 48) {
                            const surname = passport ? passport.surname : 'Unknown';
                            tickerAlerts.push(`Flight Impending: ${surname} to ${t.arrivalCity} in ${Math.round(timeDiffHours)} hours`);
                        }
                    }
                });
            }
        });

        if (totalPax > 0) {
             const base = totalPax;
             growthData.splice(0, growthData.length, base-5, base-2, base-3, base-1, base, base);
        }

        upcomingFlightsList.sort((a, b) => a.date.getTime() - b.date.getTime());
        docAlerts.sort((a, b) => a.daysLeft - b.daysLeft); // Most urgent first
        
        const overallCompliance = totalDocsCount === 0 ? 100 : Math.round((validDocsCount / totalDocsCount) * 100);

        return {
            totalPax,
            flightsToday,
            flightsUpcoming,
            expiredDocs,
            expiringDocs,
            statusCounts,
            upcomingFlightsList: upcomingFlightsList.slice(0, 7),
            docAlerts: docAlerts.slice(0, 10), // Limit to top 10 alerts
            tickerAlerts: tickerAlerts.slice(0, 15), // Limit ticker length
            overallCompliance,
            growthData,
        };
    }, [passengers, companies]);

    if (loading) {
        return <div className="min-h-screen bg-[#13131a] flex items-center justify-center text-white">Initializing Command Center...</div>;
    }

    return (
        // Added relative and z-10 to force this UI above any background patterns
        <div className="min-h-screen bg-[#13131a] text-gray-200 font-sans p-8 overflow-hidden flex flex-col relative z-10">
            
            {/* Top Bar */}
            <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
                <div className="flex items-center gap-4">
                    {appLogo ? (
                        <img src={appLogo} alt="Logo" className="w-12 h-12 object-contain bg-white/10 rounded-lg p-1" />
                    ) : (
                        <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/30">
                            <span className="text-2xl">🎫</span>
                        </div>
                    )}
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase">{dashboardTitle}</h1>
                        <p className="text-gray-500 font-medium text-sm tracking-wide uppercase">Real-time Operations Monitor</p>
                    </div>
                </div>
                <div className="flex items-end gap-6">
                    <LiveClock />
                    {onLogout && (
                        <button 
                            onClick={onLogout} 
                            className="bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 p-3 rounded-lg transition-colors border border-rose-600/30"
                            title="Sign Out"
                        >
                            <PowerIcon className="h-6 w-6" />
                        </button>
                    )}
                </div>
            </div>

            {/* Flash News Ticker */}
            <AlertTicker alerts={stats.tickerAlerts} />

            {stats.totalPax === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 p-20 border border-dashed border-gray-700 rounded-xl bg-white/5">
                    {/* Index Error or Permission Error Catcher */}
                    <div className="bg-amber-900/30 border border-amber-700/50 rounded p-4 mb-6 max-w-lg text-center">
                        <h4 className="text-amber-400 font-bold mb-2 flex items-center justify-center gap-2">
                            <DocumentWarningIcon className="h-5 w-5" />
                            Data Stream Interrupted
                        </h4>
                        <p className="text-xs text-amber-200">
                            If you are seeing this, the database connection is active but returning no data. 
                            This is usually due to a <strong>missing database index</strong> or <strong>insufficient role permissions</strong>.
                        </p>
                        <p className="text-xs text-amber-200 mt-2">
                            Developers: Check the browser console for a Firebase "index required" link.
                        </p>
                    </div>

                    <InformationCircleIcon className="w-16 h-16 mb-4 opacity-50" />
                    <h2 className="text-xl font-bold text-gray-300">System Online - Waiting for Data</h2>
                    
                    <div className="max-w-md text-center mt-6 text-sm">
                        <div className="mt-4 p-4 bg-black/30 rounded text-left font-mono text-xs text-gray-400 border border-gray-700">
                            <p className="border-b border-gray-700 pb-2 mb-2 font-bold text-indigo-400">SESSION DIAGNOSTICS</p>
                            <p>User: <span className="text-white">{currentUser?.username}</span></p>
                            <p>Role: <span className="text-white">{currentUser?.role}</span></p>
                            <p>Scope: <span className="text-white">{currentUser?.companyId || 'Global (Admin/Dev)'}</span></p>
                            {currentUser?.role === 'client' && !currentUser?.companyId && (
                                <p className="text-red-400 mt-2 font-bold">CRITICAL: Missing Company ID. Contact Administrator.</p>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <MetricCard 
                            title="Active Personnel" 
                            value={stats.totalPax} 
                            trend="up"
                            subtext="Total Headcount"
                            chartData={stats.growthData}
                            accentColor="#22c55e"
                        />
                        
                        <MetricCard 
                            title="Movements (7 Days)" 
                            value={stats.flightsUpcoming} 
                            trend={stats.flightsToday > 0 ? "up" : "neutral"}
                            subtext={`${stats.flightsToday} Departing Today`}
                            chartData={[2, 5, 3, 8, 4, stats.flightsToday, stats.flightsUpcoming]} // Mock trend + real data
                            accentColor="#f59e0b"
                        />

                        {/* Personnel Status Breakdown (Replaces Company Dist) */}
                        <div className="bg-[#24263a] rounded-lg p-6 shadow-xl border border-white/5 flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Status Overview</h3>
                                <div className="p-1.5 bg-blue-500/10 rounded-md text-blue-400"><MapIcon className="h-4 w-4"/></div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs font-bold text-gray-300 mb-1">
                                        <span className="text-emerald-400">ACTIVE DUTY</span>
                                        <span>{stats.statusCounts.active}</span>
                                    </div>
                                    <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-emerald-500 h-full" style={{ width: `${(stats.statusCounts.active / stats.totalPax) * 100}%` }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs font-bold text-gray-300 mb-1">
                                        <span className="text-blue-400 animate-pulse">IN TRANSIT</span>
                                        <span>{stats.statusCounts.transit}</span>
                                    </div>
                                    <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-blue-500 h-full" style={{ width: `${(stats.statusCounts.transit / stats.totalPax) * 100}%` }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs font-bold text-gray-300 mb-1">
                                        <span className="text-gray-400">AWAY</span>
                                        <span>{stats.statusCounts.away}</span>
                                    </div>
                                    <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-gray-500 h-full" style={{ width: `${(stats.statusCounts.away / stats.totalPax) * 100}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#24263a] rounded-lg p-6 shadow-xl border border-white/5 flex items-center justify-between relative overflow-hidden">
                            <GaugeChart value={stats.overallCompliance} color={stats.overallCompliance > 90 ? '#22c55e' : '#ef4444'} label="Compliance" />
                            <div className="flex flex-col gap-4 text-right z-10">
                                <div>
                                    <span className="block text-2xl font-bold text-white">{stats.expiredDocs}</span>
                                    <span className="text-xs font-bold text-rose-500 uppercase">Expired</span>
                                </div>
                                <div>
                                    <span className="block text-2xl font-bold text-white">{stats.expiringDocs}</span>
                                    <span className="text-xs font-bold text-amber-500 uppercase">Warning</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Section: Flight Board & Document Alerts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
                        
                        {/* Flight Board */}
                        <div className="lg:col-span-2 bg-[#24263a] rounded-lg shadow-xl border border-white/5 flex flex-col">
                            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#2a2c42]">
                                <h3 className="text-white font-bold flex items-center gap-3 tracking-wide">
                                    <CalendarIcon className="h-5 w-5 text-indigo-400" />
                                    FLIGHT BOARD
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span className="text-xs font-bold text-emerald-500 uppercase">Live Updates</span>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto px-5 py-2 custom-scrollbar">
                                {stats.upcomingFlightsList.length > 0 ? (
                                    stats.upcomingFlightsList.map((item, i) => (
                                        <FlightRow 
                                            key={i} 
                                            ticket={item.ticket} 
                                            passengerName={item.passengerName}
                                            timeDiff={item.timeDiff} 
                                        />
                                    ))
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50 py-10">
                                        <TicketIcon className="h-16 w-16 mb-2" />
                                        <p className="font-bold">NO SCHEDULED FLIGHTS</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Documents Needing Attention */}
                        <div className="bg-[#24263a] rounded-lg shadow-xl border border-white/5 flex flex-col">
                            <div className="p-5 border-b border-white/5 bg-[#2a2c42]">
                                <h3 className="text-white font-bold flex items-center gap-3 tracking-wide">
                                    <BellIcon className="h-5 w-5 text-amber-400" />
                                    DOCUMENTS NEEDING ATTENTION
                                </h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                                {stats.docAlerts.length > 0 ? (
                                    stats.docAlerts.map((alert, i) => (
                                        <DocAlertRow key={i} alert={alert} />
                                    ))
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50 py-10">
                                        <p className="font-bold text-sm">ALL DOCUMENTS COMPLIANT</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default SummaryDashboardScreen;
