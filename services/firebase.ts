
import { initializeApp } from 'firebase/app';
import { 
    getFirestore, 
    initializeFirestore,
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    addDoc, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    limit, 
    orderBy, 
    onSnapshot, 
    serverTimestamp, 
    deleteField,
    getDocFromServer,
    Timestamp,
    DocumentData
} from 'firebase/firestore';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
export type { QueryDocumentSnapshot };
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { Passenger, Checklist, NotificationSettings, UserSettings, ActivityLog, User, UserRole, ErrorLog, TwilioSettings, AutomatedNotificationLog, ThemePreset, TicketIssue, InAppNotification } from '../types';
import { DEFAULT_USERS } from './users';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Force long polling to avoid WebSocket issues in some environments
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
}, (firebaseConfig as any).firestoreDatabaseId);

export const auth = getAuth(app);

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection Test - Removed to save quota
// async function testConnection() { ... }

// Helper to safely handle snapshot errors
export const safeSnapshot = <T>(
    queryOrRef: any, 
    callback: (data: T) => void, 
    transform: (snapshot: any) => T, 
    fallbackValue: T,
    onError?: (error: any) => void
) => {
    return onSnapshot(queryOrRef, 
        (snapshot: any) => {
            try {
                callback(transform(snapshot));
            } catch (e) {
                console.error("Data transform error:", e);
                callback(fallbackValue);
            }
        }, 
        (error: any) => {
            // Ensure we don't crash the app on permission errors
            console.warn("Firestore Listener Error (safeSnapshot):", error.code, error.message);
            
            if (onError) {
                onError(error);
            }

            // Don't just fail silently, log it so we can debug "empty dashboard" issues.
            if (error.code === 'permission-denied') {
                console.error("PERMISSION DENIED: The current user role does not have access to this data.");
            }
            
            // Log with our standardized error handler if possible
            try {
                handleFirestoreError(error, OperationType.LIST, (queryOrRef as any).path || 'unknown');
            } catch (e) {
                // Ignore errors from handleFirestoreError as we are already in an error state
            }

            callback(fallbackValue);
        }
    );
};

// Listeners
export const listenToAccessiblePassengers = (user: User, callback: (passengers: Passenger[]) => void, onError?: any) => {
    const path = 'passengers';
    let q;
    if (user.role === 'admin' || user.role === 'developer' || user.role === 'app_manager') {
        q = query(collection(db, path), orderBy('createdAt', 'desc'));
    } else if (user.role === 'client' && (user as any).companyId) {
        q = query(collection(db, path), where('companyId', '==', (user as any).companyId), orderBy('createdAt', 'desc'));
    } else {
        q = query(collection(db, path), orderBy('createdAt', 'desc'));
    }

    return safeSnapshot(q, callback, (snapshot) => {
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Passenger));
    }, [], onError);
};

export const listenToAllPassengers = (callback: (passengers: Passenger[]) => void, onError?: any) => {
    const path = 'passengers';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return safeSnapshot(q, callback, (snapshot) => {
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Passenger));
    }, [], onError);
};

export const listenToPassengersByCompany = (companyId: string, callback: (passengers: Passenger[]) => void, onError?: any) => {
    const path = 'passengers';
    const q = query(collection(db, path), where('companyId', '==', companyId), orderBy('createdAt', 'desc'));
    return safeSnapshot(q, callback, (snapshot) => {
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Passenger));
    }, [], onError);
};

export const listenToCurrentUser = (username: string, callback: (user: User & UserSettings) => void) => {
    const docRef = doc(db, 'usersSettings', username);
    return safeSnapshot(docRef, callback, (docSnap: any) => {
        return docSnap.exists() ? ({ username, ...docSnap.data() } as any) : null;
    }, null);
};

export const listenToUsersAndSettings = (callback: (users: (User & UserSettings)[]) => void) => {
    const path = 'usersSettings';
    return safeSnapshot(collection(db, path), callback, (snapshot) => {
        return snapshot.docs.map(doc => doc.data() as any);
    }, []);
};

export const listenToTicketIssues = (callback: (issues: TicketIssue[]) => void) => {
    const path = 'ticketIssues';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return safeSnapshot(q, callback, (snapshot) => {
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketIssue));
    }, []);
};

export const listenToChecklists = (callback: (checklists: Checklist[]) => void) => {
    const path = 'checklists';
    return safeSnapshot(collection(db, path), callback, (snapshot) => {
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Checklist));
    }, []);
};

