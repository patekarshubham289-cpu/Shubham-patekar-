import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleGenAI } from '@google/genai';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load project config from firebase-applet-config.json if present
let appletConfig: { projectId?: string; firestoreDatabaseId?: string } = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    appletConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (err) {
  console.warn('Could not read firebase-applet-config.json:', err);
}

const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || appletConfig.projectId || '';
const FIRESTORE_DATABASE_ID =
  process.env.FIREBASE_FIRESTORE_DATABASE_ID || appletConfig.firestoreDatabaseId || '';

let hasServiceAccount = false;

function initFirebaseAdmin() {
  if (getApps().length > 0) return;

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || FIREBASE_PROJECT_ID,
      });
      hasServiceAccount = true;
    } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && FIREBASE_PROJECT_ID) {
      initializeApp({
        credential: cert({
          projectId: FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        projectId: FIREBASE_PROJECT_ID,
      });
      hasServiceAccount = true;
    } else if (FIREBASE_PROJECT_ID) {
      // Allows Firebase ID token verification via Google public JWKS keys without private service account JSON
      initializeApp({
        projectId: FIREBASE_PROJECT_ID,
      });
    } else {
      console.warn('Firebase Admin SDK: No project ID configured.');
    }
  } catch (err) {
    console.error('Failed to initialize Firebase Admin SDK:', err);
  }
}

initFirebaseAdmin();

function getAdminDb() {
  if (!hasServiceAccount || getApps().length === 0) return null;
  const appInstance = getApp();
  return FIRESTORE_DATABASE_ID
    ? getAdminFirestore(appInstance, FIRESTORE_DATABASE_ID)
    : getAdminFirestore(appInstance);
}

export interface AuthenticatedRequest extends Request {
  authUser?: {
    uid: string;
    email: string;
    emailVerified: boolean;
    isAdmin: boolean;
  };
}

async function resolveIsAdmin(decoded: DecodedIdToken): Promise<boolean> {
  if (decoded.admin === true) return true;
  if (
    (decoded.email || '').trim().toLowerCase() === 'patekarshubham07@gmail.com' &&
    decoded.email_verified === true
  ) {
    return true;
  }
  const adminDb = getAdminDb();
  if (adminDb && decoded.email_verified) {
    try {
      const snap = await adminDb.doc(`admins/${decoded.uid}`).get();
      if (snap.exists) return true;
    } catch {
      // Ignore if Firestore admin lookup unavailable
    }
  }
  return false;
}

async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (getApps().length === 0) {
    return res.status(503).json({
      error: 'Authentication service is not configured on the server.',
    });
  }

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Missing Bearer authentication token.',
    });
  }

  const idToken = authHeader.slice(7).trim();
  if (!idToken) {
    return res.status(401).json({
      error: 'Unauthorized: Empty authentication token.',
    });
  }

  try {
    const decoded = await getAuth(getApp()).verifyIdToken(idToken);
    const isAdmin = await resolveIsAdmin(decoded);
    req.authUser = {
      uid: decoded.uid,
      email: decoded.email || '',
      emailVerified: Boolean(decoded.email_verified),
      isAdmin,
    };
    return next();
  } catch (err: any) {
    console.error('Firebase token verification failed:', err?.code || err?.message);
    return res.status(401).json({
      error: 'Unauthorized: Invalid or expired Firebase ID token.',
    });
  }
}

function requireVerifiedEmail(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.authUser?.emailVerified) {
    return res.status(403).json({
      error: 'Email verification required before accessing clinical endpoints.',
    });
  }
  return next();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.authUser?.isAdmin) {
    return res.status(403).json({
      error: 'Forbidden: Verified administrator privileges required.',
    });
  }
  return next();
}

// =========================================================================
// IN-MEMORY RATE LIMITER (Sliding Window per Authenticated UID or IP)
// =========================================================================
interface RateBucket {
  timestamps: number[];
}

const rateBuckets = new globalThis.Map<string, RateBucket>();

