import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseAuthProfile,
  signOut
} from 'firebase/auth';
import { auth, googleProvider, getAuthErrorMessage } from '../lib/firebase';
import {
  defaultSettings,
  checkIsUserAdmin,
  ensureUserProfile,
  updateUserProfileDoc,
  subscribeUserProfile,
  subscribeHealthRecords,
  createHealthRecord,
  subscribeDoctors,
  createDoctorDoc,
  verifyDoctorDoc,
  subscribeAppointments,
  createAppointmentDoc,
  updateAppointmentStatusDoc,
  subscribeMedicineReminders,
  createMedicineReminderDoc,
  toggleReminderTakenDoc,
  deleteMedicineReminderDoc,
  subscribeScanHistory,
  createScanHistoryDoc,
  deleteScanHistoryDoc,
  subscribeChatHistory,
  createChatMessageDoc,
  clearChatHistoryDocs,
  subscribeEmergencyContacts,
  createEmergencyContactDoc,
  deleteEmergencyContactDoc,
  subscribeNotifications,
  createNotificationDoc,
  markNotificationReadDoc,
  subscribeEmergencyEvents,
  createEmergencyEventDoc
} from '../lib/firestoreService';
import {
  UserProfile,
  VitalLog,
  Doctor,
  Appointment,
  NearbyPlace,
  MedicineReminder,
  MedicineScanResult,
  ChatMessage,
  EmergencyContact,
  NotificationItem,
  EmergencyEvent,
  SystemSettings
} from '../types';
import { initialDoctors, initialNearbyPlaces } from '../data/initialData';

export type ActiveTab =
  | 'dashboard'
  | 'scanner'
  | 'ai'
  | 'records'
  | 'appointments'
  | 'maps'
  | 'reminders'
  | 'profile'
  | 'settings'
  | 'admin';

const emptyUserProfile: UserProfile = {
  id: '',
  name: '',
  email: '',
  phone: '',
  avatar: '',
  bloodGroup: 'Unknown',
  age: 30,
  gender: 'Other',
  heightCm: 170,
  weightKg: 70,
  bmi: 24.2,
  medicalConditions: [],
  allergies: [],
  emergencyContacts: [],
  isDonor: false,
  role: 'patient',
};

interface AppContextType {
  // Auth & View state
  firebaseUser: FirebaseUser | null;
  authLoading: boolean;
  dataLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isAdmin: boolean;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  user: UserProfile;
  getAuthToken: () => Promise<string | null>;

