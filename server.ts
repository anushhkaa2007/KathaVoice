import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { parseNaturalLanguageEntryDeterministic } from './src/utils/accounting';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '2mb' }));

// Shared Gemini client setup if key is configured
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
  }
}

/**
 * Endpoint to extract structured transaction details from natural language text
 * (dictated via Wispr Flow or typed by the shopkeeper).
 */
app.post('/api/extract-transaction', async (req: Request, res: Response) => {
  try {
    const { prompt, existingCustomers = [] } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt text is required' });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Try Gemini API if key is present
    if (aiClient && process.env.GEMINI_API_KEY) {
      try {
        const customerListHint = Array.isArray(existingCustomers) && existingCustomers.length > 0
          ? `Existing customers in this shop's khata ledger are: ${existingCustomers.join(', ')}. Prefer matching these existing names if close, but do not hesitate to identify a new customer if a different name is spoken.`
          : '';

        const systemInstruction = `You are an expert khata ledger assistant for Indian retail shops and small businesses.
Your job is to convert natural language shopkeeper dictations (e.g. from Wispr Flow or speech) into structured transaction entries.

Key rules:
1. Transaction Types:
   - "credit": Customer took goods on credit/udhari, increasing their debt. Keywords: took, bought, purchased, udhar, udhari, liya, credit, goods given.
   - "payment": Customer paid money (cash/UPI/bank), decreasing their debt. Keywords: paid, payment, received, jama, diya, settled, upi, gpay, cash.
2. Amounts:
   - Extract the monetary value in Indian Rupees (INR).
   - If multiple distinct transactions are mentioned (e.g. "Sharma ji took rice for 340 and Verma paid 200"), separate them into individual transactions.
3. Customer name:
   - Identify the customer name cleanly (e.g. "Sharma Ji", "Patel Brothers", "Ramesh Kumar").
   ${customerListHint}
4. Description:
   - Extract item descriptions if mentioned (e.g. "rice and oil", "5kg sugar and soap") for credit purchases, or payment mode (e.g. "Cash", "UPI") for payments.
5. Dates:
   - Today's date is "${todayStr}".
   - "yesterday" refers to one day prior.
   - Format must always be YYYY-MM-DD.
6. Ambiguity:
   - If amounts or customer names are missing or conflicting, flag them in the ambiguities list.`;

        const geminiCall = aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Extract transactions from this shopkeeper dictation: "${prompt.trim()}"`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                transactions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      customerName: {
                        type: Type.STRING,
                        description: 'Clean name of the customer, e.g. "Sharma Ji"',
                      },
                      type: {
                        type: Type.STRING,
                        description: 'Either "credit" or "payment"',
                      },
                      amountRupees: {
                        type: Type.NUMBER,
                        description: 'Amount in INR as a positive number',
                      },
                      description: {
                        type: Type.STRING,
                        description: 'Items purchased or payment description',
                      },
                      date: {
                        type: Type.STRING,
                        description: 'Date in YYYY-MM-DD format',
                      },
                      notes: {
                        type: Type.STRING,
                        description: 'Additional context or remarks',
                      },
                      isAmbiguous: {
                        type: Type.BOOLEAN,
                        description: 'True if details were missing or unsure',
                      },
                      clarificationReason: {
                        type: Type.STRING,
                        description: 'What requires shopkeeper clarification',
                      },
                    },
                    required: ['customerName', 'type', 'amountRupees', 'description', 'date'],
                  },
                },
                ambiguities: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Any doubts, conflicting figures, or unclear items requiring manual review',
                },
                summary: {
                  type: Type.STRING,
                  description: 'Short human-readable summary of what was extracted',
                },
              },
              required: ['transactions', 'ambiguities'],
            },
          },
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API timeout')), 6000)
        );

        const response: any = await Promise.race([geminiCall, timeoutPromise]);

        const rawJson = response.text ? response.text.trim() : '';
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          return res.json({
            transactions: (parsed.transactions || []).map((t: any) => ({
              ...t,
              type: t.type === 'payment' ? 'payment' : 'credit',
              amountRupees: Math.abs(Number(t.amountRupees) || 0),
              date: t.date || todayStr,
            })),
            ambiguities: parsed.ambiguities || [],
            rawSummary: parsed.summary || 'Extracted via Gemini AI',
            extractedBy: 'gemini',
          });
        }
      } catch (geminiError: any) {
        console.warn('Gemini extraction timed out or failed, using deterministic fallback parser:', geminiError?.message || geminiError);
      }
    }

    // Deterministic rule-based fallback
    const ruleBased = parseNaturalLanguageEntryDeterministic(prompt, todayStr);
    return res.json({
      transactions: ruleBased,
      ambiguities: ruleBased.length === 0 ? ['Could not recognize transaction amount or customer from text. Please verify manually.'] : [],
      rawSummary: ruleBased.length > 0 ? `Extracted ${ruleBased.length} transaction(s)` : 'No transactions recognized',
      extractedBy: 'rules',
    });
  } catch (err: any) {
    console.error('Extraction handler error:', err);
    return res.status(500).json({ error: 'Failed to process transaction extraction', details: err?.message });
  }
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    appName: 'Katha Voice Easy',
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Katha Voice Easy server running at http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