export const listenToActivityLogs = (limitNum: number, callback: (logs: ActivityLog[]) => void) => {
    const path = 'activityLogs';
    const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(limitNum));
    return safeSnapshot(q, callback, (snapshot) => {
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));
    }, []);
};

export const listenToErrorLogs = (limitNum: number, callback: (logs: ErrorLog[]) => void) => {
    const path = 'errorLogs';
    const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(limitNum));
    return safeSnapshot(q, callback, (snapshot) => {
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ErrorLog));
    }, []);
};

export const listenToNotificationLogs = (limitNum: number, callback: (logs: AutomatedNotificationLog[]) => void) => {
    const path = 'notificationLogs';
    const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(limitNum));
    return safeSnapshot(q, callback, (snapshot) => {
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AutomatedNotificationLog));
    }, []);
};

export const listenToThemePresets = (callback: (presets: ThemePreset[]) => void) => {
    const path = 'settings/themePresets';
    const docRef = doc(db, 'settings', 'themePresets');
    return safeSnapshot(docRef, callback, (docSnap: any) => {
        return docSnap.exists() ? (docSnap.data().list || []) : [];
    }, []);
};

export const listenToDuplicateAlerts = (callback: any) => {
    callback([]);
    return () => {};
};

export const listenToTechnicalLinks = (callback: any) => {
    callback([]);
    return () => {};
};

export const listenToRestorePoints = (callback: any) => {
    callback([]);
    return () => {};
};

export const listenToRtdb = (path: string, callback: any) => {
    callback(null);
    return () => {};
};

export const listenToAccessiblePassengersRtdb = (user: User, callback: (passengers: Passenger[]) => void) => {
    return listenToAccessiblePassengers(user, callback);
};

export const listenToUsersAndSettingsRtdb = (callback: (users: (User & UserSettings)[]) => void) => {
    return listenToUsersAndSettings(callback);
};

export const listenToBranding = (callback: (settings: any) => void) => {
    const docRef = doc(db, 'settings', 'branding');
    return safeSnapshot(docRef, callback, (docSnap) => {
        return docSnap.exists() ? docSnap.data() : null;
    }, null);
};

export const listenToThemeSettings = (storageKey: string, callback: (data: any) => void) => {
    const docRef = doc(db, 'settings', storageKey);
    return safeSnapshot(docRef, callback, (docSnap) => {
        return docSnap.exists() ? docSnap.data() : null;
    }, null);
};

export const getCompanySettings = async () => {
    const docRef = doc(db, 'settings', 'companies');
    try {
        const snapshot = await getDoc(docRef);
        return snapshot.exists() ? snapshot.data() : { custom: [], appearances: {}, order: [] };
    } catch (error) {
        console.error("Error fetching company settings:", error);
        return { custom: [], appearances: {}, order: [] };
    }
};

export const listenToCompanySettings = (callback: (settings: any) => void) => {
    const docRef = doc(db, 'settings', 'companies');
    return safeSnapshot(docRef, callback, (docSnap: any) => {
        return docSnap.exists() ? docSnap.data() : { custom: [], appearances: {}, order: [] };
    }, { custom: [], appearances: {}, order: [] });
};

export const updateCompanySettings = async (settings: any) => {
    const docRef = doc(db, 'settings', 'companies');
    await setDoc(docRef, settings, { merge: true });
};

// Getters
export const getAllPassengers = async () => {
    const path = 'passengers';
    try {
        const snapshot = await getDocs(collection(db, path));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Passenger));
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
        return [];
    }
};

export const getPassengersByCompany = async (companyId: string) => {
    const path = 'passengers';
    try {
        const q = query(collection(db, path), where('companyId', '==', companyId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Passenger));
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
        return [];
    }
};

export const getPassengersByCompanyPaginated = async ({ companyId, limitNum, startAfterDoc }: any) => {
    const path = 'passengers';
    try {
        // This is a mock for now because pagination is complex to implement fully without more context
        const q = query(collection(db, path), where('companyId', '==', companyId), limit(limitNum));
        const snapshot = await getDocs(q);
        const passengers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Passenger));
        return {
            passengers,
            lastVisible: snapshot.docs[snapshot.docs.length - 1],
            hasMore: passengers.length === limitNum
        };
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
        return { passengers: [], lastVisible: null, hasMore: false };
    }
};

export const getPassengerById = async (id: string) => {
    const path = `passengers/${id}`;
    try {
        const docRef = doc(db, 'passengers', id);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as Passenger) : null;
    } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return null;
    }
};

