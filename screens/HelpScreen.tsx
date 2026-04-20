
import React, { useState, useRef, useEffect } from 'react';
import { DownloadIcon } from '../components/icons/index';
import { useBranding } from '../context/BrandingContext';

// --- Declare external libraries from CDN ---
declare const jspdf: any;
declare const html2canvas: any;


// --- Reusable Components for this screen ---
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`bg-surface rounded-lg shadow-md border border-border-default ${className || ''}`}>
        {children}
    </div>
);

const Button: React.FC<{ children: React.ReactNode; onClick?: () => void; disabled?: boolean }> = ({ children, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled} className="flex items-center gap-2 px-4 py-2 rounded-md font-semibold shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-primary text-white hover:bg-primary-dark focus:ring-primary disabled:bg-neutral-600 disabled:cursor-not-allowed">
        {children}
    </button>
);

const AccordionItem: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-border-default">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-left py-4 px-2 hover:bg-surface-soft/50 transition-colors"
            >
                <span className="font-semibold text-text-primary">{title}</span>
                <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {isOpen && <div className="p-4 bg-surface-soft/50 prose prose-invert max-w-none prose-p:text-text-secondary prose-headings:text-text-primary prose-strong:text-text-primary prose-li:text-text-secondary">{children}</div>}
        </div>
    );
};