function createRateLimiter(bucketPrefix: string, maxRequests: number, windowMs = 60_000) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const actor = req.authUser?.uid || req.ip || 'anonymous';
    const key = `${bucketPrefix}:${actor}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key) || { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - bucket.timestamps.length)));

    if (bucket.timestamps.length >= maxRequests) {
      const oldest = bucket.timestamps[0] || now;
      const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error: `Rate limit exceeded. Please wait ${retryAfterSec}s before retrying.`,
      });
    }

    bucket.timestamps.push(now);
    rateBuckets.set(key, bucket);
    return next();
  };
}

function stripJsonFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Security & Headers (iFrame-compatible)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(self), microphone=(self)');
  next();
});

// Helper for Gemini AI Client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// ==========================================
// API ROUTES
// ==========================================

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  const mapsKey =
    process.env.GOOGLE_MAPS_PLATFORM_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    '';
  res.json({
    status: 'ok',
    app: 'HealthCare+',
    timestamp: new Date().toISOString(),
    firebaseProjectId: FIREBASE_PROJECT_ID || null,
    firebaseAdminInitialized: getApps().length > 0,
    firebaseServiceAccountConfigured: hasServiceAccount,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    mapsConfigured: Boolean(mapsKey && mapsKey !== 'YOUR_API_KEY'),
  });
});

// Verified Identity Check
app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    user: req.authUser,
  });
});

// Admin Platform Overview (Verified Admins Only)
app.get(
  '/api/admin/overview',
  requireAuth,
  requireVerifiedEmail,
  requireAdmin,
  createRateLimiter('admin-overview', 40),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const adminDb = getAdminDb();
      if (!adminDb) {
        return res.json({
          success: true,
          serviceAccountAvailable: false,
          stats: null,
        });
      }

      const [profilesSnap, doctorsSnap, appointmentsSnap, eventsSnap] = await Promise.all([
        adminDb.collection('profiles').count().get(),
        adminDb.collection('doctors').count().get(),
        adminDb.collection('appointments').count().get(),
        adminDb.collection('emergency_events').count().get(),
      ]);

      return res.json({
        success: true,
        serviceAccountAvailable: true,
        stats: {
          totalPatients: profilesSnap.data().count,
          totalDoctors: doctorsSnap.data().count,
          totalAppointments: appointmentsSnap.data().count,
          totalEmergencyEvents: eventsSnap.data().count,
        },
      });
    } catch (err) {
      console.error('Admin overview error:', err);
      return res.status(500).json({ error: 'Failed to load admin overview.' });
    }
  }
);

// Admin Firebase Auth User List (Requires Service Account)
app.get(
  '/api/admin/users',
  requireAuth,
  requireVerifiedEmail,
  requireAdmin,
  createRateLimiter('admin-users', 30),
  async (_req: AuthenticatedRequest, res: Response) => {
    if (!hasServiceAccount || getApps().length === 0) {
      return res.json({
        success: true,
        serviceAccountAvailable: false,
        users: [],
      });
    }

    try {
      const listResult = await getAuth(getApp()).listUsers(100);
      const users = listResult.users.map((u) => ({
        uid: u.uid,
        email: u.email || '',
        displayName: u.displayName || '',
        emailVerified: u.emailVerified,
        disabled: u.disabled,
        customClaims: u.customClaims || {},
        lastSignInTime: u.metadata.lastSignInTime || null,
        creationTime: u.metadata.creationTime || null,
      }));
      return res.json({
        success: true,
        serviceAccountAvailable: true,
        users,
      });
    } catch (err) {
      console.error('Admin listUsers error:', err);
      return res.status(500).json({ error: 'Unable to fetch Firebase Auth users.' });
    }
  }
);

// Admin Role & Custom Claim Assignment (supports POST and PATCH)
const handleAdminRoleAssignment = async (req: AuthenticatedRequest, res: Response) => {
  const targetUid = String(req.params.uid || '').trim();
  const role = req.body?.role;

  if (!/^[a-zA-Z0-9_\-]{1,128}$/.test(targetUid)) {
    return res.status(400).json({ error: 'Invalid target user ID.' });
  }
  if (!['patient', 'doctor', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Allowed: patient, doctor, admin.' });
  }
  if (!hasServiceAccount) {
    return res.status(501).json({
      error: 'Custom Claim updates require FIREBASE_SERVICE_ACCOUNT_JSON on the server.',
    });
  }

  try {
    const authClient = getAuth(getApp());
    const adminDb = getAdminDb();
    const targetUser = await authClient.getUser(targetUid);

    await authClient.setCustomUserClaims(targetUid, {
      ...(targetUser.customClaims || {}),
      admin: role === 'admin',
      role,
    });

    if (adminDb) {
      const batch = adminDb.batch();
      const profileRef = adminDb.doc(`profiles/${targetUid}`);
      batch.set(
        profileRef,
        { role, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );

      const adminRef = adminDb.doc(`admins/${targetUid}`);
      if (role === 'admin') {
        batch.set(adminRef, {
          userId: targetUid,
          email: targetUser.email || '',
          createdAt: FieldValue.serverTimestamp(),
        });
      } else {
        batch.delete(adminRef);
      }

      const auditRef = adminDb.collection('audit_logs').doc();
      batch.set(auditRef, {
        actorUid: req.authUser!.uid,
        actorEmail: req.authUser!.email || 'admin',
        action: `SET_ROLE_${String(role).toUpperCase()}`,
        targetType: 'user',
        targetId: targetUid,
        details: `Updated role for ${targetUser.email || targetUid} to ${role} (with Firebase Custom Claims).`,
        createdAt: FieldValue.serverTimestamp(),
      });

      await batch.commit();
    }

    return res.json({
      success: true,
      uid: targetUid,
      role,
    });
  } catch (err) {
    console.error('Admin role update error:', err);
    return res.status(500).json({ error: 'Failed to update user role.' });
  }
};

app.post(
  '/api/admin/users/:uid/role',
  requireAuth,
  requireVerifiedEmail,
  requireAdmin,
  createRateLimiter('admin-role', 20),
  handleAdminRoleAssignment
);

app.patch(
  '/api/admin/users/:uid/role',
  requireAuth,
  requireVerifiedEmail,
  requireAdmin,
  createRateLimiter('admin-role', 20),
  handleAdminRoleAssignment
);

// Gemini AI Medicine Scanner Route (Protected + Rate-Limited)
app.post(
  '/api/medicine/scan',
  requireAuth,
  requireVerifiedEmail,
  createRateLimiter('medicine-scan', 12),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg', manualSearchQuery } = req.body || {};

      if (
        !imageBase64 &&
        (!manualSearchQuery || typeof manualSearchQuery !== 'string' || !manualSearchQuery.trim())
      ) {
        return res.status(400).json({ error: 'Provide either a medicine image or a search query.' });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({
          error: 'Gemini AI service is not configured. Set GEMINI_API_KEY in server secrets.',
        });
      }

      const systemPrompt = `You are a clinical pharmacology reference assistant for HealthCare+.
