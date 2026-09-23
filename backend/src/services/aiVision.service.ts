import axios from 'axios';
import { GoogleGenAI } from '@google/genai';
import { timeScan } from '../middlewares/scanTiming';
import { retryAfterSeconds } from './providerRetry';

const getGrokApiKey = () => process.env.GROK_API_KEY || process.env.XAI_API_KEY || '';
const getGeminiApiKey = () => process.env.GEMINI_API_KEY || '';
let client: GoogleGenAI | undefined;
let clientKey: string | undefined;
const visionClient = (apiKey: string) => {
  if (!client || clientKey !== apiKey) {
    clientKey = apiKey;
    // This service owns retries. SDK defaults must not multiply our attempts.
    client = new GoogleGenAI({ apiKey, httpOptions: {
      headers: { 'User-Agent': 'aistudio-build' }, retryOptions: { attempts: 1 },
      fetch: async (input, init) => {
        const response = await globalThis.fetch(input, init);
        // SDK ApiError does not retain response headers. Preserve only cooldown
        // metadata on retryable failures, without retaining the request/key.
        if ([429, 503].includes(response.status) && retryAfterSeconds({ headers: response.headers })) {
          await response.body?.cancel();
          throw Object.assign(new Error('Provider requested a cooldown.'), { status: response.status, headers: { 'retry-after': response.headers.get('retry-after') } });
        }
        return response;
      }
    } });
  }
  return client;
};

import { normalizeBase64Image, normalizeImageInput, logSafeDebug } from './ai.service';

// Active, supported Gemini vision models in priority order
const GEMINI_VISION_MODELS = [
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash'
];

/**
 * Unified Vision AI Engine
 * Supports Google Gemini Vision (@google/genai & fallback) and optional Grok 2 Vision
 */
