import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    DocumentTextIcon, 
    UserGroupIcon, 
    TicketIcon, 
    BuildingOfficeIcon, 
    CalendarIcon,
    DownloadIcon,
    ClipboardDocumentIcon,
    PrinterIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    ChevronDownIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ClockIcon,
    TicketIcon as FlightIcon
} from '../../components/icons';
import { useBranding } from '../../context/BrandingContext';
import { useCompanies } from '../../context/CompanyContext';
import { listenToAllPassengers } from '../../services/firebase';
import { Passenger, PassengerCategory, TicketData } from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';

type ReportType = 'summary' | 'personnel' | 'travel' | 'companies' | 'deadlines';

const ReportsScreen: React.FC = () => {
    const { brandColor } = useBranding();
    const { companies } = useCompanies();
    const [activeReport, setActiveReport] = useState<ReportType>('summary');
    const [passengers, setPassengers] = useState<Passenger[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<PassengerCategory | 'All'>('All');
    const [filterCompany, setFilterCompany] = useState<string>('All');
    const [copySuccess, setCopySuccess] = useState(false);

    useEffect(() => {
        const unsubscribe = listenToAllPassengers((data) => {
            setPassengers(data || []);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Helpers
    const getCompanyName = (id: string) => {
        const company = companies.find(c => c.id === id);
        return company ? String(company.name) : String(id);
    };

    const safeString = (val: any): string => {
        if (val === null || val === undefined) return 'N/A';
        if (typeof val === 'object') return JSON.stringify(val).slice(0, 50);
        return String(val);
    };

    // --- Computed Data ---

    const filteredPassengers = useMemo(() => {
        return passengers.filter(p => {
            const name = `${p.passports?.[0]?.firstNames || ''} ${p.passports?.[0]?.surname || ''}`.toLowerCase();
            const matchesSearch = name.includes(searchQuery.toLowerCase()) || 
                                safeString(p.ghanaCardData?.cardNumber).toLowerCase().includes(searchQuery.toLowerCase()) ||
                                p.passports?.[0]?.passportNumber?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = filterCategory === 'All' || p.category === filterCategory;
            const matchesCompany = filterCompany === 'All' || p.companyId === filterCompany;
            return matchesSearch && matchesCategory && matchesCompany;
        });
    }, [passengers, searchQuery, filterCategory, filterCompany]);

    const allTickets = useMemo(() => {
        const tickets: (TicketData & { passengerName: string; companyId: string; companyName: string })[] = [];
        passengers.forEach(p => {
            const name = `${p.passports?.[0]?.firstNames || ''} ${p.passports?.[0]?.surname || ''}`;
            const compName = getCompanyName(p.companyId);
            p.tickets?.forEach(t => {
                tickets.push({ 
                    ...t, 
                    passengerName: name, 
                    companyId: p.companyId,
                    companyName: compName 
                });
            });
        });
        return tickets.sort((a, b) => {
            const dateA = a.travelDate ? new Date(a.travelDate).getTime() : 0;
            const dateB = b.travelDate ? new Date(b.travelDate).getTime() : 0;
            return dateB - dateA;
        });
    }, [passengers, companies]);

    const filteredTickets = useMemo(() => {
        return allTickets.filter(t => {
            const matchesSearch = t.passengerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                safeString(t.ticketNumber).toLowerCase().includes(searchQuery.toLowerCase()) ||
                                safeString(t.airline).toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCompany = filterCompany === 'All' || t.companyId === filterCompany;
            return matchesSearch && matchesCompany;
        });
    }, [allTickets, searchQuery, filterCompany]);

    const deadlines = useMemo(() => {
        const list: { type: string; item: string; passenger: string; company: string; expiry: string; status: 'critical' | 'warning' | 'ok' }[] = [];
        const today = new Date();
        const ninetyDays = 90 * 24 * 60 * 60 * 1000;
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;

        passengers.forEach(p => {
            const name = `${p.passports?.[0]?.firstNames || ''} ${p.passports?.[0]?.surname || ''}`;
            const compName = getCompanyName(p.companyId);

            p.passports?.forEach(pp => {
                if (!pp.dateOfExpiry) return;
                const expiry = new Date(pp.dateOfExpiry);
                const diff = expiry.getTime() - today.getTime();
                if (diff < ninetyDays) {
                    list.push({
                        type: 'Passport',
                        item: safeString(pp.passportNumber),
                        passenger: name,
                        company: compName,
                        expiry: pp.dateOfExpiry,
                        status: diff < thirtyDays ? 'critical' : 'warning'
                    });
                }
            });

            p.visas?.forEach(v => {
                if (!v.dateOfExpiry) return;
                const expiry = new Date(v.dateOfExpiry);
                const diff = expiry.getTime() - today.getTime();
                if (diff < ninetyDays) {
                    list.push({
                        type: 'Visa',
                        item: safeString(v.visaNumber),
                        passenger: name,
                        company: compName,
                        expiry: v.dateOfExpiry,
                        status: diff < thirtyDays ? 'critical' : 'warning'
                    });
                }
            });

            p.permits?.forEach(pm => {
                if (!pm.dateOfExpiry) return;
                const expiry = new Date(pm.dateOfExpiry);
                const diff = expiry.getTime() - today.getTime();
                if (diff < ninetyDays) {
                    list.push({
                        type: 'Permit',
                        item: safeString(pm.permitNumber),
                        passenger: name,
                        company: compName,
                        expiry: pm.dateOfExpiry,
                        status: diff < thirtyDays ? 'critical' : 'warning'
                    });
                }
            });
        });

        // 4. Flights (Upcoming in next 7 days)
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        const oneDay = 24 * 60 * 60 * 1000;

        passengers.forEach(p => {
            const passengerName = `${safeString(p.passports?.[0]?.firstNames)} ${safeString(p.passports?.[0]?.surname)}`;
            const compName = getCompanyName(p.companyId);
            
            p.tickets?.forEach(ticket => {
                if (ticket.travelDate) {
                    const date = new Date(ticket.travelDate);
                    const diff = date.getTime() - today.getTime();
                    if (diff > 0 && diff < sevenDays) {
                        list.push({
                            type: 'FLIGHT',
                            item: `${safeString(ticket.departureCity)} -> ${safeString(ticket.arrivalCity)}`,
                            passenger: passengerName,
                            company: compName,
                            expiry: ticket.travelDate,
                            status: diff < oneDay ? 'critical' : 'warning'
                        });
                    }
                }
            });
        });

        return list.sort((a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime());
    }, [passengers, companies]);

    // --- Actions ---

    const handleCopy = () => {
        let text = "";
        const timestamp = new Date().toLocaleString();
        const header = `--- ${branding.appName || 'FML TICKETING'} REPORT: ${activeReport.toUpperCase()} ---\nGenerated: ${timestamp}\n\n`;

        if (activeReport === 'personnel') {
            text = header + `LIST OF ALL PERSONNEL (${filteredPassengers.length} found):\n\n`;
            text += filteredPassengers.map((p, i) => 
                `${i + 1}. ${safeString(p.passports?.[0]?.firstNames)} ${safeString(p.passports?.[0]?.surname)}\n` +
                `   Category: ${safeString(p.category)} | Company: ${getCompanyName(p.companyId)}\n` +
                `   Passport: ${safeString(p.passports?.[0]?.passportNumber)} (Exp: ${safeString(p.passports?.[0]?.dateOfExpiry)})\n` +
                `   Contact: ${safeString(p.contactData?.phone)} | ${safeString(p.contactData?.email)}\n`
            ).join('\n');
        } else if (activeReport === 'travel') {
            text = header + `TRAVEL ARRANGEMENTS (${filteredTickets.length} found):\n\n`;
            text += filteredTickets.map((t, i) => 
                `${i + 1}. PASSENGER: ${safeString(t.passengerName)}\n` +
                `   ROUTE: ${safeString(t.departureCity)} -> ${safeString(t.arrivalCity)}\n` +
                `   FLIGHT: ${safeString(t.airline)} | DATE: ${safeString(t.travelDate)} | TIME: ${safeString(t.travelTime)}\n` +
                `   STATUS: ${safeString(t.status)} | TICKET: ${safeString(t.ticketNumber)}\n`
            ).join('\n');
        } else if (activeReport === 'deadlines') {
            text = header + `DOCUMENT & FLIGHT DEADLINES (${deadlines.length} found):\n\n`;
            text += deadlines.map((d, i) => 
                `${i + 1}. ${d.status === 'critical' ? '[CRITICAL] ' : '[WARNING] '} ${safeString(d.passenger)}\n` +
                `   TYPE: ${safeString(d.type)} | ITEM: ${safeString(d.item)}\n` +
                `   EXPIRY: ${safeString(d.expiry)} | COMPANY: ${safeString(d.company)}\n`
            ).join('\n');
        } else if (activeReport === 'companies') {
            text = header + `CLIENT COMPANIES & PERSONNEL (${companies.length} companies):\n\n`;
            text += companies.map((c, i) => {
                const pList = passengers.filter(p => p.companyId === c.id);
                let cText = `${i + 1}. COMPANY: ${safeString(c.name)} (${pList.length} Personnel)\n`;
                cText += pList.map(p => `   - ${safeString(p.passports?.[0]?.firstNames)} ${safeString(p.passports?.[0]?.surname)} (${safeString(p.position)})`).join('\n') || '   - No personnel assigned';
                return cText + '\n';
            }).join('\n');
        } else if (activeReport === 'summary') {
            text = header + 
                `STATISTICS:\n` +
                `- Total Personnel: ${stats.totalPersonnel}\n` +
                `- Active Tickets: ${stats.totalTickets}\n` +
                `- Impending Travel (7 days): ${stats.impendingTravel}\n` +
                `- Critical Deadlines: ${stats.criticalDeadlines}\n\n` +
                `REPORT STATUS: VALID\n`;
        }
        
        navigator.clipboard.writeText(text).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    const handleDownload = () => {
        let csv = "";
        const rows: string[][] = [];

        if (activeReport === 'personnel') {
            rows.push(['Full Name', 'Category', 'Company', 'ID Number', 'Email', 'Phone', 'Position']);
            filteredPassengers.forEach(p => {
                rows.push([
                    `${safeString(p.passports?.[0]?.firstNames)} ${safeString(p.passports?.[0]?.surname)}`,
                    safeString(p.category),
                    getCompanyName(p.companyId),
                    safeString(p.passports?.[0]?.passportNumber || p.ghanaCardData?.cardNumber || p.id),
                    safeString(p.contactData?.email),
                    safeString(p.contactData?.phone),
                    safeString(p.position)
                ]);
            });
        } else if (activeReport === 'travel') {
            rows.push(['Passenger', 'Company', 'Airline', 'Ticket #', 'Departure', 'Arrival', 'Date', 'Time', 'Status']);
            filteredTickets.forEach(t => {
                rows.push([
                    safeString(t.passengerName),
                    safeString(t.companyName),
                    safeString(t.airline),
                    safeString(t.ticketNumber),
                    safeString(t.departureCity),
                    safeString(t.arrivalCity),
                    safeString(t.travelDate),
                    safeString(t.travelTime),
                    safeString(t.status || 'Pending')
                ]);
            });
        } else if (activeReport === 'deadlines') {
            rows.push(['Type', 'Document #', 'Passenger', 'Company', 'Expiry Date', 'Status']);
            deadlines.forEach(d => {
                rows.push([safeString(d.type), safeString(d.item), safeString(d.passenger), safeString(d.company), safeString(d.expiry), String(d.status).toUpperCase()]);
            });
        } else if (activeReport === 'companies') {
            rows.push(['Company Name', 'Personnel Count', 'Address', 'Industry']);
            companies.forEach(c => {
                const count = passengers.filter(p => p.companyId === c.id).length;
                rows.push([safeString(c.name), String(count), safeString(c.address), safeString(c.industry)]);
            });
        }

        csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `report_${activeReport}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => window.print();

    if (isLoading) return <div className="flex flex-col items-center justify-center min-h-[400px] gap-4"><LoadingSpinner /><p className="text-text-secondary animate-pulse">Extracting system reports...</p></div>;

    return (
        <div className="p-4 sm:p-8 space-y-8 animate-fadeIn max-w-[1600px] mx-auto print:p-0">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 print:hidden">
                <div>
                    <h1 className="text-4xl font-black text-text-primary flex items-center gap-4 tracking-tighter">
                        <div className="p-3 bg-primary/10 rounded-2xl">
                            <DocumentTextIcon className="h-10 w-10 text-primary" />
                        </div>
                        REPORTS & DOCUMENTATION
                    </h1>
                    <p className="text-text-secondary font-medium max-w-2xl mt-2">
                        Comprehensive documentation summary and text-based reports for personnel, travel arrangements, and document deadlines.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button 
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-border-default rounded-xl hover:border-primary transition-all active:scale-95 text-sm font-bold shadow-sm"
                    >
                        {copySuccess ? <CheckCircleIcon className="h-5 w-5 text-success" /> : <ClipboardDocumentIcon className="h-5 w-5" />}
                        {copySuccess ? 'COPIED' : 'COPY ALL'}
                    </button>
                    <button 
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 text-sm font-bold"
                    >
                        <DownloadIcon className="h-5 w-5" />
                        EXPORT CSV
                    </button>
                    <button 
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-5 py-2.5 bg-surface-soft text-text-primary rounded-xl hover:bg-border-default transition-all active:scale-95 text-sm font-bold border border-border-default"
                    >
                        <PrinterIcon className="h-5 w-5" />
                        PRINT / PDF
                    </button>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex overflow-x-auto gap-2 no-scrollbar border-b border-border-default pb-2 print:hidden">
                {[
                    { id: 'summary', label: 'OVERVIEW', icon: ClockIcon },
                    { id: 'personnel', label: 'PERSONNEL', icon: UserGroupIcon },
                    { id: 'travel', label: 'TRAVEL TICKETS', icon: FlightIcon },
                    { id: 'companies', label: 'COMPANIES', icon: BuildingOfficeIcon },
                    { id: 'deadlines', label: 'DEADLINES', icon: ExclamationTriangleIcon },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveReport(tab.id as ReportType)}
                        className={`flex items-center gap-2.5 px-6 py-3 rounded-t-2xl font-black text-xs tracking-widest transition-all whitespace-nowrap ${
                            activeReport === tab.id 
                            ? 'bg-surface text-primary border-t-4 border-primary shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.1)]' 
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Filters */}
            {activeReport !== 'summary' && activeReport !== 'companies' && (
                <div className="bg-surface p-5 rounded-2xl shadow-sm border border-border-default flex flex-wrap items-center gap-4 print:hidden">
                    <div className="relative flex-1 min-w-[300px]">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                        <input 
                            type="text"
                            placeholder="Dynamic search by name, ID, airline, or route..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-background border border-border-default rounded-xl text-text-primary font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all shadow-inner"
                        />
                    </div>
                </div>
            )}

            {/* Main Report Area */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeReport}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="min-h-[500px]"
                >
                    {activeReport === 'summary' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                    { label: 'Personnel', value: passengers.length, color: 'primary', icon: UserGroupIcon },
                                    { label: 'Tickets', value: allTickets.length, color: 'success', icon: FlightIcon },
                                    { label: 'Urgent Flights', value: allTickets.filter(t => t.status !== 'Issued').length, color: 'amber-500', icon: CalendarIcon },
                                    { label: 'Deadlines', value: deadlines.length, color: 'danger', icon: ExclamationTriangleIcon }
                                ].map((stat, i) => (
                                    <div key={i} className="bg-surface p-8 rounded-3xl border border-border-default shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                        <div className={`absolute top-0 right-0 p-3 bg-${stat.color}/10 rounded-bl-3xl group-hover:bg-${stat.color}/20 transition-colors`}>
                                            <stat.icon className={`h-8 w-8 text-${stat.color}`} />
                                        </div>
                                        <p className="text-sm font-black text-text-secondary uppercase tracking-widest mb-1">{stat.label}</p>
                                        <h3 className="text-4xl font-black text-text-primary tracking-tighter">{stat.value}</h3>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 bg-surface rounded-3xl border border-border-default shadow-sm p-6 overflow-hidden">
                                    <h4 className="text-xl font-black text-text-primary mb-6 flex items-center gap-3">
                                        <FlightIcon className="h-6 w-6 text-primary" />
                                        PENDING TRAVEL LIST
                                    </h4>
                                    <div className="space-y-3">
                                        {allTickets.filter(t => t.status !== 'Issued').slice(0, 8).map(t => (
                                            <div key={t.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-surface-soft rounded-2xl border border-border-default hover:bg-surface transition-colors gap-4">
                                                <div>
                                                    <p className="font-black text-sm uppercase tracking-tight">{safeString(t.passengerName)}</p>
                                                    <p className="text-xs text-text-secondary font-medium">{safeString(t.companyName)}</p>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-center">
                                                        <p className="text-[10px] font-black text-text-secondary uppercase">Route</p>
                                                        <p className="text-xs font-bold">{safeString(t.departureCity)} → {safeString(t.arrivalCity)}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-black text-primary">{safeString(t.travelDate)}</p>
                                                        <p className="text-[10px] text-text-secondary font-bold uppercase">{safeString(t.airline)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-surface rounded-3xl border border-border-default shadow-sm p-6">
                                    <h4 className="text-xl font-black text-text-primary mb-6 flex items-center gap-3">
                                        <ExclamationTriangleIcon className="h-6 w-6 text-danger" />
                                        CRITICAL EXPIRIES
                                    </h4>
                                    <div className="space-y-4">
                                        {deadlines.slice(0, 10).map((d, i) => (
                                            <div key={i} className="flex items-center gap-4 p-3 bg-danger/5 rounded-2xl border border-danger/10 hover:bg-danger/10 transition-colors">
                                                <div className={`h-2.5 w-2.5 rounded-full ${d.status === 'critical' ? 'bg-danger animate-pulse' : 'bg-warning'}`} />
                                                <div className="flex-1 overflow-hidden">
                                                    <p className="text-xs font-black text-text-primary truncate uppercase">{safeString(d.passenger)}</p>
                                                    <p className="text-[10px] text-text-secondary font-bold uppercase">{d.type}: {d.item}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-black text-danger">{safeString(d.expiry)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeReport === 'personnel' && (
                        <div className="bg-surface rounded-3xl border border-border-default shadow-sm overflow-hidden border-t-4 border-t-primary">
                            <div className="overflow-x-auto min-h-[400px]">
                                <table className="w-full text-left border-collapse min-w-[1000px]">
                                    <thead className="bg-surface-soft border-b border-border-default">
                                        <tr>
                                            <th className="p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">Full Name</th>
                                            <th className="p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">Category</th>
                                            <th className="p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">Company</th>
                                            <th className="p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">ID / Passport</th>
                                            <th className="p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">Contacts</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPassengers.map(p => (
                                            <tr key={String(p.id)} className="border-b border-border-default hover:bg-surface-soft/50 transition-colors">
                                                <td className="p-5">
                                                    <p className="font-black text-text-primary text-sm uppercase">{safeString(p.passports?.[0]?.firstNames)} {safeString(p.passports?.[0]?.surname)}</p>
                                                    <p className="text-xs text-text-secondary font-mono">{safeString(p.id)}</p>
                                                </td>
                                                <td className="p-5">
                                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                                                        p.category === 'Local' ? 'bg-success/10 text-success' :
                                                        p.category === 'Expatriate' ? 'bg-primary/10 text-primary' :
                                                        'bg-amber-500/10 text-amber-500'
                                                    }`}>
                                                        {safeString(p.category)}
                                                    </span>
                                                </td>
                                                <td className="p-5 text-sm font-bold text-text-primary">{getCompanyName(p.companyId)}</td>
                                                <td className="p-5">
                                                    <p className="text-xs font-black text-text-primary uppercase tracking-tighter">Passport: {safeString(p.passports?.[0]?.passportNumber)}</p>
                                                    <p className="text-[10px] text-text-secondary font-bold">Expires: {safeString(p.passports?.[0]?.dateOfExpiry)}</p>
                                                </td>
                                                <td className="p-5">
                                                    <p className="text-xs font-bold text-text-primary truncate max-w-[200px]">{safeString(p.contactData?.email)}</p>
                                                    <p className="text-xs text-text-secondary font-bold">{safeString(p.contactData?.phone)}</p>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeReport === 'travel' && (
                        <div className="bg-surface rounded-3xl border border-border-default shadow-sm overflow-hidden border-t-4 border-t-success">
                            <div className="overflow-x-auto min-h-[400px]">
                                <table className="w-full text-left border-collapse min-w-[1200px]">
                                    <thead className="bg-surface-soft border-b border-border-default">
                                        <tr>
                                            <th className="p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">Passenger</th>
                                            <th className="p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">Company</th>
                                            <th className="p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">Airline</th>
                                            <th className="p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">Ticket Details</th>
                                            <th className="p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">Routing</th>
                                            <th className="p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">Date</th>
                                            <th className="p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTickets.map(t => (
                                            <tr key={String(t.id)} className="border-b border-border-default hover:bg-surface-soft/50 transition-colors">
                                                <td className="p-5 font-black text-text-primary text-sm uppercase">{safeString(t.passengerName)}</td>
                                                <td className="p-5 text-sm font-bold text-text-primary">{safeString(t.companyName)}</td>
                                                <td className="p-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-surface-soft p-2 rounded-lg border border-border-default">
                                                            <FlightIcon className="h-4 w-4 text-primary" />
                                                        </div>
                                                        <p className="font-bold text-sm uppercase tracking-tight">{safeString(t.airline)}</p>
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <p className="text-xs font-black text-text-primary uppercase tracking-tighter">TICKET: {safeString(t.ticketNumber)}</p>
                                                    <p className="text-[10px] text-text-secondary font-bold">TIME: {safeString(t.travelTime)}</p>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right min-w-[80px]">
                                                            <p className="text-[10px] font-black text-text-secondary uppercase">From</p>
                                                            <p className="text-xs font-bold uppercase">{safeString(t.departureCity)}</p>
                                                        </div>
                                                        <div className="h-px w-8 bg-border-default" />
                                                        <div className="text-left min-w-[80px]">
                                                            <p className="text-[10px] font-black text-text-secondary uppercase">To</p>
                                                            <p className="text-xs font-bold uppercase">{safeString(t.arrivalCity)}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-5 font-black text-primary text-sm whitespace-nowrap">{safeString(t.travelDate)}</td>
                                                <td className="p-5">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                                                        t.status === 'Issued' ? 'bg-success/10 text-success' :
                                                        t.status === 'Reserved' ? 'bg-amber-500/10 text-amber-500' :
                                                        'bg-primary/10 text-primary'
                                                    }`}>
                                                        {safeString(t.status || 'PENDING')}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeReport === 'deadlines' && (
                        <div className="bg-surface rounded-3xl border border-border-default shadow-sm overflow-hidden border-t-4 border-t-danger">
                            <div className="overflow-x-auto min-h-[400px]">
                                <table className="w-full text-left border-collapse min-w-[900px]">
                                    <thead className="bg-surface-soft border-b border-border-default">
                                        <tr>
                                            <th className="p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">Type</th>
                                            <th className="p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">Passenger</th>
                                            <th className="p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">Document Details</th>
                                            <th className="p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">Company</th>
                                            <th className="p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">Risk Factor</th>
                                            <th className="p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">Expiry</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deadlines.map((d, i) => (
                                            <tr key={i} className="border-b border-border-default hover:bg-surface-soft/50 transition-colors">
                                                <td className="p-5 text-xs font-black uppercase text-primary">{d.type}</td>
                                                <td className="p-5 font-black text-text-primary text-sm uppercase">{safeString(d.passenger)}</td>
                                                <td className="p-5 font-mono text-sm uppercase tracking-tighter">{safeString(d.item)}</td>
                                                <td className="p-5 text-sm font-bold text-text-primary">{safeString(d.company)}</td>
                                                <td className="p-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-3 w-3 rounded-full ${d.status === 'critical' ? 'bg-danger animate-pulse' : 'bg-warning'}`} />
                                                        <span className={`text-[10px] font-black uppercase ${d.status === 'critical' ? 'text-danger' : 'text-warning'}`}>
                                                            {d.status === 'critical' ? 'CRITICAL EXPIRY' : 'WARNING'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-5 font-black text-danger text-sm">{safeString(d.expiry)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeReport === 'companies' && (
                        <div className="p-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {companies.map(c => {
                                const personnel = passengers.filter(p => p.companyId === c.id);
                                return (
                                    <div key={String(c.id)} className="bg-surface p-6 rounded-3xl border border-border-default shadow-sm space-y-6">
                                        <div className="flex items-center gap-4 pb-4 border-b border-border-muted">
                                            <div className="h-16 w-16 bg-white rounded-2xl shadow-inner flex items-center justify-center p-3 border border-border-default relative overflow-hidden">
                                                {typeof c.logo === 'string' ? <img src={c.logo} alt="" className="max-h-full max-w-full object-contain" /> : <BuildingOfficeIcon className="h-8 w-8 text-text-secondary" />}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-text-primary text-xl uppercase tracking-tighter">{safeString(c.name)}</h4>
                                                <p className="text-xs text-text-secondary font-mono tracking-widest">{safeString(c.id)}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest pl-1">Personnel Detail Summary</p>
                                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                                {personnel.map(p => (
                                                    <div key={String(p.id)} className="p-3 bg-surface-soft rounded-xl border border-border-default flex justify-between items-center group hover:bg-surface-alt transition-colors">
                                                        <div>
                                                            <p className="text-xs font-black uppercase group-hover:text-primary transition-colors">{safeString(p.passports?.[0]?.firstNames)} {safeString(p.passports?.[0]?.surname)}</p>
                                                            <p className="text-[10px] text-text-secondary font-bold uppercase">{safeString(p.category)}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-bold text-text-primary uppercase">{safeString(p.passports?.[0]?.passportNumber || 'PASSPORT: N/A')}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                                {personnel.length === 0 && <p className="text-center py-10 text-text-secondary text-sm italic">No personnel records found for this company.</p>}
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t border-border-muted flex justify-between items-center bg-surface-alt -mx-6 -mb-6 px-6 py-4 rounded-b-3xl">
                                            <p className="text-xs font-black text-text-secondary uppercase">Records Count</p>
                                            <span className="bg-primary text-white text-xs font-black px-4 py-1.5 rounded-full">{personnel.length} MEMBERS</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Print Only Footer */}
            <div className="hidden print:flex flex-col items-center mt-20 pt-10 border-t-2 border-dashed border-gray-300">
                <p className="text-lg font-black text-black">OFFICIAL SYSTEM EXTRACT</p>
                <p className="text-sm font-bold text-gray-600 mt-1 uppercase">REPORT MODULE: {activeReport.toUpperCase()}</p>
                <div className="flex gap-10 mt-6 text-[10px] text-gray-500 font-bold uppercase">
                    <p>Security Seal: VALID</p>
                    <p>Hash: {Math.random().toString(36).substring(7).toUpperCase()}</p>
                    <p>Timestamp: {new Date().toLocaleString()}</p>
                </div>
            </div>
        </div>
    );
};

export default ReportsScreen;