Analyze the attached medicine package/strip image (or medicine name query) carefully and truthfully.

CRITICAL SAFETY & ACCURACY RULES:
1. Never invent, guess, or fabricate an expiry date.
   - If scanning an image and an expiry date (EXP) is clearly legible, extract it verbatim in "expiryDate".
   - If no expiry date is clearly legible, if the image is blurry, or if analyzing a text query without packaging, set "expiryDate" to: "Not legible / not visible — inspect physical packaging before use".
2. Never provide personalized prescription dosing instructions. In "dosage", provide only general manufacturer/reference labeling information and explicitly add: "General reference only — not a personal prescription. Follow your doctor's or pharmacist's instructions."
3. If the product cannot be confidently identified from the image or query, clearly state "Unidentified / Uncertain" in "name" and explain in "warnings" instead of guessing.
4. Keep output strictly valid JSON with this exact schema:
{
  "name": "Medicine Name & Strength (or Unidentified if unclear)",
  "composition": "Active chemical ingredients & strengths (or 'Not confirmed from image')",
  "expiryDate": "Legible EXP date from package OR 'Not legible / not visible — inspect physical packaging before use'",
  "uses": ["Indication 1", "Indication 2"],
  "benefits": ["Benefit 1", "Benefit 2"],
  "sideEffects": ["Common side effect 1", "Common side effect 2"],
  "dosage": "General labeling reference only — not a personal prescription. Consult a licensed physician or pharmacist.",
  "warnings": ["Warning 1", "Warning 2"],
  "storage": "Storage instructions from standard labeling",
  "alternativeMedicines": [
    {"name": "Generic/Alt Name", "approxPrice": "Est. range", "manufacturer": "Manufacturer"}
  ],
  "priceRange": "Approximate market price range or 'Varies by pharmacy/region'",
  "disclaimer": "Educational reference only. AI output cannot replace a licensed pharmacist or physician. Always inspect physical packaging and expiry dates before consumption."
}`;

      let contentsPayload: any;

      if (imageBase64 && typeof imageBase64 === 'string') {
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const safeMimeType = ['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)
          ? mimeType
          : 'image/jpeg';
        contentsPayload = {
          parts: [
            { inlineData: { mimeType: safeMimeType, data: cleanBase64 } },
            { text: systemPrompt },
          ],
        };
      } else {
        contentsPayload = {
          parts: [
            {
              text: `${systemPrompt}\nMedicine text query (no physical packaging image provided): ${String(
                manualSearchQuery
              )
                .trim()
                .slice(0, 200)}`,
            },
          ],
        };
      }

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: contentsPayload,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const rawText = (response.text || '').trim();
      if (!rawText) {
        return res.status(502).json({ error: 'Empty response from AI vision service.' });
      }

      let parsedData: Record<string, any>;
      try {
        parsedData = JSON.parse(stripJsonFences(rawText));
      } catch {
        return res.status(502).json({
          error: 'Could not parse structured medicine analysis. Please retake a clearer photo or refine your query.',
        });
      }

      const expiryText =
        typeof parsedData.expiryDate === 'string' && parsedData.expiryDate.trim()
          ? parsedData.expiryDate.trim().slice(0, 160)
          : 'Not legible / not visible — inspect physical packaging before use';

      return res.json({
        success: true,
        data: {
          id: `scan_${Date.now()}`,
          timestamp: new Date().toISOString(),
          name: String(parsedData.name || 'Unidentified Packaging').slice(0, 160),
          composition: String(parsedData.composition || 'Not confirmed — verify packaging label').slice(0, 500),
          expiryDate: expiryText,
          uses: Array.isArray(parsedData.uses) ? parsedData.uses.slice(0, 12).map(String) : [],
          benefits: Array.isArray(parsedData.benefits) ? parsedData.benefits.slice(0, 12).map(String) : [],
          sideEffects: Array.isArray(parsedData.sideEffects)
            ? parsedData.sideEffects.slice(0, 12).map(String)
            : [],
          dosage: String(
            parsedData.dosage ||
              'General reference only — not a personal prescription. Consult a licensed doctor or pharmacist.'
          ).slice(0, 500),
          warnings: Array.isArray(parsedData.warnings) ? parsedData.warnings.slice(0, 12).map(String) : [],
          storage: String(
            parsedData.storage || 'Verify storage temperature and moisture instructions on physical packaging.'
          ).slice(0, 300),
          alternativeMedicines: Array.isArray(parsedData.alternativeMedicines)
            ? parsedData.alternativeMedicines.slice(0, 6)
            : [],
          priceRange: String(parsedData.priceRange || 'Varies by pharmacy & region').slice(0, 100),
          disclaimer: String(
            parsedData.disclaimer ||
              'Educational reference only. Does not constitute medical advice or a personal prescription. Always inspect the physical package and expiry date before use.'
          ).slice(0, 500),
          saved: true,
        },
      });
    } catch (err: any) {
      console.error('Medicine scan error:', err?.message || err);
      const status = err?.status === 429 ? 429 : 500;
      return res.status(status).json({
        error:
          status === 429
            ? 'AI scanner is temporarily busy. Please try again in a moment.'
            : 'Unable to analyze medicine right now. Please try again with a clear, well-lit image.',
      });
    }
  }
);

// Gemini AI Health Chatbot Endpoint (Protected + Rate-Limited)
app.post(
  '/api/ai/chat',
  requireAuth,
  requireVerifiedEmail,
  createRateLimiter('ai-chat', 20),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { message, history = [], userProfile, language = 'English' } = req.body || {};

      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ error: 'Message is required.' });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({
          error: 'Gemini AI assistant is not configured. Set GEMINI_API_KEY in server secrets.',
        });
      }

      const allowedLanguages = ['English', 'Hindi', 'Spanish', 'French', 'German'];
      const preferredLanguage = allowedLanguages.includes(String(language))
        ? String(language)
        : 'English';

      const allergiesList =
        Array.isArray(userProfile?.allergies) && userProfile.allergies.length > 0
          ? userProfile.allergies.slice(0, 20).join(', ')
          : 'None recorded';
      const conditionsList =
        Array.isArray(userProfile?.medicalConditions) && userProfile.medicalConditions.length > 0
          ? userProfile.medicalConditions.slice(0, 20).join(', ')
          : 'None recorded';

      const systemInstruction = `You are HealthCare+ AI, an empathetic, evidence-based health education companion.