  // Auth actions
  registerWithEmail: (fullName: string, email: string, password: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshVerificationStatus: () => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;

  // Profile & Emergency Contacts
  updateProfile: (updated: Partial<UserProfile>) => Promise<void>;
  addEmergencyContact: (contact: Omit<EmergencyContact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  removeEmergencyContact: (id: string) => Promise<void>;

  // Health Vitals
  vitalLogs: VitalLog[];
  latestVital: VitalLog | null;
  addVitalLog: (log: Omit<VitalLog, 'id' | 'timestamp' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  healthScore: number | null;

  // Medicine Scanner History
  scanHistory: MedicineScanResult[];
  addScanResult: (result: Omit<MedicineScanResult, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  removeScan: (id: string) => Promise<void>;

  // AI Chat
  chatMessages: ChatMessage[];
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  clearChat: () => Promise<void>;

  // Appointments & Doctors
  doctors: Doctor[];
  appointments: Appointment[];
  bookAppointment: (doctorId: string, date: string, timeSlot: string, type: 'In-Person' | 'Video Consultation', symptoms?: string) => Promise<void>;
  cancelAppointment: (id: string) => Promise<void>;
  seedDoctorDirectory: () => Promise<void>;
  verifyDoctor: (doctorId: string) => Promise<void>;

  // Reminders
  reminders: MedicineReminder[];
  toggleReminderTaken: (id: string) => Promise<void>;
  addReminder: (reminder: Omit<MedicineReminder, 'id' | 'takenToday' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;

  // Notifications
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => Promise<void>;

  // Emergency Events
  emergencyEvents: EmergencyEvent[];

  // Places
  nearbyPlaces: NearbyPlace[];

  // Settings
  settings: SystemSettings;
  updateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;

  // Emergency SOS State
  isSosModalOpen: boolean;
  openSosModal: () => void;
  closeSosModal: () => void;
  sosDispatched: boolean;
  triggerSosDispatch: (note?: string) => Promise<any>;

  // Medical ID Modal
  isMedicalIdOpen: boolean;
  setIsMedicalIdOpen: (open: boolean) => void;

  // Toast System
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const [activeTab, setActiveTabState] = useState<ActiveTab>('dashboard');
  const [profileDoc, setProfileDoc] = useState<UserProfile>(emptyUserProfile);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [vitalLogs, setVitalLogs] = useState<VitalLog[]>([]);
  const [scanHistory, setScanHistory] = useState<MedicineScanResult[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reminders, setReminders] = useState<MedicineReminder[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [emergencyEvents, setEmergencyEvents] = useState<EmergencyEvent[]>([]);
  const [nearbyPlaces] = useState<NearbyPlace[]>(initialNearbyPlaces);
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);

  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [sosDispatched, setSosDispatched] = useState(false);
  const [isMedicalIdOpen, setIsMedicalIdOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  const user: UserProfile = {
    ...profileDoc,
    emergencyContacts,
  };

  const latestVital: VitalLog | null = vitalLogs[0] || null;

  const calculateHealthScore = (): number | null => {
    if (!latestVital) return null;
    let score = 100;
    if (latestVital.heartRate < 60 || latestVital.heartRate > 90) score -= 8;
    if (latestVital.bloodPressureSys > 130 || latestVital.bloodPressureSys < 90) score -= 10;
    if (latestVital.bloodSugar > 110) score -= 10;
    if (latestVital.sleepHours > 0 && latestVital.sleepHours < 7) score -= 8;
    if (latestVital.waterIntakeMl > 0 && latestVital.waterIntakeMl < 2000) score -= 5;
    if (latestVital.spO2 < 95) score -= 12;
    return Math.max(score, 50);
  };

  const healthScore = calculateHealthScore();

  const setActiveTab = useCallback(
    (tab: ActiveTab) => {
      if (tab === 'admin' && !isAdmin) {
        showToast('Access denied: Administrator privileges required.', 'error');
        setActiveTabState('dashboard');
        return;
      }
      setActiveTabState(tab);
    },
    [isAdmin, showToast]
  );

  // Clear local sensitive state when signed out
  const resetUserState = useCallback(() => {
    setProfileDoc(emptyUserProfile);
    setEmergencyContacts([]);
    setVitalLogs([]);
    setScanHistory([]);
    setChatMessages([]);
    setDoctors([]);
    setAppointments([]);
    setReminders([]);
    setNotifications([]);
    setEmergencyEvents([]);
    setIsAdmin(false);
    setActiveTabState('dashboard');
  }, []);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      setIsEmailVerified(Boolean(fbUser?.emailVerified));

      if (!fbUser) {
        resetUserState();
        setAuthLoading(false);
        return;
      }

      if (!fbUser.emailVerified) {
        setIsAdmin(false);
        setAuthLoading(false);
        return;
      }

      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [resetUserState]);

  // Attach Firestore listeners only when authenticated & email verified
  useEffect(() => {
    if (!firebaseUser || !isEmailVerified) {
      return;
    }

    let cancelled = false;
    const unsubs: Array<() => void> = [];

    const handleSubError = (err: Error) => {
      console.error('Firestore subscription error:', err);
      let msg = err.message;
      try {
        const parsed = JSON.parse(err.message);
        if (parsed?.error) msg = `${parsed.error} (${parsed.path})`;
      } catch {
        // Keep raw message
      }
      showToast(`Database error: ${msg}`, 'error');
    };

    const initializeSubscriptions = async () => {
      setDataLoading(true);
      try {
        const [initialProf, adminFlag] = await Promise.all([
          ensureUserProfile(firebaseUser),
          checkIsUserAdmin(firebaseUser),
        ]);

        if (cancelled) return;

        setProfileDoc(initialProf);
        if (initialProf.settings) {
          setSettings(initialProf.settings);
        }
        const effectiveAdmin = adminFlag || initialProf.role === 'admin';
        setIsAdmin(effectiveAdmin);

        unsubs.push(
          subscribeUserProfile(
            firebaseUser.uid,
            (partial) => {
              setProfileDoc((prev) => ({ ...prev, ...partial }));
              if (partial.settings) {
                setSettings(partial.settings);
              }
            },
            handleSubError
          )
        );

        unsubs.push(subscribeHealthRecords(firebaseUser.uid, setVitalLogs, handleSubError));
        unsubs.push(subscribeDoctors(setDoctors, handleSubError));
        unsubs.push(subscribeAppointments(firebaseUser.uid, setAppointments, handleSubError));
        unsubs.push(subscribeMedicineReminders(firebaseUser.uid, setReminders, handleSubError));
        unsubs.push(subscribeScanHistory(firebaseUser.uid, setScanHistory, handleSubError));
        unsubs.push(subscribeChatHistory(firebaseUser.uid, setChatMessages, handleSubError));
        unsubs.push(subscribeEmergencyContacts(firebaseUser.uid, setEmergencyContacts, handleSubError));
        unsubs.push(subscribeNotifications(firebaseUser.uid, setNotifications, handleSubError));
        unsubs.push(subscribeEmergencyEvents(firebaseUser.uid, effectiveAdmin, setEmergencyEvents, handleSubError));
      } catch (err: any) {
        if (!cancelled) {
          showToast(err?.message || 'Failed to connect to Cloud Firestore.', 'error');
        }
      } finally {
        if (!cancelled) {
          setDataLoading(false);
        }
      }
    };

    initializeSubscriptions();

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, [firebaseUser, isEmailVerified, showToast]);

  // Redirect away from admin if role revoked
  useEffect(() => {
    if (activeTab === 'admin' && !isAdmin) {
      setActiveTabState('dashboard');
    }
  }, [activeTab, isAdmin]);

  // Sync theme with root HTML tag class
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  }, []);

  // =========================================================================
  // AUTHENTICATION ACTIONS
  // =========================================================================
  const registerWithEmail = async (fullName: string, email: string, password: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateFirebaseAuthProfile(cred.user, {
        displayName: fullName.trim().slice(0, 120),
      });
      await sendEmailVerification(cred.user);
      setFirebaseUser(cred.user);
      setIsEmailVerified(cred.user.emailVerified);
      showToast('Account created! A verification email has been sent to your inbox.', 'success');
    } catch (error) {
      const msg = getAuthErrorMessage(error);
      showToast(msg, 'error');
      throw new Error(msg);
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      setFirebaseUser(cred.user);
      setIsEmailVerified(cred.user.emailVerified);
      if (!cred.user.emailVerified) {
        showToast('Please verify your email address to unlock your health vault.', 'info');
      } else {
        showToast('Signed in securely to HealthCare+', 'success');
      }
    } catch (error) {
      const msg = getAuthErrorMessage(error);
      showToast(msg, 'error');
      throw new Error(msg);
    }
  };

  const loginWithGoogle = async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      setFirebaseUser(cred.user);
      setIsEmailVerified(cred.user.emailVerified);
      showToast('Signed in with Google successfully', 'success');
    } catch (error) {
      const msg = getAuthErrorMessage(error);
      showToast(msg, 'error');
      throw new Error(msg);
    }
  };

  const resendVerificationEmail = async () => {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      showToast('Verification email resent. Please check your inbox and spam folder.', 'success');
    } catch (error) {
      const msg = getAuthErrorMessage(error);
      showToast(msg, 'error');
      throw new Error(msg);
    }
  };

