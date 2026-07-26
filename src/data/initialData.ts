import { UserProfile, VitalLog, Doctor, NearbyPlace, MedicineReminder, MedicineScanResult, ChatMessage } from '../types';

export const initialUserProfile: UserProfile = {
  id: 'usr_1001',
  name: 'Alex Vance',
  email: 'alex.vance@healthcare.plus',
  phone: '+1 (555) 234-5678',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
  bloodGroup: 'O+',
  age: 32,
  gender: 'Male',
  heightCm: 178,
  weightKg: 72,
  bmi: 22.7,
  medicalConditions: ['Mild Asthma', 'Seasonal Allergies'],
  allergies: ['Penicillin', 'Peanuts'],
  emergencyContacts: [
    {
      id: 'em_1',
      name: 'Sarah Vance',
      relation: 'Spouse',
      phone: '+1 (555) 987-6543',
      isPrimary: true
    },
    {
      id: 'em_2',
      name: 'Dr. Robert Vance',
      relation: 'Father / General Physician',
      phone: '+1 (555) 888-1212',
      isPrimary: false
    }
  ],
  isDonor: true,
  role: 'patient'
};

export const initialVitalLogs: VitalLog[] = [
  {
    id: 'v_1',
    timestamp: new Date().toISOString(),
    heartRate: 72,
    bloodPressureSys: 118,
    bloodPressureDia: 78,
    bloodSugar: 95,
    bmi: 22.7,
    weightKg: 72,
    temperatureC: 36.6,
    spO2: 99,
    waterIntakeMl: 2200,
    sleepHours: 7.5,
    mood: 'Good'
  },
  {
    id: 'v_2',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    heartRate: 75,
    bloodPressureSys: 120,
    bloodPressureDia: 80,
    bloodSugar: 98,
    bmi: 22.7,
    weightKg: 72.1,
    temperatureC: 36.7,
    spO2: 98,
    waterIntakeMl: 2500,
    sleepHours: 8.0,
    mood: 'Excellent'
  },
  {
    id: 'v_3',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    heartRate: 68,
    bloodPressureSys: 116,
    bloodPressureDia: 76,
    bloodSugar: 92,
    bmi: 22.8,
    weightKg: 72.3,
    temperatureC: 36.5,
    spO2: 99,
    waterIntakeMl: 1800,
    sleepHours: 6.8,
    mood: 'Neutral'
  }
];

export const initialDoctors: Doctor[] = [
  {
    id: 'doc_1',
    name: 'Dr. Elena Rostova',
    title: 'MD, Chief Cardiologist',
    specialty: 'Cardiology',
    experienceYears: 14,
    rating: 4.9,
    reviewCount: 328,
    feeUsd: 120,
    photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400',
    address: 'Metropolitan Heart Institute, 5th Avenue',
    lat: 37.7749,
    lng: -122.4194,
    hospital: 'Metropolitan Heart Center',
    availableSlots: ['09:00 AM', '11:30 AM', '02:00 PM', '04:30 PM'],
    bio: 'Specialist in preventative cardiology, hypertension management, and advanced electrophysiology with over 14 years of clinical research.',
    languages: ['English', 'Russian', 'French']
  },
  {
    id: 'doc_2',
    name: 'Dr. Marcus Thorne',
    title: 'MD, Senior Neurologist',
    specialty: 'Neurology',
    experienceYears: 18,
    rating: 4.95,
    reviewCount: 412,
    feeUsd: 150,
    photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400',
    address: 'St. Jude Neurological Suite 402',
    lat: 37.7833,
    lng: -122.4167,
    hospital: 'St. Jude General Hospital',
    availableSlots: ['10:00 AM', '01:00 PM', '03:30 PM'],
    bio: 'Pioneer in non-invasive neuro-stimulation, sleep science disorders, and cognitive preservation therapies.',
    languages: ['English', 'German']
  },
  {
    id: 'doc_3',
    name: 'Dr. Aisha Patel',
    title: 'MD, Consultant Dermatologist',
    specialty: 'Dermatology',
    experienceYears: 11,
    rating: 4.88,
    reviewCount: 219,
    feeUsd: 95,
    photo: 'https://images.unsplash.com/photo-1594824813566-78a0a9310a01?auto=format&fit=crop&q=80&w=400',
    address: 'Lumière Skin Clinic, Beverly Hills',
    lat: 37.7650,
    lng: -122.4200,
    hospital: 'Lumière Aesthetic Medical Center',
    availableSlots: ['08:30 AM', '10:30 AM', '02:30 PM', '05:00 PM'],
    bio: 'Expert in clinical dermatology, laser skin rejuvenation, and allergic contact dermatitis diagnostics.',
    languages: ['English', 'Hindi', 'Gujarati']
  },
  {
    id: 'doc_4',
    name: 'Dr. Julian Sterling',
    title: 'MD, General Physician & Wellness Specialist',
    specialty: 'General Medicine',
    experienceYears: 15,
    rating: 4.92,
    reviewCount: 540,
    feeUsd: 80,
    photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400',
    address: 'Healthcare+ Prime Care Pavilion',
    lat: 37.7700,
    lng: -122.4300,
    hospital: 'Healthcare+ Central Clinic',
    availableSlots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM'],
    bio: 'Holistic practitioner focusing on preventative wellness, metabolic health optimize, and routine diagnostics.',
    languages: ['English', 'Spanish']
  }
];

