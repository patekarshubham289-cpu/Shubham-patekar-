import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  getDocs,
  Timestamp,
  Unsubscribe
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreError';
import {
  UserProfile,
  VitalLog,
  Doctor,
  Appointment,
  MedicineReminder,
  MedicineScanResult,
  ChatMessage,
  EmergencyContact,
  NotificationItem,
  EmergencyEvent,
  SystemSettings
} from '../types';
import { sanitizeString, sanitizeStringList, clampNumber, isValidDocumentId } from './validation';

function toIsoString(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return new Date().toISOString();
}

export const defaultSettings: SystemSettings = {
  theme: 'dark',
  language: 'English',
  pushNotifications: true,
  smsAlerts: true,
  emailAlerts: true,
  biometricsEnabled: false,
  dataSaver: false,
  locationAccess: true,
};

// ============================================================================
// ADMIN CHECK
// ============================================================================
export async function checkIsUserAdmin(firebaseUser: FirebaseUser): Promise<boolean> {
  try {
    const tokenResult = await firebaseUser.getIdTokenResult();
    if (tokenResult.claims?.admin === true) {
      return true;
    }
    if (firebaseUser.email === 'patekarshubham07@gmail.com' && firebaseUser.emailVerified) {
      return true;
    }
    const adminSnap = await getDoc(doc(db, 'admins', firebaseUser.uid));
    return adminSnap.exists();
  } catch (error) {
    // Non-admins get false cleanly if admins doc doesn't exist or permission is denied
    return false;
  }
}

