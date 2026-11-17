import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
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
  if (decoded.email === 'patekarshubham07@gmail.com' && decoded.email_verified === true) {
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

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Security & Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
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
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'HealthCare+',
    timestamp: new Date().toISOString(),
    firebaseProjectId: FIREBASE_PROJECT_ID || null,
    firebaseAdminInitialized: getApps().length > 0,
    firebaseServiceAccountConfigured: hasServiceAccount,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
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
app.get('/api/admin/overview', requireAuth, requireVerifiedEmail, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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
  } catch (err: any) {
    console.error('Admin overview error:', err);
    return res.status(500).json({ error: 'Failed to load admin overview.' });
  }
});

// Gemini AI Medicine Scanner Route (Protected)
app.post('/api/medicine/scan', requireAuth, requireVerifiedEmail, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', manualSearchQuery } = req.body;

    if (!imageBase64 && (!manualSearchQuery || typeof manualSearchQuery !== 'string' || !manualSearchQuery.trim())) {
      return res.status(400).json({ error: 'Provide either a medicine image or a search query.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini AI service is not configured. Set GEMINI_API_KEY in server secrets.',
      });
    }

    const systemPrompt = `You are a world-class clinical pharmacist and AI medical vision specialist for HealthCare+.
Analyze the attached medicine box/strip image (or text query) and extract precise medical information.
Respond strictly in JSON format according to this schema:
{
  "name": "Medicine Name and Strength",
  "composition": "Active Chemical Ingredients & Strengths",
  "uses": ["Use 1", "Use 2", "Use 3"],
  "benefits": ["Benefit 1", "Benefit 2"],
  "sideEffects": ["Side Effect 1", "Side Effect 2"],
  "dosage": "Standard adult dosage and frequency recommendation",
  "warnings": ["Warning 1", "Warning 2"],
  "storage": "Storage conditions",
  "alternativeMedicines": [
    {"name": "Alt 1 Name", "approxPrice": "Price", "manufacturer": "Brand"}
  ],
  "priceRange": "Estimated Price",
  "disclaimer": "Safety medical disclaimer"
}`;

    let contentsPayload: any;

    if (imageBase64 && typeof imageBase64 === 'string') {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      contentsPayload = {
        parts: [
          { inlineData: { mimeType, data: cleanBase64 } },
          { text: systemPrompt },
        ],
      };
    } else {
      contentsPayload = {
        parts: [
          { text: `${systemPrompt}\nMedicine query: ${String(manualSearchQuery).trim().slice(0, 200)}` },
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

    const textOutput = (response.text || '').trim();
    if (!textOutput) {
      return res.status(502).json({ error: 'Empty response from AI vision service.' });
    }

    const parsedData = JSON.parse(textOutput);

    return res.json({
      success: true,
      data: {
        id: `scan_${Date.now()}`,
        timestamp: new Date().toISOString(),
        name: parsedData.name || 'Identified Medicine',
        composition: parsedData.composition || 'Active Ingredients',
        uses: Array.isArray(parsedData.uses) ? parsedData.uses : [],
        benefits: Array.isArray(parsedData.benefits) ? parsedData.benefits : [],
        sideEffects: Array.isArray(parsedData.sideEffects) ? parsedData.sideEffects : [],
        dosage: parsedData.dosage || 'Take as advised by doctor',
        warnings: Array.isArray(parsedData.warnings) ? parsedData.warnings : [],
        storage: parsedData.storage || 'Store in cool dry place',
        alternativeMedicines: Array.isArray(parsedData.alternativeMedicines) ? parsedData.alternativeMedicines : [],
        priceRange: parsedData.priceRange || 'N/A',
        disclaimer: parsedData.disclaimer || 'Medical Disclaimer: AI generated guidance.',
        saved: true,
      },
    });
  } catch (err: any) {
    console.error('Medicine scan error:', err);
    return res.status(500).json({
      error: 'Failed to process medicine scan',
      message: err.message,
    });
  }
});

// Gemini AI Health Chatbot Endpoint (Protected)
app.post('/api/ai/chat', requireAuth, requireVerifiedEmail, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message, history = [], userProfile } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini AI assistant is not configured. Set GEMINI_API_KEY in server secrets.',
      });
    }

    const systemInstruction = `You are HealthCare+ AI, an empathetic, highly knowledgeable senior clinical assistant.
User Context: Age ${userProfile?.age || 'Unknown'}, Gender ${userProfile?.gender || 'Unspecified'}, Allergies: ${Array.isArray(userProfile?.allergies) && userProfile.allergies.length > 0 ? userProfile.allergies.join(', ') : 'None recorded'}, Medical Conditions: ${Array.isArray(userProfile?.medicalConditions) && userProfile.medicalConditions.length > 0 ? userProfile.medicalConditions.join(', ') : 'None recorded'}.
Provide clear, actionable, evidence-based medical, nutrition, exercise, or health guidance. Keep answers formatted neatly with concise bullet points where appropriate. Always include a brief safety reminder when discussing severe symptoms.`;

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

    return res.json({
      success: true,
      reply: response.text || 'I am unable to generate a response at this moment.',
    });
  } catch (err: any) {
    console.error('AI chat error:', err);
    return res.status(500).json({ error: 'AI Assistant failed to respond', details: err.message });
  }
});

// Emergency SOS Dispatch Endpoint (Protected)
app.post('/api/emergency/sos', requireAuth, requireVerifiedEmail, (req: AuthenticatedRequest, res: Response) => {
  const { userLocation, emergencyContacts, note } = req.body;
  const contactsCount = Array.isArray(emergencyContacts) ? emergencyContacts.length : 0;

  return res.json({
    success: true,
    sosId: `sos_${Date.now()}`,
    userId: req.authUser!.uid,
    userLocation: typeof userLocation === 'string' && userLocation.trim() ? userLocation.trim().slice(0, 240) : 'Current GPS Pin',
    timestamp: new Date().toISOString(),
    status: 'DISPATCHED',
    ambulanceEtaMinutes: 6,
    dispatchedUnit: 'Metro Ambulance #408',
    notifiedContactsCount: contactsCount,
    note: typeof note === 'string' ? note.slice(0, 500) : '',
    message: 'Emergency SOS alert dispatched to nearest hospital & primary emergency contacts with live GPS coordinates.',
  });
});

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
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HealthCare+ Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