export const initialNearbyPlaces: NearbyPlace[] = [
  {
    id: 'p_1',
    name: 'St. Vincent Apex Super Speciality Hospital',
    category: 'Hospital',
    address: '742 Evergreen Terrace, Medical District',
    distanceKm: 0.8,
    rating: 4.9,
    reviewCount: 1420,
    phone: '+1 (800) 555-9111',
    isOpen24: true,
    lat: 37.7749,
    lng: -122.4194
  },
  {
    id: 'p_2',
    name: 'Apollo 24/7 Precision Pharmacy',
    category: 'Pharmacy',
    address: '102 Tech Plaza, Ground Floor',
    distanceKm: 0.3,
    rating: 4.8,
    reviewCount: 890,
    phone: '+1 (800) 555-2424',
    isOpen24: true,
    lat: 37.7760,
    lng: -122.4180
  },
  {
    id: 'p_3',
    name: 'Red Cross Central Blood & Plasma Bank',
    category: 'Blood Bank',
    address: '405 University Avenue',
    distanceKm: 1.5,
    rating: 4.95,
    reviewCount: 650,
    phone: '+1 (800) 555-1000',
    isOpen24: true,
    lat: 37.7800,
    lng: -122.4100
  },
  {
    id: 'p_4',
    name: 'Quest Diagnostics Precision Imaging Center',
    category: 'Diagnostic',
    address: '88 West Medical Blvd, Suite 12',
    distanceKm: 2.1,
    rating: 4.7,
    reviewCount: 430,
    phone: '+1 (800) 555-7000',
    isOpen24: false,
    lat: 37.7650,
    lng: -122.4250
  },
  {
    id: 'p_5',
    name: 'City Rapid Response Ambulance Station #4',
    category: 'Ambulance',
    address: '12 Emergency Response Way',
    distanceKm: 0.5,
    rating: 5.0,
    reviewCount: 310,
    phone: '911 / Direct Dispatch',
    isOpen24: true,
    lat: 37.7720,
    lng: -122.4210
  }
];

export const initialReminders: MedicineReminder[] = [
  {
    id: 'rem_1',
    name: 'Amoxicillin 500mg',
    dosage: '1 Capsule',
    frequency: 'Daily',
    timeSlots: ['08:00 AM', '08:00 PM'],
    instructions: 'After Food',
    pillsLeft: 14,
    takenToday: true,
    active: true
  },
  {
    id: 'rem_2',
    name: 'Vitamin D3 60,000 IU',
    dosage: '1 Tablet',
    frequency: 'Weekly',
    timeSlots: ['09:00 AM'],
    instructions: 'With Water',
    pillsLeft: 4,
    takenToday: false,
    active: true
  },
  {
    id: 'rem_3',
    name: 'Omega-3 Fish Oil 1000mg',
    dosage: '2 Softgels',
    frequency: 'Daily',
    timeSlots: ['01:00 PM'],
    instructions: 'With Water',
    pillsLeft: 45,
    takenToday: false,
    active: true
  }
];

export const sampleScanResult: MedicineScanResult = {
  id: 'scan_8812',
  timestamp: new Date().toISOString(),
  name: 'Augmentin 625 Duo',
  composition: 'Amoxicillin Trihydrate (500mg) + Potassium Clavulanate (125mg)',
  uses: ['Bacterial Respiratory Infections', 'Sinusitis & Otitis Media', 'Skin & Soft Tissue Infections', 'Urinary Tract Infections'],
  benefits: ['Dual action against beta-lactamase producing bacteria', 'Fast-acting antibiotic broad spectrum relief', 'Reduces bacterial resistance risks'],
  sideEffects: ['Mild Nausea', 'Diarrhea', 'Skin Rash or Hives', 'Abdominal Discomfort'],
  dosage: '1 Tablet twice daily after meals for 5 to 7 days or as directed by physician.',
  warnings: ['Do not stop course abruptly even if symptoms improve', 'Inform doctor if allergic to Penicillin', 'May interact with blood thinners and oral contraceptives'],
  storage: 'Store below 25°C in a dry place protected from direct sunlight and moisture.',
  alternativeMedicines: [
    { name: 'Moxikind-CV 625', approxPrice: '$12.50 / strip', manufacturer: 'Mankind Pharma' },
    { name: 'Clavam 625', approxPrice: '$14.00 / strip', manufacturer: 'Alkem Labs' },
    { name: 'Advent 625', approxPrice: '$11.80 / strip', manufacturer: 'Cipla Therapeutics' }
  ],
  priceRange: '$12.00 - $16.00 per pack of 10 tablets',
  disclaimer: 'Medical Disclaimer: This information is AI-generated for educational reference only. Consult a registered physician before taking any prescription medication.',
  saved: true
};

export const sampleChatMessages: ChatMessage[] = [
  {
    id: 'msg_1',
    sender: 'assistant',
    text: 'Hello Alex! I am your HealthCare+ AI Medical Assistant powered by Gemini 3.6. How can I assist with your vitals, symptoms, diet, or medicine inquiries today?',
    timestamp: new Date().toISOString(),
    category: 'general'
  }
];

export const healthTipsList = [
  {
    title: 'Hydration & Vitals',
    category: 'Cardiovascular',
    tip: 'Drinking 500ml of water 30 minutes before meals improves digestion and regulates resting pulse rate.'
  },
  {
    title: 'Deep Rest & Immune Health',
    category: 'Sleep Science',
    tip: '7.5 hours of consistent deep sleep boosts natural T-cell immune responses by up to 40%.'
  },
  {
    title: 'Postural Ergonomics',
    category: 'Spine & Joints',
    tip: 'Position your screen at eye level and follow the 20-20-20 rule to eliminate digital eye fatigue.'
  }
];