// ============================================================================
// PROFILE (/profiles/{uid})
// ============================================================================
export async function ensureUserProfile(firebaseUser: FirebaseUser): Promise<UserProfile> {
  const path = `profiles/${firebaseUser.uid}`;
  try {
    const ref = doc(db, 'profiles', firebaseUser.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();
      return {
        id: snap.id,
        userId: data.userId || firebaseUser.uid,
        name: data.name || firebaseUser.displayName || 'Patient',
        email: data.email || firebaseUser.email || '',
        phone: data.phone || '',
        avatar: data.avatar || firebaseUser.photoURL || '',
        bloodGroup: data.bloodGroup || 'Unknown',
        age: typeof data.age === 'number' ? data.age : 30,
        gender: data.gender || 'Other',
        heightCm: typeof data.heightCm === 'number' ? data.heightCm : 170,
        weightKg: typeof data.weightKg === 'number' ? data.weightKg : 70,
        bmi: typeof data.bmi === 'number' ? data.bmi : 24.2,
        medicalConditions: Array.isArray(data.medicalConditions) ? data.medicalConditions : [],
        allergies: Array.isArray(data.allergies) ? data.allergies : [],
        emergencyContacts: [],
        isDonor: Boolean(data.isDonor),
        role: data.role || 'patient',
        settings: { ...defaultSettings, ...(data.settings || {}) },
        createdAt: toIsoString(data.createdAt),
        updatedAt: toIsoString(data.updatedAt),
      };
    }

    const displayName = sanitizeString(
      firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Patient',
      120
    );
    const email = sanitizeString(firebaseUser.email || '', 254);

    const newProfilePayload = {
      userId: firebaseUser.uid,
      name: displayName || 'Patient',
      email,
      phone: sanitizeString(firebaseUser.phoneNumber || '', 32),
      avatar: sanitizeString(firebaseUser.photoURL || '', 500),
      bloodGroup: 'Unknown',
      age: 30,
      gender: 'Other' as const,
      heightCm: 170,
      weightKg: 70,
      bmi: 24.2,
      medicalConditions: [] as string[],
      allergies: [] as string[],
      isDonor: false,
      role: 'patient' as const,
      settings: defaultSettings,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(ref, newProfilePayload);

    return {
      id: firebaseUser.uid,
      ...newProfilePayload,
      emergencyContacts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserProfileDoc(
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> {
  const path = `profiles/${uid}`;
  try {
    const allowedPayload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (updates.name !== undefined) allowedPayload.name = sanitizeString(updates.name, 120) || 'Patient';
    if (updates.phone !== undefined) allowedPayload.phone = sanitizeString(updates.phone, 32);
    if (updates.avatar !== undefined) allowedPayload.avatar = sanitizeString(updates.avatar, 500);
    if (updates.bloodGroup !== undefined) allowedPayload.bloodGroup = sanitizeString(updates.bloodGroup, 10);
    if (updates.age !== undefined) allowedPayload.age = Math.round(clampNumber(updates.age, 0, 130, 30));
    if (updates.gender !== undefined && ['Male', 'Female', 'Other'].includes(updates.gender)) {
      allowedPayload.gender = updates.gender;
    }
    if (updates.heightCm !== undefined) allowedPayload.heightCm = clampNumber(updates.heightCm, 30, 300, 170);
    if (updates.weightKg !== undefined) allowedPayload.weightKg = clampNumber(updates.weightKg, 1, 500, 70);
    if (updates.bmi !== undefined) allowedPayload.bmi = clampNumber(updates.bmi, 5, 100, 24.2);
    if (updates.medicalConditions !== undefined) {
      allowedPayload.medicalConditions = sanitizeStringList(updates.medicalConditions, 30, 120);
    }
    if (updates.allergies !== undefined) {
      allowedPayload.allergies = sanitizeStringList(updates.allergies, 30, 120);
    }
    if (updates.isDonor !== undefined) allowedPayload.isDonor = Boolean(updates.isDonor);
    if (updates.settings !== undefined) allowedPayload.settings = updates.settings;

    await updateDoc(doc(db, 'profiles', uid), allowedPayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeUserProfile(
  uid: string,
  onData: (profile: Partial<UserProfile>) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `profiles/${uid}`;
  return onSnapshot(
    doc(db, 'profiles', uid),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        onData({
          id: snap.id,
          userId: data.userId,
          name: data.name,
          email: data.email,
          phone: data.phone || '',
          avatar: data.avatar || '',
          bloodGroup: data.bloodGroup || 'Unknown',
          age: data.age ?? 30,
          gender: data.gender || 'Other',
          heightCm: data.heightCm ?? 170,
          weightKg: data.weightKg ?? 70,
          bmi: data.bmi ?? 24.2,
          medicalConditions: Array.isArray(data.medicalConditions) ? data.medicalConditions : [],
          allergies: Array.isArray(data.allergies) ? data.allergies : [],
          isDonor: Boolean(data.isDonor),
          role: data.role || 'patient',
          settings: { ...defaultSettings, ...(data.settings || {}) },
          createdAt: toIsoString(data.createdAt),
          updatedAt: toIsoString(data.updatedAt),
        });
      }
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.GET, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

// ============================================================================
// HEALTH RECORDS (/health_records)
// ============================================================================
export function subscribeHealthRecords(
  uid: string,
  onData: (records: VitalLog[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'health_records';
  const q = query(
    collection(db, path),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items: VitalLog[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId,
          timestamp: data.timestamp || toIsoString(data.createdAt),
          heartRate: data.heartRate,
          bloodPressureSys: data.bloodPressureSys,
          bloodPressureDia: data.bloodPressureDia,
          bloodSugar: data.bloodSugar,
          bmi: data.bmi ?? 0,
          weightKg: data.weightKg ?? 0,
          temperatureC: data.temperatureC ?? 36.6,
          spO2: data.spO2,
          waterIntakeMl: data.waterIntakeMl ?? 0,
          sleepHours: data.sleepHours ?? 0,
          mood: data.mood || 'Good',
          createdAt: toIsoString(data.createdAt),
          updatedAt: toIsoString(data.updatedAt),
        };
      });
      onData(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function createHealthRecord(
  uid: string,
  logData: Omit<VitalLog, 'id' | 'timestamp' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const path = 'health_records';
  try {
    const timestamp = new Date().toISOString();
    const docRef = await addDoc(collection(db, path), {
      userId: uid,
      timestamp,
      heartRate: clampNumber(logData.heartRate, 20, 260, 72),
      bloodPressureSys: clampNumber(logData.bloodPressureSys, 40, 300, 120),
      bloodPressureDia: clampNumber(logData.bloodPressureDia, 20, 200, 80),
      bloodSugar: clampNumber(logData.bloodSugar, 20, 800, 95),
      bmi: clampNumber(logData.bmi, 5, 100, 22),
      weightKg: clampNumber(logData.weightKg, 1, 500, 70),
      temperatureC: clampNumber(logData.temperatureC, 30, 45, 36.6),
      spO2: clampNumber(logData.spO2, 50, 100, 98),
      waterIntakeMl: clampNumber(logData.waterIntakeMl, 0, 20000, 0),
      sleepHours: clampNumber(logData.sleepHours, 0, 24, 7.5),
      mood: logData.mood,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// ============================================================================
// DOCTORS (/doctors)
// ============================================================================
export function subscribeDoctors(
  onData: (doctors: Doctor[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'doctors';
  const q = query(collection(db, path), where('verified', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Doctor[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name,
          title: data.title,
          specialty: data.specialty,
          experienceYears: data.experienceYears ?? 5,
          rating: data.rating ?? 4.8,
          reviewCount: data.reviewCount ?? 0,
          feeUsd: data.feeUsd,
          photo: data.photo || '',
          address: data.address || '',
          lat: data.lat ?? 37.7749,
          lng: data.lng ?? -122.4194,
          hospital: data.hospital,
          availableSlots: Array.isArray(data.availableSlots) ? data.availableSlots : ['10:00 AM', '02:00 PM'],
          bio: data.bio || '',
          languages: Array.isArray(data.languages) ? data.languages : ['English'],
          verified: Boolean(data.verified),
          createdAt: toIsoString(data.createdAt),
          updatedAt: toIsoString(data.updatedAt),
        };
      });
      onData(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function createDoctorDoc(
  doctor: Omit<Doctor, 'id' | 'createdAt' | 'updatedAt'>,
  customId?: string
): Promise<string> {
  const path = 'doctors';
  try {
    const payload = {
      name: sanitizeString(doctor.name, 120),
      title: sanitizeString(doctor.title, 120),
      specialty: sanitizeString(doctor.specialty, 80),
      experienceYears: Math.round(clampNumber(doctor.experienceYears, 0, 80, 5)),
      rating: clampNumber(doctor.rating, 0, 5, 4.8),
      reviewCount: Math.round(clampNumber(doctor.reviewCount, 0, 100000, 0)),
      feeUsd: clampNumber(doctor.feeUsd, 0, 10000, 100),
      photo: sanitizeString(doctor.photo, 500),
      address: sanitizeString(doctor.address, 240),
      lat: clampNumber(doctor.lat, -90, 90, 37.7749),
      lng: clampNumber(doctor.lng, -180, 180, -122.4194),
      hospital: sanitizeString(doctor.hospital, 160),
      availableSlots: sanitizeStringList(doctor.availableSlots, 24, 32),
      bio: sanitizeString(doctor.bio, 1000),
      languages: sanitizeStringList(doctor.languages, 15, 40),
      verified: doctor.verified ?? true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (customId && isValidDocumentId(customId)) {
      await setDoc(doc(db, path, customId), payload);
      return customId;
    }
    const ref = await addDoc(collection(db, path), payload);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function verifyDoctorDoc(doctorId: string): Promise<void> {
  const path = `doctors/${doctorId}`;
  try {
    await updateDoc(doc(db, 'doctors', doctorId), {
      verified: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ============================================================================
// APPOINTMENTS (/appointments)
// ============================================================================
export function subscribeAppointments(
  uid: string,
  onData: (appointments: Appointment[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'appointments';
  const q = query(
    collection(db, path),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Appointment[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId,
          doctorId: data.doctorId,
          doctorName: data.doctorName,
          doctorSpecialty: data.doctorSpecialty,
          doctorPhoto: data.doctorPhoto || '',
          date: data.date,
          timeSlot: data.timeSlot,
          type: data.type,
          status: data.status,
          symptoms: data.symptoms || '',
          meetingLink: data.meetingLink || '',
          createdAt: toIsoString(data.createdAt),
          updatedAt: toIsoString(data.updatedAt),
        };
      });
      onData(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function createAppointmentDoc(
  uid: string,
  doctor: Doctor,
  date: string,
  timeSlot: string,
  type: 'In-Person' | 'Video Consultation',
  symptoms?: string
): Promise<string> {
  const path = 'appointments';
  try {
    if (!isValidDocumentId(doctor.id)) {
      throw new Error('Invalid doctor reference ID.');
    }
    const ref = await addDoc(collection(db, path), {
      userId: uid,
      doctorId: doctor.id,
      doctorName: sanitizeString(doctor.name, 120),
      doctorSpecialty: sanitizeString(doctor.specialty, 80),
      doctorPhoto: sanitizeString(doctor.photo, 500),
      date: sanitizeString(date, 32),
      timeSlot: sanitizeString(timeSlot, 32),
      type,
      status: 'Upcoming',
      symptoms: sanitizeString(symptoms || '', 1000),
      meetingLink: type === 'Video Consultation' ? `https://meet.healthcare.plus/room/${doctor.id}-${Date.now()}` : '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateAppointmentStatusDoc(
  appointmentId: string,
  status: 'Upcoming' | 'Completed' | 'Cancelled'
): Promise<void> {
  const path = `appointments/${appointmentId}`;
  try {
    await updateDoc(doc(db, 'appointments', appointmentId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ============================================================================
// MEDICINE REMINDERS (/medicine_reminders)
// ============================================================================
export function subscribeMedicineReminders(
  uid: string,
  onData: (reminders: MedicineReminder[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'medicine_reminders';
  const q = query(
    collection(db, path),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items: MedicineReminder[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId,
          name: data.name,
          dosage: data.dosage,
          frequency: data.frequency,
          timeSlots: Array.isArray(data.timeSlots) ? data.timeSlots : [],
          instructions: data.instructions,
          pillsLeft: data.pillsLeft,
          takenToday: Boolean(data.takenToday),
          active: Boolean(data.active),
          createdAt: toIsoString(data.createdAt),
          updatedAt: toIsoString(data.updatedAt),
        };
      });
      onData(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function createMedicineReminderDoc(
  uid: string,
  reminder: Omit<MedicineReminder, 'id' | 'takenToday' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const path = 'medicine_reminders';
  try {
    const ref = await addDoc(collection(db, path), {
      userId: uid,
      name: sanitizeString(reminder.name, 160),
      dosage: sanitizeString(reminder.dosage, 80),
      frequency: reminder.frequency,
      timeSlots: sanitizeStringList(reminder.timeSlots, 12, 32),
      instructions: reminder.instructions,
      pillsLeft: Math.round(clampNumber(reminder.pillsLeft, 0, 5000, 30)),
      takenToday: false,
      active: Boolean(reminder.active),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function toggleReminderTakenDoc(
  reminderId: string,
  currentTaken: boolean,
  currentPillsLeft: number
): Promise<void> {
  const path = `medicine_reminders/${reminderId}`;
  try {
    const nextTaken = !currentTaken;
    const nextPills = nextTaken
      ? Math.max(0, currentPillsLeft - 1)
      : currentPillsLeft + 1;
    await updateDoc(doc(db, 'medicine_reminders', reminderId), {
      takenToday: nextTaken,
      pillsLeft: Math.round(clampNumber(nextPills, 0, 5000, currentPillsLeft)),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteMedicineReminderDoc(reminderId: string): Promise<void> {
  const path = `medicine_reminders/${reminderId}`;
  try {
    await deleteDoc(doc(db, 'medicine_reminders', reminderId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// MEDICINE SCAN HISTORY (/medicine_scan_history)
// ============================================================================
export function subscribeScanHistory(
  uid: string,
  onData: (scans: MedicineScanResult[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'medicine_scan_history';
  const q = query(
    collection(db, path),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items: MedicineScanResult[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId,
          timestamp: data.timestamp || toIsoString(data.createdAt),
          name: data.name,
          composition: data.composition || '',
          uses: Array.isArray(data.uses) ? data.uses : [],
          benefits: Array.isArray(data.benefits) ? data.benefits : [],
          sideEffects: Array.isArray(data.sideEffects) ? data.sideEffects : [],
          dosage: data.dosage || '',
          warnings: Array.isArray(data.warnings) ? data.warnings : [],
          storage: data.storage || '',
          alternativeMedicines: Array.isArray(data.alternativeMedicines) ? data.alternativeMedicines : [],
          priceRange: data.priceRange || '',
          disclaimer: data.disclaimer || '',
          saved: Boolean(data.saved),
          createdAt: toIsoString(data.createdAt),
          updatedAt: toIsoString(data.updatedAt),
        };
      });
      onData(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function createScanHistoryDoc(
  uid: string,
  scan: Omit<MedicineScanResult, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const path = 'medicine_scan_history';
  try {
    const ref = await addDoc(collection(db, path), {
      userId: uid,
      timestamp: sanitizeString(scan.timestamp || new Date().toISOString(), 64),
      name: sanitizeString(scan.name, 160) || 'Identified Medicine',
      composition: sanitizeString(scan.composition, 500),
      uses: sanitizeStringList(scan.uses, 20, 200),
      benefits: sanitizeStringList(scan.benefits, 20, 200),
      sideEffects: sanitizeStringList(scan.sideEffects, 20, 200),
      dosage: sanitizeString(scan.dosage, 500),
      warnings: sanitizeStringList(scan.warnings, 20, 250),
      storage: sanitizeString(scan.storage, 300),
      alternativeMedicines: Array.isArray(scan.alternativeMedicines)
        ? scan.alternativeMedicines.slice(0, 10).map((a) => ({
            name: sanitizeString(a.name, 120),
            approxPrice: sanitizeString(a.approxPrice, 60),
            manufacturer: sanitizeString(a.manufacturer, 120),
          }))
        : [],
      priceRange: sanitizeString(scan.priceRange, 100),
      disclaimer: sanitizeString(scan.disclaimer, 500),
      saved: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteScanHistoryDoc(scanId: string): Promise<void> {
  const path = `medicine_scan_history/${scanId}`;
  try {
    await deleteDoc(doc(db, 'medicine_scan_history', scanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// CHAT HISTORY (/chat_history)
// ============================================================================
export function subscribeChatHistory(
  uid: string,
  onData: (messages: ChatMessage[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'chat_history';
  const q = query(
    collection(db, path),
    where('userId', '==', uid),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items: ChatMessage[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId,
          sender: data.sender,
          text: data.text,
          category: data.category || 'general',
          timestamp: data.timestamp || toIsoString(data.createdAt),
          createdAt: toIsoString(data.createdAt),
          updatedAt: toIsoString(data.updatedAt),
        };
      });
      onData(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function createChatMessageDoc(
  uid: string,
  msg: Omit<ChatMessage, 'id' | 'timestamp' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const path = 'chat_history';
  try {
    const ref = await addDoc(collection(db, path), {
      userId: uid,
      sender: msg.sender,
      text: sanitizeString(msg.text, 8000),
      category: msg.category || 'general',
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function clearChatHistoryDocs(uid: string): Promise<void> {
  const path = 'chat_history';
  try {
    const q = query(collection(db, path), where('userId', '==', uid));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// EMERGENCY CONTACTS (/emergency_contacts)
// ============================================================================
export function subscribeEmergencyContacts(
  uid: string,
  onData: (contacts: EmergencyContact[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'emergency_contacts';
  const q = query(
    collection(db, path),
    where('userId', '==', uid),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items: EmergencyContact[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId,
          name: data.name,
          relation: data.relation,
          phone: data.phone,
          isPrimary: Boolean(data.isPrimary),
          createdAt: toIsoString(data.createdAt),
          updatedAt: toIsoString(data.updatedAt),
        };
      });
      onData(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function createEmergencyContactDoc(
  uid: string,
  contact: Omit<EmergencyContact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const path = 'emergency_contacts';
  try {
    const ref = await addDoc(collection(db, path), {
      userId: uid,
      name: sanitizeString(contact.name, 120),
      relation: sanitizeString(contact.relation, 80),
      phone: sanitizeString(contact.phone, 32),
      isPrimary: Boolean(contact.isPrimary),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteEmergencyContactDoc(contactId: string): Promise<void> {
  const path = `emergency_contacts/${contactId}`;
  try {
    await deleteDoc(doc(db, 'emergency_contacts', contactId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// NOTIFICATIONS (/notifications)
// ============================================================================
export function subscribeNotifications(
  uid: string,
  onData: (notifications: NotificationItem[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'notifications';
  const q = query(
    collection(db, path),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items: NotificationItem[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          read: Boolean(data.read),
          appointmentId: data.appointmentId,
          createdAt: toIsoString(data.createdAt),
          updatedAt: toIsoString(data.updatedAt),
        };
      });
      onData(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function createNotificationDoc(
  uid: string,
  notification: {
    title: string;
    message: string;
    type: 'reminder' | 'appointment' | 'sos' | 'system';
    appointmentId?: string;
  }
): Promise<string> {
  const path = 'notifications';
  try {
    const payload: Record<string, unknown> = {
      userId: uid,
      title: sanitizeString(notification.title, 120),
      message: sanitizeString(notification.message, 500),
      type: notification.type,
      read: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (notification.appointmentId && isValidDocumentId(notification.appointmentId)) {
      payload.appointmentId = notification.appointmentId;
    }
    const ref = await addDoc(collection(db, path), payload);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function markNotificationReadDoc(notificationId: string): Promise<void> {
  const path = `notifications/${notificationId}`;
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ============================================================================
// EMERGENCY EVENTS (/emergency_events)
// ============================================================================
export function subscribeEmergencyEvents(
  uid: string,
  isAdmin: boolean,
  onData: (events: EmergencyEvent[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'emergency_events';
  const q = isAdmin
    ? query(collection(db, path), orderBy('createdAt', 'desc'))
    : query(collection(db, path), where('userId', '==', uid), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: EmergencyEvent[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId,
          patientName: data.patientName || '',
          sosId: data.sosId,
          userLocation: data.userLocation,
          status: data.status,
          ambulanceEtaMinutes: data.ambulanceEtaMinutes,
          dispatchedUnit: data.dispatchedUnit,
          notifiedContactsCount: data.notifiedContactsCount,
          note: data.note || '',
          createdAt: toIsoString(data.createdAt),
          updatedAt: toIsoString(data.updatedAt),
        };
      });
      onData(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function createEmergencyEventDoc(
  uid: string,
  event: Omit<EmergencyEvent, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const path = 'emergency_events';
  try {
    const ref = await addDoc(collection(db, path), {
      userId: uid,
      patientName: sanitizeString(event.patientName || '', 120),
      sosId: sanitizeString(event.sosId, 128),
      userLocation: sanitizeString(event.userLocation, 240) || 'Current GPS Pin',
      status: 'DISPATCHED',
      ambulanceEtaMinutes: Math.round(clampNumber(event.ambulanceEtaMinutes, 0, 240, 6)),
      dispatchedUnit: sanitizeString(event.dispatchedUnit, 120),
      notifiedContactsCount: Math.round(clampNumber(event.notifiedContactsCount, 0, 50, 0)),
      note: sanitizeString(event.note || '', 500),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