export const getUsers = async () => {
    const path = 'users';
    try {
        const snapshot = await getDocs(collection(db, path));
        return snapshot.docs.map(doc => ({ username: doc.id, ...doc.data() } as User));
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
        return DEFAULT_USERS as any;
    }
};

export const getChecklists = async () => {
    const path = 'checklists';
    try {
        const snapshot = await getDocs(collection(db, path));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Checklist));
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
        return [];
    }
};

export const getNotificationSettings = async () => {
    const path = 'settings/notifications';
    try {
        const docSnap = await getDoc(doc(db, 'settings', 'notifications'));
        return docSnap.exists() ? docSnap.data() as NotificationSettings : null;
    } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return null;
    }
};

export const getTwilioSettings = async () => {
    const path = 'settings/twilio';
    try {
        const docSnap = await getDoc(doc(db, 'settings', 'twilio'));
        return docSnap.exists() ? docSnap.data() as TwilioSettings : { accountSid: '', authToken: '', fromNumber: '' };
    } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return { accountSid: '', authToken: '', fromNumber: '' };
    }
};

export const getFullBackupData = async () => ({});

// Helper to sanitize data for Firestore (replaces undefined with null)
const sanitizeData = (data: any): any => {
    if (data === undefined) return null;
    if (data === null) return null;
    if (Array.isArray(data)) return data.map(sanitizeData);
    if (typeof data === 'object' && !(data instanceof Timestamp) && !(data instanceof Date)) {
        const sanitized: any = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                sanitized[key] = sanitizeData(data[key]);
            }
        }
        return sanitized;
    }
    return data;
};