const HelpScreen: React.FC = () => {
    const { manualTitle } = useBranding();
    const [activeTab, setActiveTab] = useState<'manual' | 'faq'>('manual');
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const manualContentRef = useRef<HTMLDivElement>(null);
    const [pdfFilename, setPdfFilename] = useState('FML_Ticketing_User_Manual');

    useEffect(() => {
        if (manualTitle) {
            const newFilename = manualTitle.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
            setPdfFilename(newFilename);
        }
    }, [manualTitle]);

    const handleDownloadPdf = async () => {
        if (!manualContentRef.current) return;
        setIsGeneratingPdf(true);
        try {
            const { jsPDF } = jspdf;
            const canvas = await html2canvas(manualContentRef.current, {
                scale: 2, // Higher scale for better quality
                backgroundColor: 'rgb(var(--color-background))',
                useCORS: true,
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = imgWidth / imgHeight;
            const canvasPdfWidth = pdfWidth - 20; // with margin
            const canvasPdfHeight = canvasPdfWidth / ratio;
            
            let position = 10;
            let heightLeft = canvasPdfHeight;

            pdf.addImage(imgData, 'PNG', 10, position, canvasPdfWidth, canvasPdfHeight);
            heightLeft -= (pdfHeight - 20);

            while (heightLeft > 0) {
                position -= (pdfHeight - 20);
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 10, position, canvasPdfWidth, canvasPdfHeight);
                heightLeft -= (pdfHeight - 20);
            }
            
            let finalFilename = pdfFilename.trim().replace(/\.pdf$/i, '');
            if (!finalFilename) {
                finalFilename = 'User_Manual'; // Fallback if input is empty
            }
            finalFilename += '.pdf';
            
            pdf.save(finalFilename);
        } catch (error) {
            console.error("Failed to generate PDF:", error);
            alert("Sorry, there was an error generating the PDF. Please try again.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };
    
    // --- Content for the manual and FAQ ---
    const ManualContent = () => (
        <div ref={manualContentRef} className="p-1">
             <style>{`
                .prose {
                    --tw-prose-body: rgb(var(--color-text-secondary));
                    --tw-prose-headings: rgb(var(--color-text-primary));
                    --tw-prose-lead: rgb(var(--color-text-secondary));
                    --tw-prose-links: rgb(var(--color-primary-light));
                    --tw-prose-bold: rgb(var(--color-text-primary));
                    --tw-prose-counters: rgb(var(--color-text-secondary));
                    --tw-prose-bullets: rgb(var(--color-border-default));
                    --tw-prose-hr: rgb(var(--color-border-default));
                    --tw-prose-quotes: rgb(var(--color-text-primary));
                    --tw-prose-quote-borders: rgb(var(--color-primary));
                    --tw-prose-captions: rgb(var(--color-text-secondary));
                    --tw-prose-code: rgb(var(--color-text-primary));
                    --tw-prose-pre-code: rgb(var(--color-text-primary));
                    --tw-prose-pre-bg: rgb(var(--color-background));
                    --tw-prose-th-borders: rgb(var(--color-border-default));
                    --tw-prose-td-borders: rgb(var(--color-border-default));
                }
                .prose h2 {
                    margin-top: 2.5em;
                    padding-bottom: 0.5em;
                    border-bottom: 1px solid rgb(var(--color-border-default));
                }
                .prose p, .prose ul, .prose ol {
                    line-height: 1.7;
                }
                .prose blockquote {
                    position: relative;
                    z-index: 0;
                    background-color: transparent;
                    border-left-width: 4px;
                    padding: 0.5em 1.5em;
                    font-style: normal;
                    border-radius: 4px;
                    overflow: hidden;
                }
                .prose blockquote::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background-color: rgb(var(--color-surface-soft));
                    opacity: 0.4;
                    z-index: -1;
                }
                .prose blockquote p {
                    margin: 0.5em 0;
                }
            `}</style>
             <div className="prose prose-invert max-w-none">
                <h1>{manualTitle}</h1>

                <h2>1. Introduction</h2>
                <p>Welcome to the Ticketing & Travel Management App. This platform is designed to streamline the management of personnel data, travel documents, and flight schedules. It provides a centralized system for tracking critical deadlines, automating alerts, and offering a clear overview of all travel-related information for your clients.</p>
                
                <h2>2. The Main Interface</h2>
                <p>After logging in, you'll be greeted by the main application interface. Navigation is handled through the sidebar on the left, which is organized into logical sections for ease of use.</p>
                <ul>
                    <li><strong>Main Menu:</strong> Direct access to the most frequently used features: <strong>Dashboard</strong>, <strong>Clients</strong>, <strong>Travel</strong>, and <strong>Documents</strong>.</li>
                    <li><strong>Tools Menu:</strong> Contains utility features like <strong>Notifications</strong> and <strong>Technical</strong> links.</li>
                    <li><strong>Settings Menu:</strong> Access to all configuration options, including <strong>My Account</strong>, <strong>User Management</strong>, <strong>Company Settings</strong>, <strong>Appearance</strong>, and this <strong>Help & FAQ</strong> section.</li>
                </ul>

                <h2>3. Core Features (Daily Workflow)</h2>

                <h3>3.1 Dashboard</h3>
                <p>The Dashboard is your mission control, offering a real-time overview of all critical data.</p>
                <ul>
                    <li><strong>Stat Cards:</strong> These provide quick metrics for <strong>Total Active Personnel</strong>, <strong>Upcoming Flights (in 30 days)</strong>, and <strong>Document Expiry Alerts (within 90 days)</strong>. Click any card to expand it and view a detailed list.</li>
                    <li><strong>Personnel Status Dashboard:</strong> This powerful tool shows the real-time location status of all personnel based on their latest flight data. It helps you track who is in-country, in-transit, or at their home country/off-site. You can search for individuals, switch between list and grid views, and click on a person for a quick document status summary.</li>
                </ul>

                <h3>3.2 Clients & Personnel Management</h3>
                <p>This is the heart of the application, where all passenger data is managed.</p>
                <ol>
                    <li><strong>Select a Client:</strong> Begin by clicking a company logo on the <strong>Clients</strong> screen.</li>
                    <li><strong>Manage Personnel:</strong> You will see a list of all personnel for that company. You can:
                        <ul>
                            <li><strong>Filter & Search:</strong> Filter the list by <strong>Expatriate</strong> or <strong>Local</strong>, search by name or passport number, and toggle between a compact list view and a visual grid view.</li>
                            <li>
                                <strong>Add New Personnel:</strong> Click the "Add New Personnel" button. The form features an <strong>AI-powered OCR function</strong>. Simply upload a document (like a passport), and the system will automatically scan it and fill in the corresponding fields.
                                <blockquote><p><strong>Important:</strong> Always double-check the data extracted by the AI for accuracy before saving.</p></blockquote>
                            </li>
                            <li><strong>View, Edit, or Delete:</strong> Use the action buttons for each person to view their full profile, edit their details, or remove their record.</li>
                        </ul>
                    </li>
                    <li><strong>Compliance Report:</strong> Click this button to generate a report that checks all passengers against predefined document checklists (configured in Company Settings).</li>
                </ol>

                <h3>3.3 Travel Management</h3>
                <p>This screen is a comprehensive log of all flights.</p>
                <ul>
                    <li><strong>Filter Flights:</strong> Easily switch between <strong>International</strong> and <strong>Local</strong> flights. You can also filter by schedule: <strong>Upcoming</strong>, <strong>Past</strong>, or <strong>All</strong>.</li>
                    <li><strong>Search:</strong> Quickly find a specific flight by searching for a passenger name, airline, or city.</li>
                    <li><strong>Manage Tickets:</strong> Expand any flight record to view full details. From here, you can <strong>Edit</strong> the ticket information or <strong>Delete</strong> it from the passenger's profile.</li>
                </ul>
                
                <h3>3.4 Document Hub</h3>
                <p>This is a central library for every document uploaded in the system.</p>
                <ul>
                    <li><strong>Find Any Document:</strong> Use the filters at the top to search by <strong>Company</strong>, <strong>Passenger Name</strong>, or <strong>Document Category</strong> (e.g., Passport, Visa, Ticket).</li>
                    <li><strong>Preview & Manage:</strong> Browse documents in a grid or list view. Click any document to open a full-screen preview where you can <strong>Rotate</strong>, <strong>Share</strong>, or <strong>Download</strong> the file.</li>
                </ul>

                <h2>4. Tools</h2>
                <h3>4.1 Notifications</h3>
                <p>This screen allows you to <strong>manually simulate</strong> a check for upcoming alerts. When you click the "Check for Notifications" button, the system scans all passenger data based on the rules you've configured in settings (e.g., "notify 60 days before passport expiry"). It then displays a log of which notifications would have been sent.</p>
                <blockquote><p><strong>Note:</strong> This is a simulation tool and does not send actual emails automatically. You must manually click the button to see what alerts would be generated.</p></blockquote>

                <h3>4.2 Technical</h3>
                <p>This section contains utilities for administrators:</p>
                <ul>
                    <li><strong>Officer Performance:</strong> View statistics on how many new passenger entries each Ticketing Officer has made, both in total and for the current day.</li>
                    <li><strong>Technical Weblinks:</strong> A place to store and manage a list of useful external links (e.g., airline portals, government websites).</li>
                </ul>

                <h2>5. Settings & Administration (Admin Focus)</h2>
                <p>The Settings menu allows for deep customization of the application.</p>
                <ul>
                    <li><strong>My Account (Admins Only):</strong> Manage your own login username and password.</li>
                    <li><strong>User Management (Admins Only):</strong> Create, edit, and delete accounts for "Ticketing Officer" users.</li>
                    <li><strong>Company Settings (Admins Only):</strong>
                        <ul>
                            <li><strong>App Branding:</strong> Customize the global App Name, Logo, and Watermark.</li>
                            <li><strong>Email Notifications:</strong> Configure the rules for the notification simulation tool, including who receives alerts and the trigger conditions (e.g., days before expiry).</li>
                            <li><strong>Activity Checklists:</strong> Create templates of required documents for various activities (e.g., "New Expatriate Arrival"). This powers the "Compliance Report" feature.</li>
                            <li><strong>Company Appearance:</strong> Customize the logo and background for each client company.</li>
                        </ul>
                    </li>
                     <li><strong>Appearance:</strong> All users can customize their personal visual experience by choosing from a variety of color themes. Your selection is saved to your account.</li>
                </ul>

                <h2>6. Upcoming Features (Under Development)</h2>
                <p>FML Ticketing Pro is constantly evolving. The following features are currently in the development pipeline and will be released in an upcoming version:</p>
                
                <h3>6.1 Multi-Channel Alerts</h3>
                <p>We are expanding the notification system to ensure critical deadlines are never missed. The new alert system will support:</p>
                <ul>
                    <li><strong>SMS Alerts:</strong> Urgent text messages sent directly to mobile phones for time-sensitive events (e.g., flight departure in less than 4 hours).</li>
                    <li><strong>WhatsApp Integration:</strong> Automated messages sent to Ticketing Officers and Client Managers containing document expiry summaries and flight itineraries.</li>
                    <li><strong>Automated Email Digests:</strong> Daily or weekly summary emails sent automatically without manual intervention.</li>
                </ul>

                <h3>6.2 Automated Ticket Ingestion</h3>
                <p>To eliminate manual data entry errors and save time, we are developing a <strong>Smart Ingest Engine</strong>. This feature will:</p>
                <ul>
                    <li><strong>Connect to Booking Sites:</strong> Seamlessly handle ticket data directly from major flight booking platforms.</li>
                    <li><strong>Parse Confirmations:</strong> Automatically read flight confirmation emails or API data to extract flight numbers, times, routes, and passenger names.</li>
                    <li><strong>Auto-Update System:</strong> Instantly create or update passenger flight records in the system as soon as a ticket is booked, updating their "In-Country" status immediately.</li>
                </ul>
                
                <blockquote>
                    <p><strong>Status:</strong> These features are currently <strong>under active development</strong> and represent the next major milestone for the platform.</p>
                </blockquote>
             </div>
        </div>
    );

    const FAQContent = () => (
        <div>
            <AccordionItem title="How is a person's status (e.g., In-Country, On-Site) determined on the dashboard?">
                <p>The status is determined automatically from the passenger's latest flight ticket data:</p>
                <ul>
                    <li><strong>In-Transit:</strong> Any passenger with a flight scheduled for the current day.</li>
                    <li><strong>In-Country (Expatriates):</strong> Their last recorded flight was an arrival to a Ghanaian airport (e.g., Accra).</li>
                     <li><strong>Home-Country (Expatriates):</strong> Their last recorded flight was a departure from a Ghanaian airport.</li>
                    <li><strong>On-Site (Locals):</strong> Their last recorded flight was an arrival to a primary work location (e.g., Takoradi).</li>
                    <li><strong>Off-Site / Outside Country (Locals):</strong> Their last recorded flight was to a destination other than the primary work site.</li>
                    <li>If a passenger has no ticket data, they are generally assumed to be "In-Country" or "Off-Site".</li>
                </ul>
            </AccordionItem>
            <AccordionItem title="The AI/OCR didn't extract the document data correctly. What should I do?">
                <p>The AI-powered OCR is a tool to speed up data entry, but it may not be 100% accurate, especially with low-quality images. If data is extracted incorrectly, you should manually correct the information in the form fields before saving. All fields are editable.</p>
            </AccordionItem>
             <AccordionItem title="How do I add a new Visa or Permit to an existing passenger?">
                <p>To add new documents to a passenger who is already in the system:</p>
                <ol>
                    <li>Navigate to the <strong>Clients</strong> section and select the relevant company.</li>
                    <li>Find the passenger in the list and click <strong>"Edit"</strong>.</li>
                    <li>Scroll down to the "Visas" or "Permits" section.</li>
                    <li>Click the <strong>"Add Visa"</strong> or <strong>"Add Permit"</strong> button.</li>
                    <li>A new form section will appear. Fill in the details (or use the OCR upload) and click <strong>"Save Changes"</strong> at the bottom of the page.</li>
                </ol>
            </AccordionItem>
            <AccordionItem title="What is the 'Compliance Report' for?">
                <p>The Compliance Report is a tool that cross-references all personnel of a company against the "Activity Checklists" you create in <strong>Company Settings</strong>. For a chosen checklist (e.g., "New Expatriate Arrival"), it will show you which passengers have all the required documents and which are missing them, helping you quickly identify compliance gaps.</p>
            </AccordionItem>
            <AccordionItem title="Are email notifications sent automatically?">
                <p><strong>No.</strong> In its current version, the app does not send emails automatically in the background. The <strong>Notifications</strong> screen in the "Tools" menu is a <strong>simulation tool</strong>. You must go to that screen and manually click the "Check for Notifications" button to see what alerts would be generated based on your settings. This allows you to review potential alerts before taking action.</p>
            </AccordionItem>
        </div>
    );


    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div>
                     <h2 className="text-3xl font-bold text-text-primary">Help Center</h2>
                     <p className="text-text-secondary">Find answers and instructions on how to use the app.</p>
                </div>
                {activeTab === 'manual' && (
                    <div className="flex flex-col sm:flex-row items-end gap-2 w-full sm:w-auto">
                        <div className="w-full sm:w-auto">
                            <label htmlFor="pdf-filename" className="block text-sm font-medium text-text-secondary mb-1">PDF Filename</label>
                            <input
                                id="pdf-filename"
                                type="text"
                                value={pdfFilename}
                                onChange={(e) => setPdfFilename(e.target.value)}
                                disabled={isGeneratingPdf}
                                className="px-3 py-2 border border-border-default bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto"
                            />
                        </div>
                        <Button onClick={handleDownloadPdf} disabled={isGeneratingPdf}>
                            <DownloadIcon className="h-5 w-5" />
                            <span>{isGeneratingPdf ? 'Generating...' : 'Download'}</span>
                        </Button>
                    </div>
                )}
            </div>

            <Card>
                <div className="border-b border-border-default flex items-center">
                    <button 
                        onClick={() => setActiveTab('manual')}
                        className={`px-4 py-3 font-semibold transition-colors ${activeTab === 'manual' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:bg-surface-soft/50'}`}
                    >
                        User Manual
                    </button>
                    <button 
                        onClick={() => setActiveTab('faq')}
                        className={`px-4 py-3 font-semibold transition-colors ${activeTab === 'faq' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:bg-surface-soft/50'}`}
                    >
                        FAQ
                    </button>
                </div>
                <div className="p-4 sm:p-6">
                    {activeTab === 'manual' ? <ManualContent /> : <FAQContent />}
                </div>
            </Card>
        </div>
    );
};

export default HelpScreen;
