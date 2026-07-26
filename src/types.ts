export type ThemeMode = 'dark' | 'light';

export interface UserProfile {
  id: string;
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
}

export interface EmergencyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
  isPrimary: boolean;
}

export interface VitalLog {
  id: string;
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
}

export interface MedicineScanResult {
  id: string;
  timestamp: string;
  imageUrl?: string;
  name: string;
  composition: string;
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
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  audioUrl?: string;
  category?: 'general' | 'symptom' | 'medicine' | 'diet' | 'report';
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
}

export interface Appointment {
  id: string;
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
}

export interface NearbyPlace {
  id: string;
  name: string;
  category: 'Hospital' | 'Pharmacy' | 'Blood Bank' | 'Diagnostic' | 'Ambulance';
  address: string;
  distanceKm: number;
  rating: number;
  reviewCount: number;
  phone: string;
  isOpen24: boolean;
  lat: number;
  lng: number;
}

export interface MedicineReminder {
  id: string;
  name: string;
  dosage: string;
  frequency: 'Daily' | 'Weekly' | 'As Needed';
  timeSlots: string[]; // e.g. ["08:00", "20:00"]
  instructions: 'Before Food' | 'After Food' | 'With Water';
  pillsLeft: number;
  takenToday: boolean;
  active: boolean;
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