// Mutations
export const addPassenger = async (data: any, username: string) => {
    const path = 'passengers';
    try {
        const sanitizedData = sanitizeData(data);
        await addDoc(collection(db, path), {
            ...sanitizedData,
            createdAt: serverTimestamp(),
            createdBy: username
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
    }
};

export const updatePassenger = async (id: string, data: any) => {
    const path = `passengers/${id}`;
    try {
        const docRef = doc(db, 'passengers', id);
        const sanitizedData = sanitizeData(data);
        await updateDoc(docRef, sanitizedData);
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
    }
};

export const deletePassenger = async (id: string) => {
    const path = `passengers/${id}`;
    try {
        await deleteDoc(doc(db, 'passengers', id));
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
    }
};

export const addChecklist = async (checklist: any) => {
    const path = 'checklists';
    try {
        await addDoc(collection(db, path), checklist);
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
    }
};

export const deleteChecklist = async (id: string) => {
    const path = `checklists/${id}`;
    try {
        await deleteDoc(doc(db, 'checklists', id));
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
    }
};

export const updateUserSettings = async (username: string, settings: any) => {
    const path = `usersSettings/${username}`;
    try {
        await setDoc(doc(db, 'usersSettings', username), settings, { merge: true });
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
    }
};

export const addActivityLog = async (username: string, message: string) => {
    const path = 'activityLogs';
    try {
        await addDoc(collection(db, path), {
            user: username,
            message,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
    }
};

export const addErrorLog = async (errorMessage: string, stackTrace?: string, componentStack?: string) => {
    const path = 'errorLogs';
    try {
        await addDoc(collection(db, path), {
            errorMessage,
            stackTrace,
            componentStack,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        // Silent fail for error logs to avoid infinite loops
    }
};

export const clearErrorLogs = async () => {
    const path = 'errorLogs';
    try {
        const snapshot = await getDocs(collection(db, path));
        // This should ideally be a batch delete
        for (const doc of snapshot.docs) {
            await deleteDoc(doc.ref);
        }
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
    }
};

export const updateNotificationSettings = async (settings: any) => {
    const path = 'settings/notifications';
    try {
        await setDoc(doc(db, 'settings', 'notifications'), settings, { merge: true });
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
    }
};

export const updateTwilioSettings = async (settings: any) => {
    const path = 'settings/twilio';
    try {
        await setDoc(doc(db, 'settings', 'twilio'), settings, { merge: true });
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
    }
};

export const deleteUser = async (username: string) => {};

export const createNewUserCF = async (username: string, password: string, role: string, email: string, contactInfo?: any, companyId?: string) => ({ success: true, uid: 'mock-uid' });

export const createNewUserClientSide = async (username: string, password: string, role: string, email: string, contactInfo?: any, companyId?: string) => ({ success: true, uid: 'mock-uid' });

export const updateUserCredentialsCF = async (oldUsername: string, newUsername: string, newPassword?: string) => {};

export const applyLayoutToRoles = async (roles: string[], layoutData: any) => {};

export const applyDimensionsToRoles = async (roles: string[], dimensions: any) => {};

export const saveThemePreference = async (scope: string, themeData: any) => {};

export const saveThemePreset = async (preset: any) => {};

export const deleteThemePreset = async (presetId: string) => {};

export const restoreToPoint = async (pointId: string, username?: string) => {};

export const deleteRestorePoint = async (pointId: string) => {};

export const factoryResetApplication = async () => {
    try {
        // 1. Delete ALL Data Collections
        const collectionsToDelete = ['passengers', 'activityLogs', 'notificationLogs', 'errorLogs', 'checklists', 'ticketIssues'];
        for (const colName of collectionsToDelete) {
            const snapshot = await getDocs(collection(db, colName));
            for (const doc of snapshot.docs) {
                await deleteDoc(doc.ref);
            }
        }
        
        // 2. Delete Settings Documents
        const settingsToDelete = ['notifications', 'twilio', 'themePresets', 'companies'];
        for (const id of settingsToDelete) {
            await deleteDoc(doc(db, 'settings', id));
        }
        
        return true;
    } catch (error) {
        console.error("Factory Reset Failed:", error);
        return false;
    }
};

export const addTicketIssue = async (data: any) => {
    const path = 'ticketIssues';
    try {
        await addDoc(collection(db, path), {
            ...data,
            status: 'Open',
            createdAt: serverTimestamp()
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
    }
};

export const updateTicketIssue = async (id: string, data: any) => {
    const path = `ticketIssues/${id}`;
    try {
        await updateDoc(doc(db, 'ticketIssues', id), data);
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
    }
};

export const deleteTicketIssue = async (id: string) => {
    const path = `ticketIssues/${id}`;
    try {
        await deleteDoc(doc(db, 'ticketIssues', id));
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
    }
};

export const listenToNotificationSettings = (callback: (settings: NotificationSettings) => void) => {
    const docRef = doc(db, 'settings', 'notifications');
    return safeSnapshot(docRef, callback, (docSnap: any) => {
        return docSnap.exists() ? docSnap.data() as NotificationSettings : null;
    }, null);
};

// --- In-App Notifications ---

export const addInAppNotification = async (data: Omit<InAppNotification, 'id' | 'timestamp'>) => {
    const path = 'inAppNotifications';
    try {
        const docRef = await addDoc(collection(db, path), {
            ...data,
            timestamp: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
    }
};

export const listenToUserNotifications = (username: string, callback: (notifications: InAppNotification[]) => void) => {
    const path = 'inAppNotifications';
    const q = query(
        collection(db, path),
        where('userId', '==', username),
        orderBy('timestamp', 'desc'),
        limit(50)
    );

    return safeSnapshot<InAppNotification[]>(
        q,
        callback,
        (snapshot) => snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        })),
        []
    );
};

export const markNotificationAsRead = async (id: string) => {
    const path = `inAppNotifications/${id}`;
    try {
        await updateDoc(doc(db, 'inAppNotifications', id), { read: true });
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
    }
};

export const markAllNotificationsAsRead = async (username: string, notificationIds: string[]) => {
    const promises = notificationIds.map(id => markNotificationAsRead(id));
    await Promise.all(promises);
};

export const deleteNotification = async (id: string) => {
    const path = `inAppNotifications/${id}`;
    try {
        await deleteDoc(doc(db, 'inAppNotifications', id));
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
    }
};

// Auth (Simplified for now as requested)
export const signInWithEmailPassword = async (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
};

export const signOutUser = async () => {
    return signOut(auth);
};

export const onAuthUserChanged = (callback: any) => {
    return onAuthStateChanged(auth, callback);
};

// Re-export Firestore functions for convenience
export { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    addDoc, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    limit, 
    orderBy, 
    onSnapshot, 
    serverTimestamp, 
    deleteField 
};

// Storage mocks
export const ref = (storage: any, path: string) => ({ path });
export const uploadBytes = async (ref: any, blob: any) => ({});
export const getDownloadURL = async (ref: any) => "";
export const deleteObject = async (ref: any) => {};

export const httpsCallable = (functions: any, name: string) => async (data: any) => ({ data: { message: `Mock success for ${name}` } });

export const functions = {};
export const storage = {};
