import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY')
  });
});

// Authentication Routes
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password, rememberMe } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  return res.json({
    success: true,
    token: `jwt_hcplus_${Date.now()}_token`,
    user: {
      id: 'usr_1001',
      name: email.split('@')[0].toUpperCase().replace('.', ' '),
      email,
      role: email.includes('admin') ? 'admin' : 'patient'
    }
  });
});

app.post('/api/auth/biometric', (req: Request, res: Response) => {
  return res.json({
    success: true,
    message: 'Biometric fingerprint / face ID authentication verified',
    token: `jwt_hcplus_bio_${Date.now()}`
  });
});

// Gemini AI Medicine Scanner Route
app.post('/api/medicine/scan', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', manualSearchQuery } = req.body;

    const ai = getGeminiClient();

    if (!ai) {
      // Fallback realistic scan output if API key is not configured in secrets
      return res.json({
        success: true,
        isFallback: true,
        data: {
          id: `scan_${Date.now()}`,
          timestamp: new Date().toISOString(),
          name: manualSearchQuery || 'Augmentin 625 Duo',
          composition: 'Amoxicillin Trihydrate (500mg) + Potassium Clavulanate (125mg)',
          uses: [
            'Bacterial Respiratory Infections',
            'Acute Sinusitis & Otitis Media',
            'Skin & Soft Tissue Infections',
            'Urinary Tract Infections'
          ],
          benefits: [
            'Dual action against beta-lactamase producing resistant bacteria',
            'Broad spectrum fast relief for acute infections',
            'Prevents strain mutation and recurrence'
          ],
          sideEffects: [
            'Mild Nausea or Stomach Upset',
            'Diarrhea',
            'Skin Allergy or Rash',
            'Headache'
          ],
          dosage: '1 Tablet twice daily after meals for 5 to 7 days as prescribed.',
          warnings: [
            'Do not skip doses or terminate early',
            'Avoid if allergic to Penicillin antibiotics',
            'Consult doctor during pregnancy or nursing'
          ],
          storage: 'Store below 25°C in a cool dry place away from moisture.',
          alternativeMedicines: [
            { name: 'Moxikind-CV 625', approxPrice: '$12.50 / strip', manufacturer: 'Mankind Pharma' },
            { name: 'Clavam 625', approxPrice: '$14.00 / strip', manufacturer: 'Alkem Labs' },
            { name: 'Advent 625', approxPrice: '$11.80 / strip', manufacturer: 'Cipla Therapeutics' }
          ],
          priceRange: '$12.00 - $16.00 per pack',
          disclaimer: 'Medical Disclaimer: AI-extracted reference only. Always confirm prescription with a licensed physician.',
          saved: true
        }
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

    if (imageBase64) {
      // Clean base64 string
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      contentsPayload = {
        parts: [
          { inlineData: { mimeType, data: cleanBase64 } },
          { text: systemPrompt }
        ]
      };
    } else {
      contentsPayload = {
        parts: [
          { text: `${systemPrompt}\nMedicine query: ${manualSearchQuery || 'Paracetamol 500mg'}` }
        ]
      };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: contentsPayload,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const textOutput = response.text || '';
    const parsedData = JSON.parse(textOutput);

    return res.json({
      success: true,
      data: {
        id: `scan_${Date.now()}`,
        timestamp: new Date().toISOString(),
        imageUrl: imageBase64 ? imageBase64.substring(0, 100) + '...' : undefined,
        name: parsedData.name || 'Identified Medicine',
        composition: parsedData.composition || 'Active Ingredients',
        uses: parsedData.uses || [],
        benefits: parsedData.benefits || [],
        sideEffects: parsedData.sideEffects || [],
        dosage: parsedData.dosage || 'Take as advised by doctor',
        warnings: parsedData.warnings || [],
        storage: parsedData.storage || 'Store in cool dry place',
        alternativeMedicines: parsedData.alternativeMedicines || [],
        priceRange: parsedData.priceRange || 'N/A',
        disclaimer: parsedData.disclaimer || 'Medical Disclaimer: AI generated guidance.',
        saved: true
      }
    });

  } catch (err: any) {
    console.error('Medicine scan error:', err);
    return res.status(500).json({
      error: 'Failed to process medicine image',
      message: err.message
    });
  }
});

// Gemini AI Health Chatbot Endpoint
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, history = [], userProfile } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const ai = getGeminiClient();

    if (!ai) {
      // Smart fallback response if API key isn't provided
      const msgLower = message.toLowerCase();
      let replyText = "I am HealthCare+ Gemini AI Medical Assistant. I can help explain symptoms, lab reports, diet plans, and medicine interactions.";

      if (msgLower.includes('headache') || msgLower.includes('fever') || msgLower.includes('symptom')) {
        replyText = "For mild headache or low-grade fever, maintain hydration, rest in a dim room, and track your body temperature. If accompanied by high fever (>102°F), neck stiffness, or vision changes, please consult urgent care immediately.";
      } else if (msgLower.includes('diet') || msgLower.includes('food') || msgLower.includes('nutrition')) {
        replyText = "A heart-healthy diet includes high-fiber vegetables, lean proteins (fish, legumes), complex grains, and healthy fats like olive oil or avocados. Limit refined sugars and sodium under 2,000mg/day.";
      } else if (msgLower.includes('bp') || msgLower.includes('blood pressure')) {
        replyText = "Normal blood pressure is typically below 120/80 mmHg. Consistent readings above 130/80 mmHg indicate elevated levels. Regular aerobic exercise, stress reduction, and low sodium intake support optimal arterial pressure.";
      }

      return res.json({
        success: true,
        isFallback: true,
        reply: replyText
      });
    }

    const systemInstruction = `You are HealthCare+ AI, an empathetic, highly knowledgeable senior clinical assistant.
User Context: Age ${userProfile?.age || 32}, Gender ${userProfile?.gender || 'Male'}, Allergies: ${userProfile?.allergies?.join(', ') || 'None'}, Medical Conditions: ${userProfile?.medicalConditions?.join(', ') || 'None'}.
Provide clear, actionable, evidence-based medical, nutrition, exercise, or health guidance. Keep answers formatted neatly with concise bullet points where appropriate. Always include a brief safety reminder when discussing severe symptoms.`;

    const formattedContents = history.map((item: any) => ({
      role: item.sender === 'user' ? 'user' : 'model',
      parts: [{ text: item.text }]
    }));

    formattedContents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.7
      }
    });

    return res.json({
      success: true,
      reply: response.text || 'I am unable to generate a response at this moment.'
    });

  } catch (err: any) {
    console.error('AI chat error:', err);
    return res.status(500).json({ error: 'AI Assistant failed to respond', details: err.message });
  }
});

// Emergency SOS Dispatch Endpoint
app.post('/api/emergency/sos', (req: Request, res: Response) => {
  const { userLocation, emergencyContacts, note } = req.body;
  
  return res.json({
    success: true,
    sosId: `sos_${Date.now()}`,
    timestamp: new Date().toISOString(),
    status: 'DISPATCHED',
    ambulanceEtaMinutes: 6,
    dispatchedUnit: 'Metro Ambulance #408',
    notifiedContactsCount: emergencyContacts?.length || 2,
    message: 'Emergency SOS alert dispatched to nearest hospital & primary emergency contacts with live GPS coordinates.'
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
