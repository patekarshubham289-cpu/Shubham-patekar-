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
  subscribeAllProfilesForAdmin,
  setUserRoleDocs,
  subscribeHealthRecords,
  createHealthRecord,
  updateHealthRecordDoc,
  deleteHealthRecordDoc,
  subscribeDoctors,
  subscribeAllDoctorsForAdmin,
  createDoctorDoc,
  updateDoctorDoc,
  verifyDoctorDoc,
  deleteDoctorDoc,
  subscribeActiveSlotLocks,
  subscribeAppointments,
  subscribeAllAppointmentsForAdmin,
  createAppointmentDoc,
  updateAppointmentStatusDoc,
  subscribeMedicineReminders,
  createMedicineReminderDoc,
  updateMedicineReminderDoc,
  toggleReminderTakenDoc,
  markReminderMissedDoc,
  deleteMedicineReminderDoc,
  subscribeScanHistory,
  createScanHistoryDoc,
  deleteScanHistoryDoc,
  subscribeChatHistory,
  createChatMessageDoc,
  clearChatHistoryDocs,
  subscribeEmergencyContacts,
  createEmergencyContactDoc,
  updateEmergencyContactDoc,
  deleteEmergencyContactDoc,
  subscribeNotifications,
  createNotificationDoc,
  markNotificationReadDoc,
  subscribeEmergencyEvents,
  updateEmergencyEventStatusDoc,
  createEmergencyEventDoc,
  createAuditLogDoc,
  subscribeAuditLogs
} from '../lib/firestoreService';
import {
  UserProfile,
  VitalLog,
  Doctor,
  DoctorSlotLock,
  Appointment,
  MedicineReminder,
  MedicineScanResult,
  ChatMessage,
  EmergencyContact,
  NotificationItem,
  EmergencyEvent,
  EmergencyStatus,
  AuditLogEntry,
  SystemSettings
} from '../types';
import { demoSampleDoctors } from '../data/initialData';

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
  editEmergencyContact: (id: string, updates: Partial<Omit<EmergencyContact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  removeEmergencyContact: (id: string) => Promise<void>;

  // Health Vitals
  vitalLogs: VitalLog[];
  latestVital: VitalLog | null;
  addVitalLog: (log: Omit<VitalLog, 'id' | 'timestamp' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  editVitalLog: (id: string, updates: Partial<Omit<VitalLog, 'id' | 'userId' | 'timestamp' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  removeVitalLog: (id: string) => Promise<void>;
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
  slotLocks: DoctorSlotLock[];
  appointments: Appointment[];
  bookAppointment: (doctorId: string, date: string, timeSlot: string, type: 'In-Person' | 'Video Consultation', symptoms?: string) => Promise<void>;
  cancelAppointment: (id: string) => Promise<void>;
  seedDoctorDirectory: () => Promise<void>;
  addDoctor: (doctor: Omit<Doctor, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  editDoctor: (doctorId: string, updates: Partial<Omit<Doctor, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  verifyDoctor: (doctorId: string, verified?: boolean) => Promise<void>;
  removeDoctor: (doctorId: string) => Promise<void>;

  // Admin datasets & actions
  allAppointments: Appointment[];
  allProfiles: UserProfile[];
  auditLogs: AuditLogEntry[];
  updateAppointmentStatus: (appointmentId: string, status: 'Upcoming' | 'Completed' | 'Cancelled') => Promise<void>;
  updateEmergencyEventStatus: (eventId: string, status: EmergencyStatus, responseStatus: string) => Promise<void>;
  updateUserRole: (uid: string, role: 'patient' | 'admin' | 'doctor') => Promise<void>;

  // Reminders & Browser notifications
  reminders: MedicineReminder[];
  toggleReminderTaken: (id: string) => Promise<void>;
  markReminderMissed: (id: string) => Promise<void>;
  addReminder: (reminder: Omit<MedicineReminder, 'id' | 'takenToday' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  editReminder: (id: string, updates: Partial<Omit<MedicineReminder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  notificationPermission: NotificationPermission | 'unsupported';
  requestBrowserNotifications: () => Promise<NotificationPermission | 'unsupported'>;

  // Notifications
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // Emergency Events
  emergencyEvents: EmergencyEvent[];

  // Settings
  settings: SystemSettings;
  updateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;

  // Emergency SOS State
  isSosModalOpen: boolean;
  openSosModal: () => void;
  closeSosModal: () => void;
  sosDispatched: boolean;
  lastSosEvent: EmergencyEvent | null;
  triggerSosDispatch: (note?: string) => Promise<EmergencyEvent | null>;

  // Medical ID Modal
  isMedicalIdOpen: boolean;
  setIsMedicalIdOpen: (open: boolean) => void;

  // Toast System
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

function captureCurrentCoordinates(): Promise<{
  gpsAvailable: boolean;
  coordinates?: { lat: number; lng: number };
  locationLabel: string;
}> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve({
      gpsAvailable: false,
      locationLabel: 'GPS unavailable on this device/browser',
    });
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({
        gpsAvailable: false,
        locationLabel: 'GPS timed out — state your address directly when calling emergency services',
      });
    }, 4500);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        resolve({
          gpsAvailable: true,
          coordinates: { lat, lng },
          locationLabel: `GPS ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        });
      },
      () => {
        clearTimeout(timer);
        resolve({
          gpsAvailable: false,
          locationLabel: 'GPS permission denied or unavailable — share location manually',
        });
      },
      { enableHighAccuracy: true, timeout: 4000, maximumAge: 15000 }
    );
  });
}

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
  const [slotLocks, setSlotLocks] = useState<DoctorSlotLock[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [reminders, setReminders] = useState<MedicineReminder[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [emergencyEvents, setEmergencyEvents] = useState<EmergencyEvent[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(
    getBrowserNotificationPermission
  );

  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [sosDispatched, setSosDispatched] = useState(false);
  const [lastSosEvent, setLastSosEvent] = useState<EmergencyEvent | null>(null);
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

  const resetUserState = useCallback(() => {
    setProfileDoc(emptyUserProfile);
    setEmergencyContacts([]);
    setVitalLogs([]);
    setScanHistory([]);
    setChatMessages([]);
    setDoctors([]);
    setSlotLocks([]);
    setAppointments([]);
    setAllAppointments([]);
    setAllProfiles([]);
    setAuditLogs([]);
    setReminders([]);
    setNotifications([]);
    setEmergencyEvents([]);
    setLastSosEvent(null);
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

  // Attach Firestore listeners when authenticated & email verified
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
        unsubs.push(
          effectiveAdmin
            ? subscribeAllDoctorsForAdmin(setDoctors, handleSubError)
            : subscribeDoctors(setDoctors, handleSubError)
        );
        unsubs.push(subscribeActiveSlotLocks(setSlotLocks, handleSubError));
        unsubs.push(subscribeAppointments(firebaseUser.uid, setAppointments, handleSubError));
        unsubs.push(subscribeMedicineReminders(firebaseUser.uid, setReminders, handleSubError));
        unsubs.push(subscribeScanHistory(firebaseUser.uid, setScanHistory, handleSubError));
        unsubs.push(subscribeChatHistory(firebaseUser.uid, setChatMessages, handleSubError));
        unsubs.push(subscribeEmergencyContacts(firebaseUser.uid, setEmergencyContacts, handleSubError));
        unsubs.push(subscribeNotifications(firebaseUser.uid, setNotifications, handleSubError));
        unsubs.push(subscribeEmergencyEvents(firebaseUser.uid, effectiveAdmin, setEmergencyEvents, handleSubError));

        if (effectiveAdmin) {
          unsubs.push(subscribeAllAppointmentsForAdmin(setAllAppointments, handleSubError));
          unsubs.push(subscribeAllProfilesForAdmin(setAllProfiles, handleSubError));
          unsubs.push(subscribeAuditLogs(setAuditLogs, handleSubError));
        }
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

  // Sync theme with root HTML tag classes (dark vs light)
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
  }, [settings.theme]);

  // Live Medication Reminder Scheduler (checks every 60s when browser notifications & scheduling are enabled)
  useEffect(() => {
    if (!isEmailVerified || !settings.pushNotifications) return;

    const triggeredKeyPrefix = 'hc_rem_fired_';
    const checkDueReminders = () => {
      const now = new Date();
      const hours24 = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours24 >= 12 ? 'PM' : 'AM';
      const hours12 = String(hours24 % 12 || 12).padStart(2, '0');
      const currentSlot = `${hours12}:${minutes} ${ampm}`;
      const todayKey = now.toISOString().slice(0, 10);

      reminders.forEach((rem) => {
        if (!rem.active || rem.takenToday) return;
        const matchesNow = rem.timeSlots.some(
          (slot) => slot.trim().toUpperCase() === currentSlot
        );
        if (!matchesNow) return;

        const dedupeKey = `${triggeredKeyPrefix}${rem.id}_${todayKey}_${currentSlot}`;
        try {
          if (sessionStorage.getItem(dedupeKey)) return;
          sessionStorage.setItem(dedupeKey, '1');
        } catch {
          // Ignore storage restrictions
        }

        showToast(`Medication Due (${currentSlot}): ${rem.name} — ${rem.dosage}`, 'info');
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`Medication Due: ${rem.name}`, {
              body: `${rem.dosage} (${rem.instructions}) scheduled for ${currentSlot}`,
            });
          } catch {
            // Ignore notification runtime restrictions
          }
        }
      });
    };

    checkDueReminders();
    const interval = setInterval(checkDueReminders, 60_000);
    return () => clearInterval(interval);
  }, [isEmailVerified, settings.pushNotifications, reminders, showToast]);

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  }, []);

  const recordAudit = async (
    action: string,
    targetType: AuditLogEntry['targetType'],
    details: string,
    targetId?: string
  ) => {
    if (!firebaseUser || !isAdmin) return;
    try {
      await createAuditLogDoc({
        actorUid: firebaseUser.uid,
        actorEmail: firebaseUser.email || 'admin@healthcare.app',
        action,
        targetType,
        targetId,
        details,
      });
    } catch {
      // Non-blocking audit log error
    }
  };

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
        showToast('Email verified! Loading your HealthCare+ vault...', 'success');
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

  const editEmergencyContact = async (
    id: string,
    updates: Partial<Omit<EmergencyContact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ) => {
    try {
      await updateEmergencyContactDoc(id, updates);
      showToast('Emergency contact updated', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update emergency contact', 'error');
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

  const editVitalLog = async (
    id: string,
    updates: Partial<Omit<VitalLog, 'id' | 'userId' | 'timestamp' | 'createdAt' | 'updatedAt'>>
  ) => {
    try {
      await updateHealthRecordDoc(id, updates);
      showToast('Vital log updated in Cloud Firestore', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update vital log', 'error');
    }
  };

  const removeVitalLog = async (id: string) => {
    try {
      await deleteHealthRecordDoc(id);
      showToast('Vital record removed from history', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete vital log', 'error');
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
        title: 'Doctor Appointment Booked',
        message: `${doctor.name} (${type}) scheduled for ${date} at ${timeSlot}.`,
        type: 'appointment',
        appointmentId,
      });
      showToast(`Appointment booked with ${doctor.name}`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to book appointment', 'error');
      throw err;
    }
  };

  const cancelAppointment = async (id: string) => {
    try {
      const appt = appointments.find((a) => a.id === id) || allAppointments.find((a) => a.id === id);
      await updateAppointmentStatusDoc(
        id,
        'Cancelled',
        appt ? { doctorId: appt.doctorId, date: appt.date, timeSlot: appt.timeSlot } : undefined
      );
      showToast('Appointment cancelled & slot released', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to cancel appointment', 'error');
    }
  };

  const updateAppointmentStatus = async (
    appointmentId: string,
    status: 'Upcoming' | 'Completed' | 'Cancelled'
  ) => {
    if (!isAdmin) return;
    try {
      const appt = allAppointments.find((a) => a.id === appointmentId);
      await updateAppointmentStatusDoc(
        appointmentId,
        status,
        appt ? { doctorId: appt.doctorId, date: appt.date, timeSlot: appt.timeSlot } : undefined
      );
      await recordAudit(
        `APPOINTMENT_${status.toUpperCase()}`,
        'appointment',
        `Updated appointment ${appointmentId} to ${status}`,
        appointmentId
      );
      showToast(`Appointment marked as ${status}`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update appointment status', 'error');
    }
  };

  const seedDoctorDirectory = async () => {
    if (!isAdmin) {
      showToast('Only verified administrators can seed sample doctors.', 'error');
      return;
    }
    try {
      for (const docItem of demoSampleDoctors) {
        const { id, ...rest } = docItem;
        await createDoctorDoc(
          {
            ...rest,
            verified: false,
            isDemo: true,
            verificationStatus: 'demo',
          },
          id
        );
      }
      await recordAudit(
        'SEED_DEMO_DOCTORS',
        'doctor',
        `Seeded ${demoSampleDoctors.length} clearly labeled demo sample doctor profiles.`
      );
      showToast('Demo sample doctor profiles populated in Firestore', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to populate demo doctors', 'error');
    }
  };

  const addDoctor = async (doctor: Omit<Doctor, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!isAdmin) return;
    try {
      const newId = await createDoctorDoc(doctor);
      await recordAudit(
        'CREATE_DOCTOR',
        'doctor',
        `Added ${doctor.name} (${doctor.specialty}, status: ${doctor.verificationStatus || 'verified'})`,
        newId
      );
      showToast(`${doctor.name} added to specialist directory`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to create doctor profile', 'error');
      throw err;
    }
  };

  const editDoctor = async (
    doctorId: string,
    updates: Partial<Omit<Doctor, 'id' | 'createdAt' | 'updatedAt'>>
  ) => {
    if (!isAdmin) return;
    try {
      await updateDoctorDoc(doctorId, updates);
      await recordAudit('UPDATE_DOCTOR', 'doctor', `Updated doctor ${doctorId}`, doctorId);
      showToast('Doctor profile updated', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update doctor profile', 'error');
    }
  };

  const verifyDoctor = async (doctorId: string, verified = true) => {
    if (!isAdmin) {
      showToast('Only verified administrators can verify licenses.', 'error');
      return;
    }
    try {
      await verifyDoctorDoc(doctorId, verified);
      await recordAudit(
        verified ? 'VERIFY_DOCTOR' : 'UNVERIFY_DOCTOR',
        'doctor',
        `Set doctor ${doctorId} verified=${verified}`,
        doctorId
      );
      showToast(
        verified ? 'Doctor marked as Admin-Verified Clinician' : 'Doctor verification revoked',
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Failed to verify doctor', 'error');
    }
  };

  const removeDoctor = async (doctorId: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoctorDoc(doctorId);
      await recordAudit('DELETE_DOCTOR', 'doctor', `Deleted doctor ${doctorId}`, doctorId);
      showToast('Doctor removed from directory', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete doctor', 'error');
    }
  };

  const updateEmergencyEventStatus = async (
    eventId: string,
    status: EmergencyStatus,
    responseStatus: string
  ) => {
    if (!isAdmin) return;
    try {
      await updateEmergencyEventStatusDoc(eventId, status, responseStatus);
      await recordAudit(
        `SOS_${status}`,
        'emergency',
        `Updated SOS event ${eventId} to ${status}: ${responseStatus}`,
        eventId
      );
      showToast(`Emergency event updated to ${status}`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update SOS event', 'error');
    }
  };

  const updateUserRole = async (uid: string, role: 'patient' | 'admin' | 'doctor') => {
    if (!isAdmin) return;
    try {
      const targetProf = allProfiles.find((p) => p.id === uid || p.userId === uid);
      // Update Firestore profile + admins registry first
      await setUserRoleDocs(uid, role, targetProf?.email);

      // Attempt backend custom claims sync if Firebase Admin SDK is configured
      try {
        const token = await getAuthToken();
        if (token) {
          const res = await fetch(`/api/admin/users/${encodeURIComponent(uid)}/role`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ role }),
          });
          if (!res.ok && res.status !== 501) {
            const errBody = await res.json().catch(() => ({}));
            console.warn('Backend custom claim sync warning:', errBody?.error || res.status);
          }
        }
      } catch {
        // Non-fatal if FIREBASE_SERVICE_ACCOUNT_JSON is not set; Firestore admins registry still governs access
      }

      await recordAudit('SET_USER_ROLE', 'user', `Updated user ${uid} role to ${role}`, uid);
      showToast(`User role updated to ${role}`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update user role', 'error');
    }
  };

  const toggleReminderTaken = async (id: string) => {
    const target = reminders.find((r) => r.id === id);
    if (!target) return;
    try {
      await toggleReminderTakenDoc(target);
      showToast(
        target.takenToday ? 'Marked dose as pending for today' : `Logged dose for ${target.name}`,
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Failed to update medication status', 'error');
    }
  };

  const markReminderMissed = async (id: string) => {
    const target = reminders.find((r) => r.id === id);
    if (!target) return;
    try {
      await markReminderMissedDoc(target);
      showToast(`Recorded missed dose today for ${target.name}`, 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to record missed dose', 'error');
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

  const editReminder = async (
    id: string,
    updates: Partial<Omit<MedicineReminder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ) => {
    try {
      await updateMedicineReminderDoc(id, updates);
      showToast('Medication reminder updated', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update reminder', 'error');
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

  const requestBrowserNotifications = async (): Promise<NotificationPermission | 'unsupported'> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      showToast('Browser notifications are not supported on this device/webview.', 'info');
      return 'unsupported';
    }
    try {
      const result = await Notification.requestPermission();
      setNotificationPermission(result);
      if (result === 'granted') {
        showToast('Browser medication alerts enabled', 'success');
      } else if (result === 'denied') {
        showToast('Notification permission denied in browser settings', 'error');
      }
      return result;
    } catch {
      return getBrowserNotificationPermission();
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await markNotificationReadDoc(id);
    } catch (err: any) {
      showToast(err?.message || 'Failed to update notification', 'error');
    }
  };

  const markAllNotificationsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    try {
      await Promise.all(unread.map((n) => markNotificationReadDoc(n.id)));
      showToast('All notifications marked as read', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to mark notifications read', 'error');
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
    setLastSosEvent(null);
  };

  const closeSosModal = () => {
    setIsSosModalOpen(false);
    setSosDispatched(false);
  };

  const triggerSosDispatch = async (note?: string): Promise<EmergencyEvent | null> => {
    if (!firebaseUser) return null;
    try {
      const geo = await captureCurrentCoordinates();
      const token = await getAuthToken();

      const res = await fetch('/api/emergency/sos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userLocation: geo.locationLabel,
          gpsAvailable: geo.gpsAvailable,
          coordinates: geo.coordinates,
          emergencyContacts,
          note: note || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'SOS logging failed');
      }

      const status: EmergencyStatus = emergencyContacts.length > 0 ? 'CONTACTS_NOTIFIED' : 'REQUESTED';
      const notificationAttempts: string[] = Array.isArray(data.notificationAttempts)
        ? data.notificationAttempts
        : emergencyContacts.map(
            (c) => `Prepared manual call/SMS option for ${c.name} (${c.relation}) at ${c.phone}`
          );

      const responseStatus =
        data.responseStatus ||
        'SOS logged in HealthCare+ vault. No ambulance was auto-dispatched — call emergency services (112 / 108 / 911) directly.';

      const createdId = await createEmergencyEventDoc(firebaseUser.uid, {
        patientName: user.name || firebaseUser.email || 'Patient',
        sosId: data.sosId,
        userLocation: data.userLocation || geo.locationLabel,
        gpsAvailable: geo.gpsAvailable,
        coordinates: geo.coordinates,
        status,
        responseStatus,
        notificationAttempts,
        notifiedContactsCount: emergencyContacts.length,
        note: note || '',
      });

      const loggedEvent: EmergencyEvent = {
        id: createdId,
        userId: firebaseUser.uid,
        patientName: user.name || firebaseUser.email || 'Patient',
        sosId: data.sosId,
        userLocation: data.userLocation || geo.locationLabel,
        gpsAvailable: geo.gpsAvailable,
        coordinates: geo.coordinates,
        status,
        responseStatus,
        notificationAttempts,
        notifiedContactsCount: emergencyContacts.length,
        note: note || '',
        createdAt: new Date().toISOString(),
      };

      setLastSosEvent(loggedEvent);
      setSosDispatched(true);

      await createNotificationDoc(firebaseUser.uid, {
        title: 'SOS Emergency Logged',
        message: `${geo.locationLabel}. Use direct dial buttons (112 / 108 / 911) and notify saved emergency contacts.`,
        type: 'sos',
      });

      showToast('SOS Request Logged — dial local emergency services if immediate medical care is needed.', 'error');
      return loggedEvent;
    } catch (e: any) {
      showToast(e?.message || 'Failed to log SOS request', 'error');
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
        editEmergencyContact,
        removeEmergencyContact,

        vitalLogs,
        latestVital,
        addVitalLog,
        editVitalLog,
        removeVitalLog,
        healthScore,

        scanHistory,
        addScanResult,
        removeScan,

        chatMessages,
        addChatMessage,
        clearChat,

        doctors,
        slotLocks,
        appointments,
        bookAppointment,
        cancelAppointment,
        seedDoctorDirectory,
        addDoctor,
        editDoctor,
        verifyDoctor,
        removeDoctor,

        allAppointments,
        allProfiles,
        auditLogs,
        updateAppointmentStatus,
        updateEmergencyEventStatus,
        updateUserRole,

        reminders,
        toggleReminderTaken,
        markReminderMissed,
        addReminder,
        editReminder,
        removeReminder,
        notificationPermission,
        requestBrowserNotifications,

        notifications,
        markNotificationRead,
        markAllNotificationsRead,

        emergencyEvents,

        settings,
        updateSettings,

        isSosModalOpen,
        openSosModal,
        closeSosModal,
        sosDispatched,
        lastSosEvent,
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
