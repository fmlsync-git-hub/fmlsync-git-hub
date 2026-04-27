
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    DocumentTextIcon, 
    UserGroupIcon, 
    TicketIcon, 
    BuildingOfficeIcon, 
    CalendarIcon,
    DownloadIcon,
    ClipboardDocumentIcon as ClipboardIcon,
    Bars3Icon as PrinterIcon, // Placeholder or add real one
    MagnifyingGlassIcon,
    FunnelIcon,
    ChevronDownIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon
} from '../../components/icons';
import { useBranding } from '../../context/BrandingContext';
import { useCompanies } from '../../context/CompanyContext';
import { listenToAllPassengers } from '../../services/firebase';
import { Passenger, PassengerCategory, TicketData, VisaData, PermitData } from '../../types';
import { format, isAfter, addDays, parseISO, isValid } from 'date-fns';

type ReportType = 'personnel' | 'travel' | 'companies' | 'deadlines' | 'summary';

export const ReportsScreen: React.FC = () => {
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
            setPassengers(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Helper: Safely get company name
    const getCompanyName = (id: string) => {
        const company = companies.find(c => c.id === id);
        return company ? company.name : id;
    };

    // --- Report Data Extractors ---

    const filteredPassengers = useMemo(() => {
        return passengers.filter(p => {
            const passengerName = `${p.passports[0]?.firstNames || ''} ${p.passports[0]?.surname || ''}`.toLowerCase();
            const matchesSearch = passengerName.includes(searchQuery.toLowerCase()) || 
                                p.passports[0]?.passportNumber?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = filterCategory === 'All' || p.category === filterCategory;
            const matchesCompany = filterCompany === 'All' || p.companyId === filterCompany;
            return matchesSearch && matchesCategory && matchesCompany;
        });
    }, [passengers, searchQuery, filterCategory, filterCompany]);

    const allTickets = useMemo(() => {
        const tickets: (TicketData & { passengerName: string; companyId: string })[] = [];
        passengers.forEach(p => {
            const name = `${p.passports[0]?.firstNames || ''} ${p.passports[0]?.surname || ''}`;
            p.tickets?.forEach(t => {
                tickets.push({ ...t, passengerName: name, companyId: p.companyId });
            });
        });
        // Sort by travel date descending
        return tickets.sort((a, b) => new Date(b.travelDate).getTime() - new Date(a.travelDate).getTime());
    }, [passengers]);

    const impendingTravel = useMemo(() => {
        const today = new Date();
        const next7Days = addDays(today, 7);
        return allTickets.filter(t => {
            const date = parseISO(t.travelDate);
            return isValid(date) && isAfter(date, today) && !isAfter(date, next7Days);
        });
    }, [allTickets]);

    const deadlines = useMemo(() => {
        const list: { type: string; item: string; passenger: string; expiry: string; status: 'critical' | 'warning' | 'ok' }[] = [];
        const today = new Date();
        const warningDate = addDays(today, 60);
        const criticalDate = addDays(today, 30);

        passengers.forEach(p => {
            const name = `${p.passports[0]?.firstNames || ''} ${p.passports[0]?.surname || ''}`;
            
            // Passport Deadlines
            p.passports.forEach(pp => {
                const expiry = parseISO(pp.dateOfExpiry);
                if (isValid(expiry)) {
                    list.push({
                        type: 'Passport',
                        item: pp.passportNumber,
                        passenger: name,
                        expiry: pp.dateOfExpiry,
                        status: isAfter(criticalDate, expiry) ? 'critical' : isAfter(warningDate, expiry) ? 'warning' : 'ok'
                    });
                }
            });

            // Visa Deadlines
            p.visas.forEach(v => {
                const expiry = parseISO(v.dateOfExpiry);
                if (isValid(expiry)) {
                    list.push({
                        type: 'Visa',
                        item: v.visaNumber,
                        passenger: name,
                        expiry: v.dateOfExpiry,
                        status: isAfter(criticalDate, expiry) ? 'critical' : isAfter(warningDate, expiry) ? 'warning' : 'ok'
                    });
                }
            });

            // Permit Deadlines
            p.permits.forEach(pm => {
                const expiry = parseISO(pm.dateOfExpiry);
                if (isValid(expiry)) {
                    list.push({
                        type: 'Permit',
                        item: pm.permitNumber,
                        passenger: name,
                        expiry: pm.dateOfExpiry,
                        status: isAfter(criticalDate, expiry) ? 'critical' : isAfter(warningDate, expiry) ? 'warning' : 'ok'
                    });
                }
            });
        });

        return list.sort((a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime());
    }, [passengers]);

    // --- Export Actions ---

    const handleCopyToClipboard = () => {
        let content = '';
        if (activeReport === 'personnel') {
            content = "Personnel Inventory Report\n\n";
            content += "Name\tCategory\tCompany\tPassport\n";
            filteredPassengers.forEach(p => {
                content += `${p.passports[0]?.firstNames} ${p.passports[0]?.surname}\t${p.category}\t${getCompanyName(p.companyId)}\t${p.passports[0]?.passportNumber}\n`;
            });
        } else if (activeReport === 'travel') {
            content = "Travel Ticket Report\n\n";
            content += "Passenger\tRoute\tDate\tAirline\tStatus\n";
            allTickets.forEach(t => {
                content += `${t.passengerName}\t${t.departureCity} -> ${t.arrivalCity}\t${t.travelDate}\t${t.airline}\t${t.status}\n`;
            });
        }

        navigator.clipboard.writeText(content).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    const handleDownloadCSV = () => {
        let csv = '';
        const rows: string[][] = [];

        if (activeReport === 'personnel') {
            rows.push(['First Name', 'Surname', 'Category', 'Company', 'Passport Number', 'Email', 'Phone']);
            filteredPassengers.forEach(p => {
                rows.push([
                    p.passports[0]?.firstNames || '',
                    p.passports[0]?.surname || '',
                    p.category,
                    getCompanyName(p.companyId),
                    p.passports[0]?.passportNumber || '',
                    p.contactData.email || '',
                    p.contactData.phone || ''
                ]);
            });
        } else if (activeReport === 'travel') {
            rows.push(['Passenger', 'Airline', 'Ticket #', 'Route', 'Date', 'Status']);
            allTickets.forEach(t => {
                rows.push([
                    t.passengerName,
                    t.airline,
                    t.ticketNumber,
                    `${t.departureCity} - ${t.arrivalCity}`,
                    t.travelDate,
                    t.status || 'N/A'
                ]);
            });
        } else if (activeReport === 'companies') {
            rows.push(['Company Name', 'Personnel Count']);
            companies.forEach(c => {
                const count = passengers.filter(p => p.companyId === c.id).length;
                rows.push([c.name, count.toString()]);
            });
        } else if (activeReport === 'deadlines') {
            rows.push(['Type', 'ID/Number', 'Passenger', 'Expiry Date']);
            deadlines.forEach(d => {
                rows.push([d.type, d.item, d.passenger, d.expiry]);
            });
        }

        csv = rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `report_${activeReport}_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        window.print();
    };

    // --- Sub-Components ---

    const SummaryReport = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-surface p-6 rounded-xl border border-border-default shadow-sm group hover:border-primary transition-colors">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                        <UserGroupIcon className="h-6 w-6 text-primary" />
                    </div>
                </div>
                <h3 className="text-3xl font-bold text-text-primary">{passengers.length}</h3>
                <p className="text-sm text-text-secondary">Total Personnel</p>
                <div className="mt-4 pt-4 border-t border-border-muted flex gap-2">
                    <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">
                        {passengers.filter(p => p.category === 'Local').length} Local
                    </span>
                    <span className="text-xs bg-info/10 text-info px-2 py-0.5 rounded-full">
                        {passengers.filter(p => p.category === 'Expatriate').length} Expats
                    </span>
                </div>
            </div>

            <div className="bg-surface p-6 rounded-xl border border-border-default shadow-sm group hover:border-accent transition-colors">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                        <TicketIcon className="h-6 w-6 text-accent" />
                    </div>
                </div>
                <h3 className="text-3xl font-bold text-text-primary">{allTickets.length}</h3>
                <p className="text-sm text-text-secondary">All-Time Tickets</p>
                <div className="mt-4 pt-4 border-t border-border-muted">
                    <p className="text-xs text-info font-medium flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {impendingTravel.length} Pending (Next 7 days)
                    </p>
                </div>
            </div>

            <div className="bg-surface p-6 rounded-xl border border-border-default shadow-sm group hover:border-warning transition-colors">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-warning/10 rounded-lg group-hover:bg-warning/20 transition-colors">
                        <ExclamationTriangleIcon className="h-6 w-6 text-warning" />
                    </div>
                </div>
                <h3 className="text-3xl font-bold text-text-primary">
                    {deadlines.filter(d => d.status === 'critical').length}
                </h3>
                <p className="text-sm text-text-secondary">Critical Expiries</p>
                <div className="mt-4 pt-4 border-t border-border-muted">
                    <p className="text-xs text-warning font-medium">
                        {deadlines.filter(d => d.status === 'warning').length} Warning states
                    </p>
                </div>
            </div>

            <div className="bg-surface p-6 rounded-xl border border-border-default shadow-sm group hover:border-info transition-colors">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-info/10 rounded-lg group-hover:bg-info/20 transition-colors">
                        <BuildingOfficeIcon className="h-6 w-6 text-info" />
                    </div>
                </div>
                <h3 className="text-3xl font-bold text-text-primary">{companies.length}</h3>
                <p className="text-sm text-text-secondary">Manageable Companies</p>
                <div className="mt-4 pt-4 border-t border-border-muted">
                    <p className="text-xs text-text-secondary italic">Active across all regions</p>
                </div>
            </div>
        </div>
    );

    const ReportTable = () => {
        if (activeReport === 'personnel') {
            return (
                <div className="overflow-x-auto print:overflow-visible">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-background sticky top-0 z-10">
                            <tr>
                                <th className="p-4 border-b border-border-default font-semibold text-text-secondary">Name</th>
                                <th className="p-4 border-b border-border-default font-semibold text-text-secondary">Category</th>
                                <th className="p-4 border-b border-border-default font-semibold text-text-secondary">Company</th>
                                <th className="p-4 border-b border-border-default font-semibold text-text-secondary">Email</th>
                                <th className="p-4 border-b border-border-default font-semibold text-text-secondary">Phone</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPassengers.map(p => (
                                <tr key={p.id} className="border-b border-border-muted hover:bg-surface-alt transition-colors group">
                                    <td className="p-4">
                                        <div className="font-semibold text-text-primary">
                                            {p.passports[0]?.firstNames} {p.passports[0]?.surname}
                                        </div>
                                        <div className="text-xs text-text-secondary font-mono">
                                            ID: {p.passports[0]?.passportNumber || p.id.slice(0, 8)}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            p.category === 'Local' ? 'bg-success/10 text-success' :
                                            p.category === 'Expatriate' ? 'bg-info/10 text-info' :
                                            'bg-warning/10 text-warning'
                                        }`}>
                                            {p.category}
                                        </span>
                                    </td>
                                    <td className="p-4 text-text-primary">{getCompanyName(p.companyId)}</td>
                                    <td className="p-4 text-text-secondary">{p.contactData.email || '-'}</td>
                                    <td className="p-4 text-text-secondary">{p.contactData.phone || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        if (activeReport === 'travel') {
            return (
                <div className="overflow-x-auto print:overflow-visible">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-background sticky top-0 z-10">
                            <tr>
                                <th className="p-4 border-b border-border-default font-semibold text-text-secondary">Passenger</th>
                                <th className="p-4 border-b border-border-default font-semibold text-text-secondary">Airline & Ticket</th>
                                <th className="p-4 border-b border-border-default font-semibold text-text-secondary">Route</th>
                                <th className="p-4 border-b border-border-default font-semibold text-text-secondary">Date</th>
                                <th className="p-4 border-b border-border-default font-semibold text-text-secondary">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allTickets.map(t => (
                                <tr key={t.id} className="border-b border-border-muted hover:bg-surface-alt transition-colors">
                                    <td className="p-4 font-semibold text-text-primary">{t.passengerName}</td>
                                    <td className="p-4">
                                        <div className="text-text-primary">{t.airline}</div>
                                        <div className="text-xs font-mono text-text-secondary">{t.ticketNumber}</div>
                                    </td>
                                    <td className="p-4 text-text-primary">{t.departureCity} → {t.arrivalCity}</td>
                                    <td className="p-4 text-text-primary">{t.travelDate}</td>
                                    <td className="p-4 text-xs">
                                        <span className={`px-2 py-1 rounded-full ${
                                            t.status === 'Issued' ? 'bg-success/10 text-success' :
                                            t.status === 'Reserved' ? 'bg-info/10 text-info' :
                                            'bg-warning/10 text-warning'
                                        }`}>
                                            {t.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        if (activeReport === 'deadlines') {
            return (
                <div className="overflow-x-auto print:overflow-visible">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-background sticky top-0 z-10">
                            <tr>
                                <th className="p-4 border-b border-border-default font-semibold text-text-secondary">Type</th>
                                <th className="p-4 border-b border-border-default font-semibold text-text-secondary">Passenger</th>
                                <th className="p-4 border-b border-border-default font-semibold text-text-secondary">Reference #</th>
                                <th className="p-4 border-b border-border-default font-semibold text-text-secondary">Expiry Date</th>
                                <th className="p-4 border-b border-border-default font-semibold text-text-secondary">Risk</th>
                            </tr>
                        </thead>
                        <tbody>
                            {deadlines.map((d, i) => (
                                <tr key={i} className="border-b border-border-muted hover:bg-surface-alt transition-colors">
                                    <td className="p-4 font-semibold text-text-primary">{d.type}</td>
                                    <td className="p-4 text-text-primary">{d.passenger}</td>
                                    <td className="p-4 font-mono text-xs">{d.item}</td>
                                    <td className="p-4 text-text-primary">{d.expiry}</td>
                                    <td className="p-4">
                                        <span className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold ${
                                            d.status === 'critical' ? 'bg-danger text-white' :
                                            d.status === 'warning' ? 'bg-warning text-white' :
                                            'bg-success/10 text-success'
                                        }`}>
                                            {d.status === 'critical' && <ExclamationTriangleIcon className="h-3.5 w-3.5" />}
                                            {d.status === 'ok' && <CheckCircleIcon className="h-3.5 w-3.5" />}
                                            {d.status.toUpperCase()}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        return <div className="p-8 text-center text-text-secondary italic">Select a specialized report module to view details</div>;
    };

    return (
        <div className="p-4 sm:p-8 min-h-screen animate-in fade-in duration-500 print:p-0 bg-background">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 print:hidden">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
                        <DocumentTextIcon className="h-8 w-8 text-primary" />
                        Reports & Documentation
                    </h1>
                    <p className="text-text-secondary mt-1">Generate, compile and export system data for administrative use.</p>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        onClick={handleCopyToClipboard}
                        className="flex items-center gap-2 px-4 py-2 bg-surface border border-border-default rounded-lg hover:border-primary text-text-primary font-semibold transition-all active:scale-95 text-sm"
                    >
                        {copySuccess ? <CheckCircleIcon className="h-4 w-4 text-success" /> : <ClipboardIcon className="h-4 w-4" />}
                        {copySuccess ? 'Copied!' : 'Copy to Clipboard'}
                    </button>
                    <button 
                         onClick={handleDownloadCSV}
                         className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark shadow-sm transition-all active:scale-95 text-sm"
                    >
                        <DownloadIcon className="h-4 w-4" />
                        Download CSV
                    </button>
                    <button 
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-surface-alt text-text-primary rounded-lg hover:bg-surface-alt/70 border border-border-default shadow-sm transition-all active:scale-95 text-sm"
                    >
                        <PrinterIcon className="h-4 w-4" />
                        Print / PDF
                    </button>
                </div>
            </div>

            {/* Print Header (Only visible when printing) */}
            <div className="hidden print:block mb-8 pb-4 border-b border-black">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold text-black uppercase">Official Data Report</h1>
                        <p className="text-sm text-gray-600">Generated on: {format(new Date(), 'PPPP p')}</p>
                        <p className="text-sm font-bold text-gray-800">Module: {activeReport.toUpperCase()}</p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex overflow-x-auto gap-2 mb-8 pb-2 no-scrollbar print:hidden">
                {(['summary', 'personnel', 'travel', 'companies', 'deadlines'] as ReportType[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveReport(tab)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold whitespace-nowrap transition-all ${
                            activeReport === tab 
                            ? 'bg-primary text-white ring-4 ring-primary/20 shadow-lg' 
                            : 'bg-surface text-text-secondary border border-border-default hover:border-primary'
                        }`}
                    >
                        {tab === 'summary' && <DownloadIcon className="h-4 w-4 rotate-180" />}
                        {tab === 'personnel' && <UserGroupIcon className="h-4 w-4" />}
                        {tab === 'travel' && <TicketIcon className="h-4 w-4" />}
                        {tab === 'companies' && <BuildingOfficeIcon className="h-4 w-4" />}
                        {tab === 'deadlines' && <CalendarIcon className="h-4 w-4" />}
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64 text-text-secondary gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="animate-pulse font-medium">Extracting data for reports...</p>
                </div>
            ) : (
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeReport}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                    >
                        {activeReport === 'summary' && <SummaryReport />}

                        {/* Filters (Hidden for Summary) */}
                        {activeReport !== 'summary' && (
                            <div className="bg-surface p-4 rounded-xl border border-border-default shadow-sm mb-6 flex flex-wrap items-center gap-4 print:hidden">
                                <div className="relative flex-1 min-w-[250px]">
                                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                                    <input 
                                        type="text"
                                        placeholder="Quick search by name or ID..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-background border border-border-default rounded-lg text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative">
                                        <select 
                                            value={filterCategory}
                                            onChange={(e) => setFilterCategory(e.target.value as any)}
                                            className="appearance-none pl-4 pr-10 py-2.5 bg-background border border-border-default rounded-lg text-text-primary font-medium focus:ring-2 focus:ring-primary outline-none"
                                        >
                                            <option value="All">All Categories</option>
                                            <option value="Local">Local</option>
                                            <option value="Expatriate">Expatriate</option>
                                            <option value="Walk-in">Walk-in</option>
                                        </select>
                                        <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
                                    </div>

                                    <div className="relative">
                                        <select 
                                            value={filterCompany}
                                            onChange={(e) => setFilterCompany(e.target.value)}
                                            className="appearance-none pl-4 pr-10 py-2.5 bg-background border border-border-default rounded-lg text-text-primary font-medium focus:ring-2 focus:ring-primary outline-none"
                                        >
                                            <option value="All">All Companies</option>
                                            {companies.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-surface rounded-xl border border-border-default shadow-sm overflow-hidden min-h-[400px]">
                            {/* Table Header with Counts */}
                            {activeReport !== 'summary' && (
                                <div className="p-4 bg-background/50 border-b border-border-default flex justify-between items-center print:hidden">
                                    <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                        <FunnelIcon className="h-5 w-5 text-text-secondary" />
                                        {activeReport.charAt(0).toUpperCase() + activeReport.slice(1)} List
                                    </h2>
                                    <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                                        {activeReport === 'personnel' ? filteredPassengers.length : 
                                         activeReport === 'travel' ? allTickets.length : 
                                         activeReport === 'deadlines' ? deadlines.length : 0} Records Found
                                    </span>
                                </div>
                            )}

                            <ReportTable />
                        </div>
                    </motion.div>
                </AnimatePresence>
            )}

            {/* Legend for deadlines */}
            {activeReport === 'deadlines' && (
                <div className="mt-6 flex flex-wrap gap-6 text-sm text-text-secondary print:hidden">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-danger" />
                        <span>Critical: Expiry in {'<'} 30 days</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-warning" />
                        <span>Warning: Expiry in {'<'} 60 days</span>
                    </div>
                </div>
            )}
        </div>
    );
};
