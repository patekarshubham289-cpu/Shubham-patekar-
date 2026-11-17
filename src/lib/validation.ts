// Validation and sanitization helpers synchronized with firebase-blueprint.json & firestore.rules

const ID_REGEX = /^[a-zA-Z0-9_\-]+$/;
const PHONE_REGEX = /^[+\d][\d\s\-().]{5,25}$/;
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

export function sanitizeString(val: unknown, maxLength: number): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLength);
}

export function sanitizeStringList(val: unknown, maxItems: number, maxItemLength: number): string[] {
  if (!Array.isArray(val)) return [];
  return val
    .map((item) => sanitizeString(String(item ?? ''), maxItemLength))
    .filter((item) => item.length > 0)
    .slice(0, maxItems);
}

export function isValidDocumentId(id: string): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && ID_REGEX.test(id);
}

export function clampNumber(val: unknown, min: number, max: number, fallback: number): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one uppercase letter.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must include at least one lowercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must include at least one number.';
  }
  return null;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePhone(phone: string, required = false): boolean {
  const trimmed = phone.trim();
  if (!trimmed) return !required;
  return PHONE_REGEX.test(trimmed);
}

export function isValidBloodGroup(bg: string): boolean {
  return BLOOD_GROUPS.includes(bg.trim());
}

export function buildSlotLockId(doctorId: string, date: string, timeSlot: string): string {
  const cleanDoctor = doctorId.replace(/[^a-zA-Z0-9_\-]/g, '');
  const cleanDate = date.replace(/[^0-9\-]/g, '');
  const cleanSlot = timeSlot.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `${cleanDoctor}_${cleanDate}_${cleanSlot}`.slice(0, 128);
}

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
