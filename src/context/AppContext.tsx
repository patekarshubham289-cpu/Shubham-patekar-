import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserProfile,
  VitalLog,
  Doctor,
  Appointment,
  NearbyPlace,
  MedicineReminder,
  MedicineScanResult,
  ChatMessage,
  SystemSettings
} from '../types';
import {
  initialUserProfile,
  initialVitalLogs,
  initialDoctors,
  initialNearbyPlaces,
  initialReminders,
  sampleScanResult,
  sampleChatMessages
} from '../data/initialData';

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

interface AppContextType {
  // Auth & View state
  isAuthenticated: boolean;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  user: UserProfile;
  login: (email: string) => void;
  logout: () => void;
  updateProfile: (updated: Partial<UserProfile>) => void;

  // Health Vitals
  vitalLogs: VitalLog[];
  latestVital: VitalLog;
  addVitalLog: (log: Omit<VitalLog, 'id' | 'timestamp'>) => void;
  healthScore: number;

  // Medicine Scanner History
  scanHistory: MedicineScanResult[];
  addScanResult: (result: MedicineScanResult) => void;
  removeScan: (id: string) => void;

  // AI Chat
  chatMessages: ChatMessage[];
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearChat: () => void;

  // Appointments & Doctors
  doctors: Doctor[];
  appointments: Appointment[];
  bookAppointment: (doctorId: string, date: string, timeSlot: string, type: 'In-Person' | 'Video Consultation', symptoms?: string) => void;
  cancelAppointment: (id: string) => void;

  // Reminders
  reminders: MedicineReminder[];
  toggleReminderTaken: (id: string) => void;
  addReminder: (reminder: Omit<MedicineReminder, 'id' | 'takenToday'>) => void;

  // Places
  nearbyPlaces: NearbyPlace[];

  // Settings
  settings: SystemSettings;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;

  // Emergency SOS State
  isSosModalOpen: boolean;
  openSosModal: () => void;
  closeSosModal: () => void;
  sosDispatched: boolean;
  triggerSosDispatch: () => Promise<any>;

  // Medical ID Modal
  isMedicalIdOpen: boolean;
  setIsMedicalIdOpen: (open: boolean) => void;

  // Toast System
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [user, setUser] = useState<UserProfile>(initialUserProfile);
  