  const refreshVerificationStatus = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    try {
      await auth.currentUser.reload();
      await auth.currentUser.getIdToken(true);
      const verified = Boolean(auth.currentUser.emailVerified);
      setFirebaseUser(auth.currentUser);
      setIsEmailVerified(verified);
      if (verified) {
        showToast('Email verified! Loading your encrypted health vault...', 'success');
      } else {
        showToast('Email is not verified yet. Please click the link in your email.', 'info');
      }
      return verified;
    } catch (error) {
      const msg = getAuthErrorMessage(error);
      showToast(msg, 'error');
      return false;
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      showToast(`Password reset instructions sent to ${email.trim()}`, 'success');
    } catch (error) {
      const msg = getAuthErrorMessage(error);
      showToast(msg, 'error');
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      resetUserState();
      showToast('You have been signed out securely', 'info');
    } catch (error) {
      showToast(getAuthErrorMessage(error), 'error');
    }
  };

  // =========================================================================
  // FIRESTORE MUTATIONS
  // =========================================================================
  const updateProfile = async (updated: Partial<UserProfile>) => {
    if (!firebaseUser) return;
    try {
      await updateUserProfileDoc(firebaseUser.uid, updated);
      showToast('Health Profile updated in Cloud Firestore', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update profile', 'error');
      throw err;
    }
  };

  const addEmergencyContact = async (
    contact: Omit<EmergencyContact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!firebaseUser) return;
    try {
      await createEmergencyContactDoc(firebaseUser.uid, contact);
      showToast(`Emergency contact ${contact.name} saved`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to add emergency contact', 'error');
    }
  };

  const removeEmergencyContact = async (id: string) => {
    try {
      await deleteEmergencyContactDoc(id);
      showToast('Emergency contact removed', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete emergency contact', 'error');
    }
  };

  const addVitalLog = async (
    logData: Omit<VitalLog, 'id' | 'timestamp' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!firebaseUser) return;
    try {
      await createHealthRecord(firebaseUser.uid, logData);
      showToast('Vitals recorded to Cloud Firestore vault', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to save vital log', 'error');
    }
  };

  const addScanResult = async (
    result: Omit<MedicineScanResult, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!firebaseUser) return;
    try {
      await createScanHistoryDoc(firebaseUser.uid, result);
      showToast(`Saved scan: ${result.name}`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to save medicine scan', 'error');
    }
  };

  const removeScan = async (id: string) => {
    try {
      await deleteScanHistoryDoc(id);
      showToast('Scan history entry deleted', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete scan', 'error');
    }
  };

  const addChatMessage = async (
    msg: Omit<ChatMessage, 'id' | 'timestamp' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!firebaseUser) return;
    try {
      await createChatMessageDoc(firebaseUser.uid, msg);
    } catch (err: any) {
      showToast(err?.message || 'Failed to save chat message', 'error');
    }
  };

  const clearChat = async () => {
    if (!firebaseUser) return;
    try {
      await clearChatHistoryDocs(firebaseUser.uid);
      showToast('Chat history cleared', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to clear chat history', 'error');
    }
  };

  const bookAppointment = async (
    doctorId: string,
    date: string,
    timeSlot: string,
    type: 'In-Person' | 'Video Consultation',
    symptoms?: string
  ) => {
    if (!firebaseUser) return;
    const doctor = doctors.find((d) => d.id === doctorId);
    if (!doctor) {
      showToast('Selected specialist was not found in directory', 'error');
      return;
    }
    try {
      const appointmentId = await createAppointmentDoc(
        firebaseUser.uid,
        doctor,
        date,
        timeSlot,
        type,
        symptoms
      );
      await createNotificationDoc(firebaseUser.uid, {
        title: 'Doctor Appointment Confirmed',
        message: `${doctor.name} (${type}) scheduled for ${date} at ${timeSlot}.`,
        type: 'appointment',
        appointmentId,
      });
      showToast(`Appointment confirmed with ${doctor.name}`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to book appointment', 'error');
    }
  };

  const cancelAppointment = async (id: string) => {
    try {
      await updateAppointmentStatusDoc(id, 'Cancelled');
      showToast('Appointment cancelled', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to cancel appointment', 'error');
    }
  };

  const seedDoctorDirectory = async () => {
    if (!isAdmin) {
      showToast('Only verified administrators can seed the doctor directory.', 'error');
      return;
    }
    try {
      for (const docItem of initialDoctors) {
        const { id, ...rest } = docItem;
        await createDoctorDoc({ ...rest, verified: true }, id);
      }
      showToast('Verified clinical specialist directory populated in Firestore', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to populate specialist directory', 'error');
    }
  };

  const verifyDoctor = async (doctorId: string) => {
    if (!isAdmin) {
      showToast('Only verified administrators can verify licenses.', 'error');
      return;
    }
    try {
      await verifyDoctorDoc(doctorId);
      showToast('Doctor credentials verified in Firestore', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to verify doctor', 'error');
    }
  };

  const toggleReminderTaken = async (id: string) => {
    const target = reminders.find((r) => r.id === id);
    if (!target) return;
    try {
      await toggleReminderTakenDoc(id, target.takenToday, target.pillsLeft);
      showToast('Medication adherence updated', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update medication status', 'error');
    }
  };

  const addReminder = async (
    reminderData: Omit<MedicineReminder, 'id' | 'takenToday' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!firebaseUser) return;
    try {
      await createMedicineReminderDoc(firebaseUser.uid, reminderData);
      await createNotificationDoc(firebaseUser.uid, {
        title: 'Medicine Reminder Scheduled',
        message: `${reminderData.name} (${reminderData.dosage}) scheduled at ${reminderData.timeSlots.join(', ')}.`,
        type: 'reminder',
      });
      showToast(`Reminder added for ${reminderData.name}`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to save reminder', 'error');
    }
  };

  const removeReminder = async (id: string) => {
    try {
      await deleteMedicineReminderDoc(id);
      showToast('Medicine reminder deleted', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete reminder', 'error');
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await markNotificationReadDoc(id);
    } catch (err: any) {
      showToast(err?.message || 'Failed to update notification', 'error');
    }
  };

  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    if (firebaseUser && isEmailVerified) {
      try {
        await updateUserProfileDoc(firebaseUser.uid, { settings: merged });
        showToast('Settings saved to your profile', 'success');
      } catch (err: any) {
        showToast(err?.message || 'Failed to persist settings', 'error');
      }
    }
  };

  const openSosModal = () => {
    setIsSosModalOpen(true);
    setSosDispatched(false);
  };

  const closeSosModal = () => {
    setIsSosModalOpen(false);
    setSosDispatched(false);
  };

  const triggerSosDispatch = async (note?: string) => {
    if (!firebaseUser) return null;
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/emergency/sos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userLocation: 'Current GPS Pin',
          emergencyContacts,
          note: note || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'SOS dispatch failed');
      }

      setSosDispatched(true);

      await createEmergencyEventDoc(firebaseUser.uid, {
        patientName: user.name || firebaseUser.email || 'Patient',
        sosId: data.sosId,
        userLocation: data.userLocation || 'Current GPS Pin',
        status: 'DISPATCHED',
        ambulanceEtaMinutes: data.ambulanceEtaMinutes ?? 6,
        dispatchedUnit: data.dispatchedUnit || 'Metro Ambulance #408',
        notifiedContactsCount: data.notifiedContactsCount ?? emergencyContacts.length,
        note: note || '',
      });

      await createNotificationDoc(firebaseUser.uid, {
        title: 'Emergency SOS Dispatched',
        message: `${data.dispatchedUnit} dispatched. ETA ~${data.ambulanceEtaMinutes} mins.`,
        type: 'sos',
      });

      showToast('CRITICAL: Emergency SOS dispatched & logged', 'error');
      return data;
    } catch (e: any) {
      showToast(e?.message || 'Failed to dispatch SOS alert', 'error');
      throw e;
    }
  };

  return (
    <AppContext.Provider
      value={{
        firebaseUser,
        authLoading,
        dataLoading,
        isAuthenticated: Boolean(firebaseUser),
        isEmailVerified,
        isAdmin,
        activeTab,
        setActiveTab,
        user,
        getAuthToken,

        registerWithEmail,
        loginWithEmail,
        loginWithGoogle,
        resendVerificationEmail,
        refreshVerificationStatus,
        sendPasswordReset,
        logout,
        updateProfile,
        addEmergencyContact,
        removeEmergencyContact,

        vitalLogs,
        latestVital,
        addVitalLog,
        healthScore,

        scanHistory,
        addScanResult,
        removeScan,

        chatMessages,
        addChatMessage,
        clearChat,

        doctors,
        appointments,
        bookAppointment,
        cancelAppointment,
        seedDoctorDirectory,
        verifyDoctor,

        reminders,
        toggleReminderTaken,
        addReminder,
        removeReminder,

        notifications,
        markNotificationRead,

        emergencyEvents,
        nearbyPlaces,

        settings,
        updateSettings,

        isSosModalOpen,
        openSosModal,
        closeSosModal,
        sosDispatched,
        triggerSosDispatch,

        isMedicalIdOpen,
        setIsMedicalIdOpen,

        toast,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