Preferred Response Language: ${preferredLanguage}. Always reply clearly in ${preferredLanguage} unless the user asks for another language.
Patient Profile Context (from verified user profile): Age ${
        userProfile?.age || 'Not provided'
      }, Gender ${userProfile?.gender || 'Not provided'}, Recorded Allergies: ${allergiesList}, Recorded Conditions: ${conditionsList}.

STRICT CLINICAL SAFETY & NON-FABRICATION RULES:
1. NEVER invent, guess, or assume lab values, vitals, diagnoses, test results, or prescriptions that were not explicitly provided by the user.
2. If crucial context (like recent vitals, duration, or lab units) is missing or unavailable, explicitly say what information is missing instead of guessing.
3. Never issue definitive medical diagnoses or personal prescriptions. Suggest practical questions the user can ask a licensed doctor.
4. For any severe or emergency red-flag symptoms (chest pain, shortness of breath, sudden weakness/numbness, severe bleeding, suicidal thoughts, anaphylaxis), instruct the user immediately to contact local emergency services (e.g., India: 112 / 108, International: 911).
5. Always maintain a calm, clear structure with concise bullet points and remember that AI guidance does not replace a registered medical professional.`;

      const formattedContents = Array.isArray(history)
        ? history.slice(-20).map((item: any) => ({
            role: item.sender === 'user' ? 'user' : 'model',
            parts: [{ text: String(item.text || '').slice(0, 4000) }],
          }))
        : [];

      formattedContents.push({
        role: 'user',
        parts: [{ text: message.trim().slice(0, 4000) }],
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: formattedContents,
        config: {
          systemInstruction,
        },
      });

      const replyText = (response.text || '').trim();
      if (!replyText) {
        return res.status(502).json({
          error: 'AI Health Companion returned an empty response. Please try again.',
        });
      }

      return res.json({
        success: true,
        reply: replyText,
      });
    } catch (err: any) {
      console.error('AI chat error:', err?.message || err);
      const status = err?.status === 429 ? 429 : 502;
      return res.status(status).json({
        error:
          status === 429
            ? 'AI rate limit reached. Please wait a moment before sending another message.'
            : 'Unable to reach Gemini clinical AI right now. Please try again shortly.',
      });
    }
  }
);

function normalizeFacilityCategory(
  raw: unknown
): 'All' | 'Hospital' | 'Pharmacy' | 'Clinic' | 'Diagnostic' | 'Blood Bank' {
  const v = String(raw || 'All').trim().toLowerCase();
  if (v === 'hospital') return 'Hospital';
  if (v === 'pharmacy') return 'Pharmacy';
  if (v === 'clinic') return 'Clinic';
  if (v === 'diagnostic') return 'Diagnostic';
  if (v === 'blood_bank' || v === 'blood bank') return 'Blood Bank';
  return 'All';
}

// Google Maps Places API (New) Server-Side Proxy (Protected + Rate-Limited + CF1 Compliant)
app.post(
  '/api/places/nearby',
  requireAuth,
  requireVerifiedEmail,
  createRateLimiter('places-nearby', 30),
  async (req: AuthenticatedRequest, res: Response) => {
    const apiKey =
      process.env.GOOGLE_MAPS_PLATFORM_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      '';
    if (!apiKey || apiKey === 'YOUR_API_KEY') {
      return res.status(503).json({
        error: 'Google Maps Platform API key is not available on the server yet.',
      });
    }

    const { lat, lng, category: rawCategory = 'All', textQuery, radiusMeters = 5000 } = req.body || {};
    const category = normalizeFacilityCategory(rawCategory);

    const hasCoords =
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180;

    const cleanQuery = typeof textQuery === 'string' ? textQuery.trim().slice(0, 140) : '';

    if (!hasCoords && !cleanQuery) {
      return res.status(400).json({
        error: 'Provide valid GPS coordinates (lat, lng) or a city/area search query.',
      });
    }

    const fieldMask = [
      'places.id',
      'places.displayName',
      'places.formattedAddress',
      'places.location',
      'places.primaryType',
      'places.types',
      'places.rating',
      'places.userRatingCount',
      'places.nationalPhoneNumber',
      'places.internationalPhoneNumber',
      'places.regularOpeningHours.openNow',
      'places.websiteUri',
      'places.googleMapsUri',
      'places.googleMapsLinks',
    ].join(',');

    try {
      let endpoint = 'https://places.googleapis.com/v1/places:searchNearby';
      let requestBody: Record<string, any>;

      // Use Text Search (New) when user entered a location/query OR selected Blood Bank / missing GPS
      const useTextSearch = Boolean(cleanQuery) || category === 'Blood Bank' || !hasCoords;

      if (useTextSearch) {
        endpoint = 'https://places.googleapis.com/v1/places:searchText';
        const categoryPhrase =
          category === 'All'
            ? 'hospital pharmacy clinic'
            : category === 'Diagnostic'
            ? 'diagnostic medical laboratory imaging center'
            : category === 'Blood Bank'
            ? 'blood bank blood donation center'
            : category.toLowerCase();

        const combinedQuery = cleanQuery
          ? `${category === 'All' ? 'hospital pharmacy clinic' : categoryPhrase} near ${cleanQuery}`
          : categoryPhrase;

        requestBody = {
          textQuery: combinedQuery,
          maxResultCount: 15,
          languageCode: 'en',
        };

        if (hasCoords) {
          requestBody.locationBias = {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: Math.min(50000, Math.max(500, Number(radiusMeters) || 5000)),
            },
          };
        }
      } else {
        const typeMap: Record<string, string[]> = {
          All: ['hospital', 'pharmacy', 'doctor'],
          Hospital: ['hospital', 'general_hospital'],
          Pharmacy: ['pharmacy', 'drugstore'],
          Clinic: ['doctor', 'medical_clinic', 'medical_center'],
          Diagnostic: ['medical_lab'],
        };

        requestBody = {
          includedTypes: typeMap[category] || ['hospital', 'pharmacy'],
          maxResultCount: 15,
          rankPreference: 'DISTANCE',
          languageCode: 'en',
          locationRestriction: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: Math.min(50000, Math.max(500, Number(radiusMeters) || 5000)),
            },
          },
        };
      }

      const gmpRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': fieldMask,
          'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
        },
        body: JSON.stringify(requestBody),
      });

      const payload: any = await gmpRes.json().catch(() => ({}));

      if (gmpRes.status === 429 || payload?.error?.status === 'RESOURCE_EXHAUSTED') {
        return res.status(429).json({
          error: 'Google Maps Platform Places quota exceeded.',
          status: 'RESOURCE_EXHAUSTED',
        });
      }

      if (!gmpRes.ok) {
        console.error('Places API (New) error:', gmpRes.status, payload?.error?.message || payload);
        return res.status(502).json({
          error: payload?.error?.message || 'Unable to fetch nearby medical facilities from Google Places.',
        });
      }

      const placesList = Array.isArray(payload.places) ? payload.places : [];

      const mappedPlaces = placesList
        .filter((p: any) => p?.location?.latitude !== undefined && p?.location?.longitude !== undefined)
        .map((p: any) => {
          const pLat = Number(p.location.latitude);
          const pLng = Number(p.location.longitude);
          const types: string[] = Array.isArray(p.types) ? p.types : [];
          const primaryType: string = p.primaryType || types[0] || '';

          let mappedCategory: 'Hospital' | 'Pharmacy' | 'Clinic' | 'Diagnostic' | 'Blood Bank' = 'Hospital';
          if (category === 'Blood Bank') {
            mappedCategory = 'Blood Bank';
          } else if (category === 'Diagnostic' || primaryType.includes('lab')) {
            mappedCategory = 'Diagnostic';
          } else if (primaryType.includes('pharmacy') || primaryType.includes('drugstore') || types.includes('pharmacy')) {
            mappedCategory = 'Pharmacy';
          } else if (primaryType.includes('doctor') || primaryType.includes('clinic')) {
            mappedCategory = 'Clinic';
          }

          return {
            id: p.id || `place_${pLat}_${pLng}`,
            placeId: p.id || '',
            name: p.displayName?.text || 'Medical Facility',
            category: mappedCategory,
            address: p.formattedAddress || 'Address not listed',
            distanceKm: hasCoords ? haversineDistanceKm(lat, lng, pLat, pLng) : null,
            rating: typeof p.rating === 'number' ? p.rating : null,
            reviewCount: typeof p.userRatingCount === 'number' ? p.userRatingCount : 0,
            phone: p.nationalPhoneNumber || p.internationalPhoneNumber || '',
            openNow: typeof p.regularOpeningHours?.openNow === 'boolean' ? p.regularOpeningHours.openNow : null,
            websiteUri: p.websiteUri || undefined,
            googleMapsUri: p.googleMapsUri || undefined,
            directionsUri:
              p.googleMapsLinks?.directionsUri ||
              `https://www.google.com/maps/dir/?api=1&destination=${pLat},${pLng}&destination_place_id=${encodeURIComponent(
                p.id || ''
              )}`,
            lat: pLat,
            lng: pLng,
          };
        });

      return res.json({
        success: true,
        center: hasCoords
          ? { lat, lng }
          : mappedPlaces[0]
          ? { lat: mappedPlaces[0].lat, lng: mappedPlaces[0].lng }
          : null,
        places: mappedPlaces,
      });
    } catch (err) {
      console.error('Places nearby proxy error:', err);
      return res.status(500).json({ error: 'Failed to query nearby medical facilities.' });
    }
  }
);

// Truthful Emergency SOS Request Endpoint (Protected + Rate-Limited)
// Explicitly logs the SOS request & contact notification metadata — NEVER claims fake ambulance dispatch.
app.post(
  '/api/emergency/sos',
  requireAuth,
  requireVerifiedEmail,
  createRateLimiter('emergency-sos', 10),
  (req: AuthenticatedRequest, res: Response) => {
    const { userLocation, coordinates, gpsAvailable, emergencyContacts, note } = req.body || {};
    const contactsCount = Array.isArray(emergencyContacts) ? Math.min(50, emergencyContacts.length) : 0;
    const validGps =
      Boolean(gpsAvailable) &&
      coordinates &&
      typeof coordinates.lat === 'number' &&
      typeof coordinates.lng === 'number';

    const notificationAttempts: string[] = [];
    if (contactsCount > 0) {
      notificationAttempts.push(`Prepared direct call/SMS share links for ${contactsCount} emergency contact(s)`);
    } else {
      notificationAttempts.push('No saved emergency contacts found — add contacts in Profile');
    }
    notificationAttempts.push(
      validGps
        ? `Captured device GPS coordinates (${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)})`
        : 'Device GPS unavailable or permission declined'
    );

    const status = contactsCount > 0 ? 'CONTACTS_NOTIFIED' : 'REQUESTED';

    return res.json({
      success: true,
      sosId: `sos_${Date.now()}`,
      userId: req.authUser!.uid,
      userLocation:
        typeof userLocation === 'string' && userLocation.trim()
          ? userLocation.trim().slice(0, 240)
          : validGps
          ? `${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}`
          : 'Location unavailable (device GPS not granted)',
      gpsAvailable: validGps,
      coordinates: validGps ? { lat: coordinates.lat, lng: coordinates.lng } : undefined,
      timestamp: new Date().toISOString(),
      status,
      responseStatus:
        'SOS request recorded. HealthCare+ does NOT automatically dispatch public ambulances — dial local emergency services immediately.',
      notificationAttempts,
      notifiedContactsCount: contactsCount,
      note: typeof note === 'string' ? note.slice(0, 500) : '',
      emergencyNumbers: [
        { region: 'India National', label: 'Emergency', number: '112' },
        { region: 'India Ambulance', label: 'EMS Ambulance', number: '108' },
        { region: 'India Maternal EMS', label: 'Maternal / Child', number: '102' },
        { region: 'US / Canada / Intl', label: 'Emergency', number: '911' },
      ],
    });
  }
);

// ==========================================
// VITE / STATIC SERVING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HealthCare+ Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
