
import React from 'react';
import { LayoutName } from './context/LayoutContext';

// Moved from MainApp.tsx to be globally accessible
// FIX: Added 'performance' to the Screen type to allow it as a valid menu item.
export type Screen = 'dashboard' | 'company_flow' | 'travel' | 'documents' | 'notifications' | 'technical' | 'settings' | 'appearance' | 'help' | 'user_management' | 'my_account' | 'performance' | 'client_dashboard' | 'ui_designer' | 'booking_dashboard' | 'live_map' | 'ai_assistant' | 'summary_dashboard' | 'chat' | 'restore_points' | 'duplicates' | 'trash_bin' | 'backend_diagnostic';

export type DuplicateType = 'passenger' | 'ticket' | 'visa' | 'permit';

export interface DuplicateAlert {
    id: string;
    type: DuplicateType;
    severity: 'low' | 'medium' | 'high';
    description: string;
    affectedIds: string[]; // IDs of the duplicate records (e.g., passenger IDs)
    metadata: {
        field: string;
        value: string;
        passengerNames?: string[];
        details?: any; // For nested duplicates like tickets
    };
    status: 'pending' | 'resolved' | 'ignored';
    createdAt: any;
}

export interface RestorePoint {
    id: string;
    timestamp: any;
    createdBy: string;
    action: string;
    data?: {
        users: any[];
        usersSettings: any[];
        passengers: any[];
        checklists: any[];
        settings: any[];
    };
    storagePath?: string;
}

export type UserRole = 'developer' | 'app_manager' | 'admin' | 'officer' | 'client' | 'designer' | 'dashboard_only';

export interface User {
  username: string;
  role: UserRole;
  email?: string;
  uid?: string;
}

export interface UserSettings {
  id: string; // Corresponds to username
  firstNames?: string;
  surname?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  disabledMenus: Screen[];
  lastLogin?: any; // Firestore Timestamp
  lastSeen?: any; // Firestore Timestamp for presence
  lastLogout?: any; // Firestore Timestamp, used for forced logout
  lastLocation?: {
      lat: number;
      lng: number;
      timestamp: any; // Firestore Timestamp
  } | string | null; // Store location object, error string, or null
  companyId?: string; // Links a 'client' role user to a specific company
  layout?: LayoutName; // The name of the layout
  
  // Dimension Overrides
  sidebarWidth?: number;
  headerHeight?: number;
  pageLayout?: 'full' | 'wide' | 'large' | 'boxed' | 'half';

  // Chat Specific Settings
  chatSettings?: {
      enabled: boolean; // Developer master switch
      muted: boolean;
      ringtoneEnabled: boolean;
      blockedUsers: string[];
  };

  // Feature Permissions
  duplicateToggleEnabled?: boolean;
}

export interface ActivityLog {
    id: string;
    timestamp: any; // Firestore Timestamp
    user: string;
    message: string;
}

export interface AutomatedNotificationLog {
    id: string;
    timestamp: any; // Firestore Timestamp
    message: string;
    status: 'info' | 'success' | 'warning' | 'error';
}

export interface InAppNotification {
    id: string;
    userId: string; // The username of the recipient
    title: string;
    body: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'message';
    link?: string;
    read: boolean;
    timestamp: any;
    metadata?: any;
}


export interface ErrorLog {
    id: string;
    timestamp: any; // Firestore Timestamp
    errorMessage: string;
    stackTrace?: string;
    componentStack?: string;
}


export interface UploadedFile {
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  driveUrl?: string;
  driveId?: string;
}

export interface Company {
  id:string;
  name: string;
  // Can be the default SVG component or a dataURL string for a custom logo
  logo: React.FC<React.SVGProps<SVGSVGElement> & { title?: string }> | string;
  // Optional custom background color
  logoBg?: string;
  // Optional logo sizing preference
  logoSize?: '50%' | '70%' | '100%';
  // Optional background style
  bgStyle?: 'transparent' | 'color';
}

export enum PassengerCategory {
  Local = 'Local',
  Expatriate = 'Expatriate',
  WalkIn = 'Walk-in',
}

export interface PassportData {
  id: string; // For keying in React lists
  type: string;
  code: string;
  passportNumber: string;
  surname: string;
  firstNames: string;
  nationality: string;
  dateOfBirth: string;
  sex: string;
  placeOfBirth: string;
  dateOfIssue: string;
  authority: string;
  dateOfExpiry: string;
  document?: UploadedFile;
  ocrSource?: string;
}