export const runUnifiedVisionAnalysis = async (params: {
  prompt: string;
  imageBase64: string;
  mimeType?: string;
  scanType?: string;
}): Promise<any> => {
  const { prompt, imageBase64, mimeType = 'image/jpeg', scanType = 'VISION_ANALYSIS' } = params;
  
  let normalized;
  try {
    normalized = await timeScan('normalize', () => normalizeImageInput(imageBase64, mimeType));
  } catch (err: any) {
    console.error(`[Vision AI Error] Failed to normalize image for ${scanType}:`, err?.message || err);
    logSafeDebug({
      scanType,
      mimeType,
      base64Length: 0,
      parseError: 'Failed to normalize Base64 input'
    });
    throw new Error(`Failed to process food image input: ${err?.message || 'Invalid image data'}`);
  }

  const { cleanBase64, mimeType: finalMimeType } = normalized;

  console.log(`[Vision AI Request] ScanType: ${scanType}, MIME: ${finalMimeType}, Base64 Length: ${cleanBase64.length}`);
  logSafeDebug({
    scanType,
    mimeType: finalMimeType,
    base64Length: cleanBase64.length
  });

  const geminiErrors: string[] = [];

  // 1. Try Google Gemini Vision if GEMINI_API_KEY is configured
  const geminiKey = getGeminiApiKey();
  if (geminiKey) {
    const modernAI = visionClient(geminiKey);
    let requestCount = 0;
    let transientRetries = 0;

    for (const modelName of GEMINI_VISION_MODELS) {
      if (requestCount >= 5) break;
      let attempts = 0;
      while (attempts < 2 && requestCount < 5) {
        attempts++;
        requestCount++;
        try {
          console.log(`[Gemini Vision] Attempting model: ${modelName} (attempt ${attempts}) for ${scanType}...`);
          
          // Try modern @google/genai SDK
          const response = await timeScan('gemini', () => modernAI.models.generateContent({
            model: modelName,
            contents: [
              {
                inlineData: {
                  mimeType: finalMimeType,
                  data: cleanBase64
                }
              },
              { text: prompt }
            ],
            config: {
              responseMimeType: 'application/json'
            }
          }));

          const text = (response.text || '').trim();
          if (!text) {
            throw new Error(`Empty response received from ${modelName}`);
          }

          console.log(`[Gemini Vision Success] Model ${modelName} responded (length: ${text.length} chars)`);
          logSafeDebug({
            scanType,
            mimeType: finalMimeType,
            base64Length: cleanBase64.length,
            geminiStatus: `HTTP 200 OK (${modelName})`
          });

          // Direct parse if JSON format was returned
          try {
            const parsed = await timeScan('ai_parse', async () => JSON.parse(text));
            return parsed;
          } catch (e) {
            // Strip code fences or extract object if wrapped
            const cleanText = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
            try {
              return JSON.parse(cleanText);
            } catch (e2) {
              const jsonMatch = text.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
              }
              throw new Error('Invalid JSON output from vision provider.');
            }
          }
        } catch (geminiErr: any) {
          const errStatus = geminiErr?.status || geminiErr?.code || 'ERROR';
          const detailedMsg = `[${modelName} / ${Number(errStatus) || 'ERROR'}]`;
          geminiErrors.push(detailedMsg);
          console.warn(`[Gemini Vision Warning] ${modelName} attempt ${attempts} failed (status ${Number(errStatus) || 'ERROR'}).`);
          // Authentication/quota failures are not cured by rapid duplicate calls.
          if ([401, 403, 429].includes(Number(errStatus))) {
            const error = new Error(Number(errStatus) === 429 ? 'AI service is busy or its quota is exhausted. Please try again later.' : 'AI service is unavailable. Please try again later.');
            Object.assign(error, { statusCode: Number(errStatus) === 429 ? 429 : 503, publicMessage: error.message, retryAfterSeconds: retryAfterSeconds(geminiErr) });
            throw error;
          }

          // Never wait/retry automatically when the provider asks for a cooldown.
          const retryAfter = retryAfterSeconds(geminiErr);
          if (retryAfter) {
            throw Object.assign(new Error('AI service is temporarily busy. Please try again later.'), { statusCode: 503, publicMessage: 'AI service is temporarily busy. Please try again later.', retryAfterSeconds: retryAfter });
          }
          // Retry a transient failure once across the entire fallback chain.
          if ((Number(errStatus) === 503 || Number(errStatus) === 500) && attempts < 2 && transientRetries < 1) {
            transientRetries++;
            await new Promise((r) => setTimeout(r, 1200));
            continue;
          }
          break; // Move to next fallback model
        }
      }
    }
  } else {
    geminiErrors.push('GEMINI_API_KEY is not set or empty in environment.');
    console.warn('[Gemini Vision] GEMINI_API_KEY is missing from environment variables.');
  }

  // 2. Try xAI Grok 2 Vision if GROK_API_KEY is configured (fallback)
  const grokKey = getGrokApiKey();
  if (grokKey) {
    try {
      console.log(`[Grok Vision] Attempting xAI Grok fallback for ${scanType}...`);
      const dataUrl = `data:${finalMimeType};base64,${cleanBase64}`;
      const response = await axios.post(
        'https://api.x.ai/v1/chat/completions',
        {
          model: 'grok-2-vision-1212',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `${prompt}\n\nCRITICAL: Respond in STRICT RAW JSON format matching the schema. Do not enclose in markdown ticks if possible, or use standard markdown json blocks.`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: dataUrl
                  }
                }
              ]
            }
          ],
          temperature: 0.1,
          max_tokens: 1500
        },
        {
          headers: {
            'Authorization': `Bearer ${grokKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 25000
        }
      );

      const content = response.data?.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (grokErr: any) {
      console.warn('⚠️ Grok Vision error:', grokErr?.response?.data || grokErr?.message);
      geminiErrors.push(`Grok: ${grokErr?.message || String(grokErr)}`);
    }
  }

  // If all vision engines failed, raise a detailed error instead of returning null
  console.error('[Vision AI Fatal] All Vision models failed:', geminiErrors);
  throw new Error(`Vision AI analysis failed. Models attempted: ${geminiErrors.join(' | ')}`);
};

/**
 * Unified Chatbot Engine
 * Supports Google Gemini and xAI Grok
 */
export const runUnifiedChat = async (params: {
  systemPrompt: string;
  userMessage: string;
}): Promise<string | null> => {
  const { systemPrompt, userMessage } = params;

  // 1. Try Gemini
  const geminiKey = getGeminiApiKey();
  if (geminiKey) {
    const modernAI = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    for (const modelName of GEMINI_VISION_MODELS) {
      try {
        const response = await modernAI.models.generateContent({
          model: modelName,
          contents: `${systemPrompt}\n\nUser Question: ${userMessage}`
        });
        const text = (response.text || '').trim();
        if (text) return text;
      } catch (e: any) {
        console.warn(`Gemini chat (${modelName}) error:`, e?.message);
      }
    }
  }

  // 2. Try Grok fallback
  const grokKey = getGrokApiKey();
  if (grokKey) {
    try {
      const response = await axios.post(
        'https://api.x.ai/v1/chat/completions',
        {
          model: 'grok-2',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${grokKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      return response.data?.choices?.[0]?.message?.content || null;
    } catch (e: any) {
      console.warn('Grok chat error:', e?.message);
    }
  }

  return null;
};
