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
  Unsubscribe,
  limit
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreError';
import {
  UserProfile,
  VitalLog,
  Doctor,
  Appointment,
  DoctorSlotLock,
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
import {
  sanitizeString,
  sanitizeStringList,
  clampNumber,
  isValidDocumentId,
  buildSlotLockId,
  getTodayDateString
} from './validation';

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

function mapDoctorSnap(id: string, data: Record<string, any>): Doctor {
  const verified = Boolean(data.verified);
  const isDemo = Boolean(data.isDemo);
  const verificationStatus: 'demo' | 'pending' | 'verified' =
    data.verificationStatus === 'demo' || data.verificationStatus === 'verified' || data.verificationStatus === 'pending'
      ? data.verificationStatus
      : isDemo
      ? 'demo'
      : verified
      ? 'verified'
      : 'pending';

  return {
    id,
    name: data.name || 'Specialist',
    title: data.title || 'Medical Consultant',
    specialty: data.specialty || 'General Medicine',
    experienceYears: data.experienceYears ?? 5,
    rating: data.rating ?? 4.8,
    reviewCount: data.reviewCount ?? 0,
    feeUsd: data.feeUsd ?? 100,
    photo: data.photo || '',
    address: data.address || '',
    lat: data.lat ?? 19.0760,
    lng: data.lng ?? 72.8777,
    hospital: data.hospital || 'Clinic',
    availableSlots: Array.isArray(data.availableSlots)
      ? data.availableSlots
      : ['09:00 AM', '11:00 AM', '02:00 PM'],
    bio: data.bio || '',
    languages: Array.isArray(data.languages) ? data.languages : ['English'],
    verified,
    isDemo,
    verificationStatus,
    licenseNumber: data.licenseNumber || '',
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

// ============================================================================
// ADMIN CHECK
// ============================================================================
export async function checkIsUserAdmin(firebaseUser: FirebaseUser): Promise<boolean> {
  try {
    const tokenResult = await firebaseUser.getIdTokenResult();
    if (tokenResult.claims?.admin === true) {
      return true;
    }
    if (
      (firebaseUser.email || '').trim().toLowerCase() === 'patekarshubham07@gmail.com' &&
      firebaseUser.emailVerified
    ) {
      return true;
    }
    const adminSnap = await getDoc(doc(db, 'admins', firebaseUser.uid));
    return adminSnap.exists();
  } catch {
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

export function subscribeAllProfilesForAdmin(
  onData: (profiles: UserProfile[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'profiles';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const list: UserProfile[] = snapshot.docs.map((snap) => {
        const data = snap.data();
        return {
          id: snap.id,
          userId: data.userId || snap.id,
          name: data.name || 'Patient',
          email: data.email || '',
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
          emergencyContacts: [],
          isDonor: Boolean(data.isDonor),
          role: data.role || 'patient',
          settings: { ...defaultSettings, ...(data.settings || {}) },
          createdAt: toIsoString(data.createdAt),
          updatedAt: toIsoString(data.updatedAt),
        };
      });
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onData(list);
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

export async function setUserRoleDocs(
  targetUid: string,
  role: 'patient' | 'admin' | 'doctor',
  targetEmail?: string
): Promise<void> {
  const path = `profiles/${targetUid}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'profiles', targetUid), {
      role,
      updatedAt: serverTimestamp(),
    });
    const adminRef = doc(db, 'admins', targetUid);
    if (role === 'admin') {
      batch.set(adminRef, {
        userId: targetUid,
        email: sanitizeString(targetEmail || 'admin@healthcare.app', 254),
        createdAt: serverTimestamp(),
      });
    } else {
      batch.delete(adminRef);
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
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

export async function updateHealthRecordDoc(
  recordId: string,
  updates: Partial<Omit<VitalLog, 'id' | 'userId' | 'timestamp' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const path = `health_records/${recordId}`;
  try {
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (updates.heartRate !== undefined) payload.heartRate = clampNumber(updates.heartRate, 20, 260, 72);
    if (updates.bloodPressureSys !== undefined) {
      payload.bloodPressureSys = clampNumber(updates.bloodPressureSys, 40, 300, 120);
    }
    if (updates.bloodPressureDia !== undefined) {
      payload.bloodPressureDia = clampNumber(updates.bloodPressureDia, 20, 200, 80);
    }
    if (updates.bloodSugar !== undefined) payload.bloodSugar = clampNumber(updates.bloodSugar, 20, 800, 95);
    if (updates.bmi !== undefined) payload.bmi = clampNumber(updates.bmi, 5, 100, 22);
    if (updates.weightKg !== undefined) payload.weightKg = clampNumber(updates.weightKg, 1, 500, 70);
    if (updates.temperatureC !== undefined) payload.temperatureC = clampNumber(updates.temperatureC, 30, 45, 36.6);
    if (updates.spO2 !== undefined) payload.spO2 = clampNumber(updates.spO2, 50, 100, 98);
    if (updates.waterIntakeMl !== undefined) {
      payload.waterIntakeMl = clampNumber(updates.waterIntakeMl, 0, 20000, 0);
    }
    if (updates.sleepHours !== undefined) payload.sleepHours = clampNumber(updates.sleepHours, 0, 24, 7.5);
    if (updates.mood !== undefined) payload.mood = updates.mood;

    await updateDoc(doc(db, 'health_records', recordId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteHealthRecordDoc(recordId: string): Promise<void> {
  const path = `health_records/${recordId}`;
  try {
    await deleteDoc(doc(db, 'health_records', recordId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
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
  const verifiedMap = new Map<string, Doctor>();
  const demoMap = new Map<string, Doctor>();

  const emitMerged = () => {
    const merged = new Map<string, Doctor>();
    demoMap.forEach((docItem, id) => merged.set(id, docItem));
    verifiedMap.forEach((docItem, id) => merged.set(id, docItem));
    const sorted = Array.from(merged.values()).sort((a, b) => {
      if ((a.verificationStatus === 'verified') !== (b.verificationStatus === 'verified')) {
        return a.verificationStatus === 'verified' ? -1 : 1;
      }
      return b.rating - a.rating;
    });
    onData(sorted);
  };

  const unsubVerified = onSnapshot(
    query(collection(db, path), where('verified', '==', true)),
    (snapshot) => {
      verifiedMap.clear();
      snapshot.docs.forEach((d) => verifiedMap.set(d.id, mapDoctorSnap(d.id, d.data())));
      emitMerged();
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );

  const unsubDemo = onSnapshot(
    query(collection(db, path), where('isDemo', '==', true)),
    (snapshot) => {
      demoMap.clear();
      snapshot.docs.forEach((d) => demoMap.set(d.id, mapDoctorSnap(d.id, d.data())));
      emitMerged();
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );

  return () => {
    unsubVerified();
    unsubDemo();
  };
}

export function subscribeAllDoctorsForAdmin(
  onData: (doctors: Doctor[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'doctors';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => mapDoctorSnap(d.id, d.data()))
        .sort((a, b) => a.name.localeCompare(b.name));
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
    const isDemo = Boolean(doctor.isDemo);
    const verified = isDemo ? false : Boolean(doctor.verified ?? true);
    const verificationStatus =
      doctor.verificationStatus || (isDemo ? 'demo' : verified ? 'verified' : 'pending');

    const payload = {
      name: sanitizeString(doctor.name, 120),
      title: sanitizeString(doctor.title, 120),
      specialty: sanitizeString(doctor.specialty, 80),
      experienceYears: Math.round(clampNumber(doctor.experienceYears, 0, 80, 5)),
      rating: clampNumber(doctor.rating, 0, 5, 4.8),
      reviewCount: Math.round(clampNumber(doctor.reviewCount, 0, 100000, 0)),
      feeUsd: clampNumber(doctor.feeUsd, 0, 50000, 800),
      photo: sanitizeString(doctor.photo, 500),
      address: sanitizeString(doctor.address, 240),
      lat: clampNumber(doctor.lat, -90, 90, 19.0760),
      lng: clampNumber(doctor.lng, -180, 180, 72.8777),
      hospital: sanitizeString(doctor.hospital, 160),
      availableSlots: sanitizeStringList(doctor.availableSlots, 24, 32),
      bio: sanitizeString(doctor.bio, 1000),
      languages: sanitizeStringList(doctor.languages, 15, 40),
      verified,
      isDemo,
      verificationStatus,
      licenseNumber: sanitizeString(doctor.licenseNumber || '', 80),
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

export async function updateDoctorDoc(
  doctorId: string,
  updates: Partial<Omit<Doctor, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const path = `doctors/${doctorId}`;
  try {
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (updates.name !== undefined) payload.name = sanitizeString(updates.name, 120);
    if (updates.title !== undefined) payload.title = sanitizeString(updates.title, 120);
    if (updates.specialty !== undefined) payload.specialty = sanitizeString(updates.specialty, 80);
    if (updates.experienceYears !== undefined) {
      payload.experienceYears = Math.round(clampNumber(updates.experienceYears, 0, 80, 5));
    }
    if (updates.rating !== undefined) payload.rating = clampNumber(updates.rating, 0, 5, 4.8);
    if (updates.reviewCount !== undefined) {
      payload.reviewCount = Math.round(clampNumber(updates.reviewCount, 0, 100000, 0));
    }
    if (updates.feeUsd !== undefined) payload.feeUsd = clampNumber(updates.feeUsd, 0, 50000, 800);
    if (updates.photo !== undefined) payload.photo = sanitizeString(updates.photo, 500);
    if (updates.address !== undefined) payload.address = sanitizeString(updates.address, 240);
    if (updates.hospital !== undefined) payload.hospital = sanitizeString(updates.hospital, 160);
    if (updates.availableSlots !== undefined) {
      payload.availableSlots = sanitizeStringList(updates.availableSlots, 24, 32);
    }
    if (updates.bio !== undefined) payload.bio = sanitizeString(updates.bio, 1000);
    if (updates.languages !== undefined) {
      payload.languages = sanitizeStringList(updates.languages, 15, 40);
    }
    if (updates.verified !== undefined) payload.verified = Boolean(updates.verified);
    if (updates.isDemo !== undefined) payload.isDemo = Boolean(updates.isDemo);
    if (updates.verificationStatus !== undefined) payload.verificationStatus = updates.verificationStatus;
    if (updates.licenseNumber !== undefined) payload.licenseNumber = sanitizeString(updates.licenseNumber, 80);

    await updateDoc(doc(db, 'doctors', doctorId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function verifyDoctorDoc(doctorId: string, verified = true): Promise<void> {
  await updateDoctorDoc(doctorId, {
    verified,
    isDemo: false,
    verificationStatus: verified ? 'verified' : 'pending',
  });
}

export async function deleteDoctorDoc(doctorId: string): Promise<void> {
  const path = `doctors/${doctorId}`;
  try {
    await deleteDoc(doc(db, 'doctors', doctorId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// DOCTOR SLOT LOCKS & APPOINTMENTS (/doctor_slots & /appointments)
// ============================================================================
export function subscribeActiveSlotLocks(
  onData: (locks: DoctorSlotLock[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'doctor_slots';
  const q = query(collection(db, path), where('active', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: DoctorSlotLock[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          doctorId: data.doctorId,
          date: data.date,
          timeSlot: data.timeSlot,
          bookedByUid: data.bookedByUid,
          appointmentId: data.appointmentId,
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

export function subscribeAllAppointmentsForAdmin(
  onData: (appointments: Appointment[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'appointments';
  return onSnapshot(
    query(collection(db, path), orderBy('createdAt', 'desc')),
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
    const cleanDate = sanitizeString(date, 32);
    const cleanSlot = sanitizeString(timeSlot, 32);
    const slotId = buildSlotLockId(doctor.id, cleanDate, cleanSlot);
    const slotRef = doc(db, 'doctor_slots', slotId);

    // 1. Check doctor slot lock
    const existingSlot = await getDoc(slotRef);
    if (existingSlot.exists() && existingSlot.data()?.active) {
      throw new Error('This doctor slot is already reserved. Please select another time slot.');
    }

    // 2. Check patient's own upcoming appointments for time conflicts on the same date & time
    const userApptsQuery = query(
      collection(db, path),
      where('userId', '==', uid),
      where('status', '==', 'Upcoming'),
      where('date', '==', cleanDate)
    );
    const userApptsSnap = await getDocs(userApptsQuery);
    const hasPatientOverlap = userApptsSnap.docs.some(
      (d) => d.data()?.timeSlot === cleanSlot
    );
    if (hasPatientOverlap) {
      throw new Error(`You already have an upcoming appointment at ${cleanSlot} on ${cleanDate}.`);
    }

    // 3. Atomic batch create for appointment + slot lock
    const apptRef = doc(collection(db, path));
    const batch = writeBatch(db);
    batch.set(apptRef, {
      userId: uid,
      doctorId: doctor.id,
      doctorName: sanitizeString(doctor.name, 120),
      doctorSpecialty: sanitizeString(doctor.specialty, 80),
      doctorPhoto: sanitizeString(doctor.photo, 500),
      date: cleanDate,
      timeSlot: cleanSlot,
      type,
      status: 'Upcoming',
      symptoms: sanitizeString(symptoms || '', 1000),
      meetingLink: type === 'Video Consultation' ? `Telehealth Ref #${apptRef.id.slice(0, 8).toUpperCase()}` : '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(slotRef, {
      doctorId: doctor.id,
      date: cleanDate,
      timeSlot: cleanSlot,
      bookedByUid: uid,
      appointmentId: apptRef.id,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
    return apptRef.id;
  } catch (error) {
    if (error instanceof Error && !('code' in error)) {
      throw error;
    }
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateAppointmentStatusDoc(
  appointmentId: string,
  status: 'Upcoming' | 'Completed' | 'Cancelled',
  slotReleaseInfo?: { doctorId: string; date: string; timeSlot: string }
): Promise<void> {
  const path = `appointments/${appointmentId}`;
  try {
    await updateDoc(doc(db, 'appointments', appointmentId), {
      status,
      updatedAt: serverTimestamp(),
    });
    if ((status === 'Cancelled' || status === 'Completed') && slotReleaseInfo) {
      const slotId = buildSlotLockId(
        slotReleaseInfo.doctorId,
        slotReleaseInfo.date,
        slotReleaseInfo.timeSlot
      );
      try {
        await deleteDoc(doc(db, 'doctor_slots', slotId));
      } catch {
        // Legacy appointment or already released lock
      }
    }
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
      const today = getTodayDateString();
      const items: MedicineReminder[] = snapshot.docs.map((d) => {
        const data = d.data();
        const completedDates = Array.isArray(data.completedDates) ? data.completedDates : [];
        const missedDates = Array.isArray(data.missedDates) ? data.missedDates : [];
        const lastTakenDate = typeof data.lastTakenDate === 'string' ? data.lastTakenDate : '';
        // Compute day-accurate takenToday: if lastTakenDate is present and isn't today, reset visually
        const takenToday = lastTakenDate
          ? lastTakenDate === today && Boolean(data.takenToday)
          : Boolean(data.takenToday);

        return {
          id: d.id,
          userId: data.userId,
          name: data.name,
          dosage: data.dosage,
          frequency: data.frequency,
          timeSlots: Array.isArray(data.timeSlots) ? data.timeSlots : [],
          instructions: data.instructions,
          pillsLeft: data.pillsLeft,
          takenToday,
          lastTakenDate,
          completedDates,
          missedDates,
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
      lastTakenDate: '',
      completedDates: [] as string[],
      missedDates: [] as string[],
      active: Boolean(reminder.active),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateMedicineReminderDoc(
  reminderId: string,
  updates: Partial<Omit<MedicineReminder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const path = `medicine_reminders/${reminderId}`;
  try {
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (updates.name !== undefined) payload.name = sanitizeString(updates.name, 160);
    if (updates.dosage !== undefined) payload.dosage = sanitizeString(updates.dosage, 80);
    if (updates.frequency !== undefined) payload.frequency = updates.frequency;
    if (updates.timeSlots !== undefined) payload.timeSlots = sanitizeStringList(updates.timeSlots, 12, 32);
    if (updates.instructions !== undefined) payload.instructions = updates.instructions;
    if (updates.pillsLeft !== undefined) {
      payload.pillsLeft = Math.round(clampNumber(updates.pillsLeft, 0, 5000, 30));
    }
    if (updates.active !== undefined) payload.active = Boolean(updates.active);

    await updateDoc(doc(db, 'medicine_reminders', reminderId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleReminderTakenDoc(reminder: MedicineReminder): Promise<void> {
  const path = `medicine_reminders/${reminder.id}`;
  try {
    const today = getTodayDateString();
    const nextTaken = !reminder.takenToday;
    const nextPills = nextTaken
      ? Math.max(0, reminder.pillsLeft - 1)
      : reminder.pillsLeft < 5000 && reminder.takenToday
      ? reminder.pillsLeft + 1
      : reminder.pillsLeft;

    const existingCompleted = Array.isArray(reminder.completedDates) ? reminder.completedDates : [];
    const existingMissed = Array.isArray(reminder.missedDates) ? reminder.missedDates : [];

    const nextCompleted = nextTaken
      ? Array.from(new Set([today, ...existingCompleted])).slice(0, 90)
      : existingCompleted.filter((d) => d !== today);

    const nextMissed = nextTaken
      ? existingMissed.filter((d) => d !== today)
      : existingMissed;

    await updateDoc(doc(db, 'medicine_reminders', reminder.id), {
      takenToday: nextTaken,
      lastTakenDate: nextTaken ? today : '',
      completedDates: nextCompleted,
      missedDates: nextMissed,
      pillsLeft: Math.round(clampNumber(nextPills, 0, 5000, reminder.pillsLeft)),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function markReminderMissedDoc(reminder: MedicineReminder): Promise<void> {
  const path = `medicine_reminders/${reminder.id}`;
  try {
    const today = getTodayDateString();
    const existingCompleted = Array.isArray(reminder.completedDates) ? reminder.completedDates : [];
    const existingMissed = Array.isArray(reminder.missedDates) ? reminder.missedDates : [];

    const nextMissed = Array.from(new Set([today, ...existingMissed])).slice(0, 90);
    const nextCompleted = existingCompleted.filter((d) => d !== today);

    await updateDoc(doc(db, 'medicine_reminders', reminder.id), {
      takenToday: false,
      lastTakenDate: '',
      completedDates: nextCompleted,
      missedDates: nextMissed,
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
          expiryDate: data.expiryDate || 'Not visible / verify on physical packaging',
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
      expiryDate: sanitizeString(
        scan.expiryDate || 'Not legible / not visible — inspect physical packaging',
        160
      ),
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

export async function updateEmergencyContactDoc(
  contactId: string,
  updates: Partial<Omit<EmergencyContact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const path = `emergency_contacts/${contactId}`;
  try {
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (updates.name !== undefined) payload.name = sanitizeString(updates.name, 120);
    if (updates.relation !== undefined) payload.relation = sanitizeString(updates.relation, 80);
    if (updates.phone !== undefined) payload.phone = sanitizeString(updates.phone, 32);
    if (updates.isPrimary !== undefined) payload.isPrimary = Boolean(updates.isPrimary);

    await updateDoc(doc(db, 'emergency_contacts', contactId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
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
        const rawStatus = String(data.status || 'REQUESTED');
        const status: EmergencyStatus = ['REQUESTED', 'CONTACTS_NOTIFIED', 'ACKNOWLEDGED', 'RESOLVED', 'CANCELLED'].includes(rawStatus)
          ? (rawStatus as EmergencyStatus)
          : 'REQUESTED';

        return {
          id: d.id,
          userId: data.userId,
          patientName: data.patientName || '',
          sosId: data.sosId,
          userLocation: data.userLocation || 'Location unavailable',
          gpsAvailable: Boolean(data.gpsAvailable),
          coordinates: data.coordinates,
          status,
          responseStatus:
            data.responseStatus ||
            'SOS logged in patient record. Call local emergency services directly if urgent.',
          notificationAttempts: Array.isArray(data.notificationAttempts) ? data.notificationAttempts : [],
          notifiedContactsCount: data.notifiedContactsCount ?? 0,
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
    const payload: Record<string, unknown> = {
      userId: uid,
      patientName: sanitizeString(event.patientName || '', 120),
      sosId: sanitizeString(event.sosId, 128),
      userLocation: sanitizeString(event.userLocation, 240) || 'Location unavailable — enter location manually',
      gpsAvailable: Boolean(event.gpsAvailable),
      status: event.status === 'CONTACTS_NOTIFIED' ? 'CONTACTS_NOTIFIED' : 'REQUESTED',
      responseStatus: sanitizeString(
        event.responseStatus ||
          'SOS logged. HealthCare+ does not auto-dispatch ambulances — contact emergency services (112 / 108 / 911) directly.',
        240
      ),
      notificationAttempts: sanitizeStringList(event.notificationAttempts || [], 20, 240),
      notifiedContactsCount: Math.round(clampNumber(event.notifiedContactsCount, 0, 50, 0)),
      note: sanitizeString(event.note || '', 500),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (
      event.coordinates &&
      typeof event.coordinates.lat === 'number' &&
      typeof event.coordinates.lng === 'number' &&
      Number.isFinite(event.coordinates.lat) &&
      Number.isFinite(event.coordinates.lng)
    ) {
      payload.coordinates = {
        lat: Number(event.coordinates.lat.toFixed(6)),
        lng: Number(event.coordinates.lng.toFixed(6)),
      };
    }

    const ref = await addDoc(collection(db, path), payload);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateEmergencyEventStatusDoc(
  eventId: string,
  status: EmergencyStatus,
  responseStatus: string
): Promise<void> {
  const path = `emergency_events/${eventId}`;
  try {
    await updateDoc(doc(db, 'emergency_events', eventId), {
      status,
      responseStatus: sanitizeString(responseStatus, 240),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ============================================================================
// ADMIN AUDIT LOGS (/audit_logs)
// ============================================================================
export async function createAuditLogDoc(entry: {
  actorUid: string;
  actorEmail: string;
  action: string;
  targetType: AuditLogEntry['targetType'];
  targetId?: string;
  details: string;
}): Promise<void> {
  const path = 'audit_logs';
  try {
    const payload: Record<string, unknown> = {
      actorUid: entry.actorUid,
      actorEmail: sanitizeString(entry.actorEmail, 254),
      action: sanitizeString(entry.action, 120),
      targetType: entry.targetType,
      details: sanitizeString(entry.details, 1000),
      createdAt: serverTimestamp(),
    };
    if (entry.targetId) {
      payload.targetId = sanitizeString(entry.targetId, 128);
    }
    await addDoc(collection(db, path), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeAuditLogs(
  onData: (logs: AuditLogEntry[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'audit_logs';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: AuditLogEntry[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          actorUid: data.actorUid || '',
          actorEmail: data.actorEmail || '',
          action: data.action || '',
          targetType: data.targetType || 'system',
          targetId: data.targetId || '',
          details: data.details || '',
          createdAt: toIsoString(data.createdAt),
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