export interface GhanaCardData {
  cardNumber: string; // This is the Personal ID Number
  surname?: string;
  firstNames?: string;
  nationality?: string;
  dateOfBirth?: string;
  height?: string;
  documentNumber?: string;
  placeOfIssuance?: string;
  dateOfIssue: string;
  dateOfExpiry: string;
  document?: UploadedFile;
  ocrSource?: string;
}

export interface ContactData {
  email?: string;
  phone?: string;
}

export interface VisaData {
  id: string; // For keying in React lists
  visaNumber: string;
  dateOfIssue: string;
  dateOfExpiry: string;
  country: string;
  document?: UploadedFile;
  ocrSource?: string;
}

export interface PermitData {
  id: string; // For keying in React lists
  permitNumber: string;
  type?: string; // e.g., Work Permit, Residence Permit
  dateOfIssue: string;
  dateOfExpiry: string;
  document?: UploadedFile;
  ocrSource?: string;
}

export type TicketStatus = 'Issued' | 'Reserved' | 'Pending confirmation' | 'on-hold';

export interface TicketData {
  id: string; // For keying in React lists
  ticketNumber: string;
  airline: string;
  departureCity: string;
  arrivalCity: string;
  travelDate: string;
  travelTime?: string; // Optional time in "HH:mm" format
  document?: UploadedFile;
  status?: TicketStatus;
  onHoldReason?: string;
  ocrSource?: string;
}

export interface Passenger {
  id: string;
  companyId: string;
  category: PassengerCategory;
  passports: PassportData[];
  ghanaCardData?: GhanaCardData;
  contactData: ContactData;
  visas: VisaData[];
  permits: PermitData[];
  tickets: TicketData[];
  otherDocuments?: UploadedFile[];
  createdAt: any; // Firestore Timestamp
  createdBy?: string;
  profilePhotoUrl?: string;
}

export interface Checklist {
  id: string;
  activityName: string;
  requiredDocuments: string[];
  category?: PassengerCategory | 'All';
}

export interface NotificationSettings {
  recipients: string[]; // Kept for legacy email settings, new logic uses recipientConfig
  recipientConfig: {
    notifyPersonnel: boolean;
    notifyClientUsers: boolean;
    customPhoneNumbers: string[];
  };
  triggers: {
    passportExpiry: { enabled: boolean; hoursBefore: number };
    visaExpiry: { enabled: boolean; hoursBefore: number };
    permitExpiry: { enabled: boolean; hoursBefore: number };
    upcomingFlight: { enabled: boolean; hoursBefore: number };
  };
}

export interface TwilioSettings {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

// New interface for Theme Presets
export interface ThemePreset {
    id: string;
    name: string;
    createdBy: string;
    createdAt: number;
    colors: { [key: string]: string };
}

// --- Chat Interfaces ---

export interface ChatMessage {
    id: string;
    chatId: string;
    sender: string; // username
    content: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'call_log';
    fileUrl?: string;
    fileName?: string;
    timestamp: any;
    readBy: string[]; // usernames who have read the message
}

export interface ChatRoom {
    id: string;
    type: 'direct' | 'group' | 'broadcast';
    participants: string[]; // usernames
    admins?: string[]; // usernames (for groups)
    name?: string; // for groups
    groupPhotoUrl?: string;
    lastMessage?: string;
    lastMessageTimestamp?: any;
    lastSender?: string;
    createdAt: any;
    createdBy: string;
    isArchived?: boolean; // local logic handled by user settings mostly, but can be here too
}

export interface CallSignal {
    id: string;
    type: 'offer' | 'answer' | 'candidate' | 'end';
    caller: string;
    callee: string;
    data: any; // SDP or Candidate data
    timestamp: any;
    status: 'ringing' | 'connected' | 'ended' | 'missed';
}

export type TicketIssueStatus = 'Open' | 'Resolved' | 'Ignored';

export interface TicketIssue {
    id: string;
    fileName: string;
    fileType: string;
    document?: UploadedFile;
    extractedData: Partial<TicketData>;
    suggestedPassengerName?: string;
    status: TicketIssueStatus;
    createdAt: any;
    resolvedAt?: any;
    resolvedBy?: string;
}

export interface TrashItem {
    id: string;
    originalId: string;
    type: 'passenger' | 'company' | 'user' | 'checklist' | 'restore_point' | 'ticket_issue';
    data: any; // The full object data
    deletedAt: any; // Firestore Timestamp
    deletedBy: string; // username
    label: string; // Display name for the item
}
