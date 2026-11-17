export type ThemeMode = 'dark' | 'light';

export interface UserProfile {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  bloodGroup: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  heightCm: number;
  weightKg: number;
  bmi: number;
  medicalConditions: string[];
  allergies: string[];
  emergencyContacts: EmergencyContact[];
  isDonor: boolean;
  role: 'patient' | 'admin' | 'doctor';
  settings?: SystemSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmergencyContact {
  id: string;
  userId?: string;
  name: string;
  relation: string;
  phone: string;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface VitalLog {
  id: string;
  userId?: string;
  timestamp: string; // ISO date string
  heartRate: number; // bpm
  bloodPressureSys: number; // mmHg
  bloodPressureDia: number; // mmHg
  bloodSugar: number; // mg/dL
  bmi: number;
  weightKg: number;
  temperatureC: number;
  spO2: number; // %
  waterIntakeMl: number;
  sleepHours: number;
  mood: 'Excellent' | 'Good' | 'Neutral' | 'Fatigued' | 'Unwell';
  createdAt?: string;
  updatedAt?: string;
}

export interface MedicineScanResult {
  id: string;
  userId?: string;
  timestamp: string;
  imageUrl?: string;
  name: string;
  composition: string;
  expiryDate: string;
  uses: string[];
  benefits: string[];
  sideEffects: string[];
  dosage: string;
  warnings: string[];
  storage: string;
  alternativeMedicines: { name: string; approxPrice: string; manufacturer: string }[];
  priceRange: string;
  disclaimer: string;
  saved: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatMessage {
  id: string;
  userId?: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  audioUrl?: string;
  category?: 'general' | 'symptom' | 'medicine' | 'diet' | 'report';
  createdAt?: string;
  updatedAt?: string;
}

export interface Doctor {
  id: string;
  name: string;
  title: string;
  specialty: string;
  experienceYears: number;
  rating: number;
  reviewCount: number;
  feeUsd: number;
  photo: string;
  address: string;
  lat: number;
  lng: number;
  hospital: string;
  availableSlots: string[];
  bio: string;
  languages: string[];
  verified?: boolean;
  isDemo?: boolean;
  verificationStatus?: 'demo' | 'pending' | 'verified';
  licenseNumber?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Appointment {
  id: string;
  userId?: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorPhoto: string;
  date: string;
  timeSlot: string;
  type: 'In-Person' | 'Video Consultation';
  status: 'Upcoming' | 'Completed' | 'Cancelled';
  symptoms?: string;
  meetingLink?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DoctorSlotLock {
  id: string;
  doctorId: string;
  date: string;
  timeSlot: string;
  bookedByUid: string;
  appointmentId: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface NearbyPlace {
  id: string;
  placeId: string;
  name: string;
  category: 'Hospital' | 'Pharmacy' | 'Clinic' | 'Diagnostic' | 'Blood Bank';
  address: string;
  distanceKm: number | null;
  rating: number | null;
  reviewCount: number;
  phone: string;
  openNow: boolean | null;
  websiteUri?: string;
  googleMapsUri?: string;
  directionsUri?: string;
  lat: number;
  lng: number;
}

export interface MedicineReminder {
  id: string;
  userId?: string;
  name: string;
  dosage: string;
  frequency: 'Daily' | 'Weekly' | 'As Needed';
  timeSlots: string[]; // e.g. ["08:00 AM", "08:00 PM"]
  instructions: 'Before Food' | 'After Food' | 'With Water';
  pillsLeft: number;
  takenToday: boolean;
  lastTakenDate?: string; // YYYY-MM-DD
  completedDates?: string[];
  missedDates?: string[];
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'reminder' | 'appointment' | 'sos' | 'system';
  read: boolean;
  appointmentId?: string;
  createdAt: string;
  updatedAt?: string;
}

export type EmergencyStatus =
  | 'REQUESTED'
  | 'CONTACTS_NOTIFIED'
  | 'ACKNOWLEDGED'
  | 'RESOLVED'
  | 'CANCELLED';

export interface EmergencyEvent {
  id: string;
  userId: string;
  patientName?: string;
  sosId: string;
  userLocation: string;
  gpsAvailable: boolean;
  coordinates?: { lat: number; lng: number };
  status: EmergencyStatus;
  responseStatus: string;
  notificationAttempts: string[];
  notifiedContactsCount: number;
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  targetType: 'doctor' | 'appointment' | 'user' | 'emergency' | 'system';
  targetId?: string;
  details: string;
  createdAt: string;
}

export interface SystemSettings {
  theme: ThemeMode;
  language: 'English' | 'Spanish' | 'French' | 'German' | 'Hindi';
  pushNotifications: boolean;
  smsAlerts: boolean;
  emailAlerts: boolean;
  biometricsEnabled: boolean;
  dataSaver: boolean;
  locationAccess: boolean;
}