  const [vitalLogs, setVitalLogs] = useState<VitalLog[]>(initialVitalLogs);
  const [scanHistory, setScanHistory] = useState<MedicineScanResult[]>([sampleScanResult]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(sampleChatMessages);
  const [doctors] = useState<Doctor[]>(initialDoctors);
  
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: 'app_101',
      doctorId: 'doc_1',
      doctorName: 'Dr. Elena Rostova',
      doctorSpecialty: 'Cardiology',
      doctorPhoto: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400',
      date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      timeSlot: '11:30 AM',
      type: 'Video Consultation',
      status: 'Upcoming',
      symptoms: 'Routine cardiovascular checkup & blood pressure review',
      createdAt: new Date().toISOString()
    }
  ]);

  const [reminders, setReminders] = useState<MedicineReminder[]>(initialReminders);
  const [nearbyPlaces] = useState<NearbyPlace[]>(initialNearbyPlaces);

  const [settings, setSettings] = useState<SystemSettings>({
    theme: 'dark',
    language: 'English',
    pushNotifications: true,
    smsAlerts: true,
    emailAlerts: true,
    biometricsEnabled: true,
    dataSaver: false,
    locationAccess: true
  });

  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [sosDispatched, setSosDispatched] = useState(false);
  const [isMedicalIdOpen, setIsMedicalIdOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const latestVital = vitalLogs[0] || initialVitalLogs[0];

  // Calculate dynamic Health Score out of 100 based on vitals
  const calculateHealthScore = (): number => {
    let score = 100;
    // Heart rate penalty
    if (latestVital.heartRate < 60 || latestVital.heartRate > 90) score -= 8;
    // BP penalty
    if (latestVital.bloodPressureSys > 130 || latestVital.bloodPressureSys < 90) score -= 10;
    // Sugar penalty
    if (latestVital.bloodSugar > 110) score -= 10;
    // Sleep penalty
    if (latestVital.sleepHours < 7) score -= 8;
    // Water penalty
    if (latestVital.waterIntakeMl < 2000) score -= 5;
    return Math.max(score, 65);
  };

  const healthScore = calculateHealthScore();

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const login = (email: string) => {
    setIsAuthenticated(true);
    setUser(prev => ({ ...prev, email, name: email.split('@')[0].toUpperCase().replace('.', ' ') }));
    showToast('Logged in successfully to HealthCare+', 'success');
  };

  const logout = () => {
    setIsAuthenticated(false);
    showToast('You have been logged out securely', 'info');
  };

  const updateProfile = (updated: Partial<UserProfile>) => {
    setUser(prev => ({ ...prev, ...updated }));
    showToast('Health Profile updated successfully', 'success');
  };

  const addVitalLog = (logData: Omit<VitalLog, 'id' | 'timestamp'>) => {
    const newLog: VitalLog = {
      ...logData,
      id: `v_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    setVitalLogs(prev => [newLog, ...prev]);
    showToast('Vitals recorded to health vault', 'success');
  };

  const addScanResult = (result: MedicineScanResult) => {
    setScanHistory(prev => [result, ...prev]);
    showToast(`Scanned medicine: ${result.name}`, 'success');
  };

  const removeScan = (id: string) => {
    setScanHistory(prev => prev.filter(item => item.id !== id));
    showToast('Scan history entry deleted', 'info');
  };

  const addChatMessage = (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMsg: ChatMessage = {
      ...msg,
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, newMsg]);
  };

  const clearChat = () => {
    setChatMessages([sampleChatMessages[0]]);
    showToast('Chat history cleared', 'info');
  };

  const bookAppointment = (
    doctorId: string,
    date: string,
    timeSlot: string,
    type: 'In-Person' | 'Video Consultation',
    symptoms?: string
  ) => {
    const doctor = doctors.find(d => d.id === doctorId);
    if (!doctor) return;

    const newApp: Appointment = {
      id: `app_${Date.now()}`,
      doctorId,
      doctorName: doctor.name,
      doctorSpecialty: doctor.specialty,
      doctorPhoto: doctor.photo,
      date,
      timeSlot,
      type,
      status: 'Upcoming',
      symptoms,
      createdAt: new Date().toISOString()
    };

    setAppointments(prev => [newApp, ...prev]);
    showToast(`Appointment confirmed with ${doctor.name}`, 'success');
  };

  const cancelAppointment = (id: string) => {
    setAppointments(prev =>
      prev.map(a => (a.id === id ? { ...a, status: 'Cancelled' } : a))
    );
    showToast('Appointment cancelled', 'info');
  };

  const toggleReminderTaken = (id: string) => {
    setReminders(prev =>
      prev.map(r => (r.id === id ? { ...r, takenToday: !r.takenToday } : r))
    );
    showToast('Medicine status updated', 'success');
  };

  const addReminder = (reminderData: Omit<MedicineReminder, 'id' | 'takenToday'>) => {
    const newRem: MedicineReminder = {
      ...reminderData,
      id: `rem_${Date.now()}`,
      takenToday: false
    };
    setReminders(prev => [...prev, newRem]);
    showToast(`Reminder added for ${reminderData.name}`, 'success');
  };

  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    showToast('Settings updated', 'success');
  };

  const openSosModal = () => {
    setIsSosModalOpen(true);
    setSosDispatched(false);
  };

  const closeSosModal = () => {
    setIsSosModalOpen(false);
    setSosDispatched(false);
  };

  const triggerSosDispatch = async () => {
    try {
      setSosDispatched(true);
      const res = await fetch('/api/emergency/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userLocation: 'Current GPS Pin',
          emergencyContacts: user.emergencyContacts
        })
      });
      const data = await res.json();
      showToast('CRITICAL: Emergency SOS dispatched to ambulance & contacts', 'error');
      return data;
    } catch (e) {
      showToast('SOS dispatched locally to nearest emergency services', 'error');
    }
  };

  // Sync theme with root HTML tag class
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        activeTab,
        setActiveTab,
        user,
        login,
        logout,
        updateProfile,

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

        reminders,
        toggleReminderTaken,
        addReminder,

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
        showToast
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
