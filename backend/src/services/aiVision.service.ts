import axios from 'axios';
import { GoogleGenAI } from '@google/genai';

const getGrokApiKey = () => process.env.GROK_API_KEY || process.env.XAI_API_KEY || '';
const getGeminiApiKey = () => process.env.GEMINI_API_KEY || '';

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
    normalized = await normalizeImageInput(imageBase64, mimeType);
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
    const modernAI = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    for (const modelName of GEMINI_VISION_MODELS) {
      let attempts = 0;
      while (attempts < 2) {
        attempts++;
        try {
          console.log(`[Gemini Vision] Attempting model: ${modelName} (attempt ${attempts}) for ${scanType}...`);
          
          // Try modern @google/genai SDK
          const response = await modernAI.models.generateContent({
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
          });

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
            const parsed = JSON.parse(text);
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
              throw new Error(`Invalid JSON output: ${text.slice(0, 100)}...`);
            }
          }
        } catch (geminiErr: any) {
          const errMsg = geminiErr?.message || String(geminiErr);
          const errStatus = geminiErr?.status || geminiErr?.code || 'ERROR';
          const detailedMsg = `[${modelName} / ${errStatus}]: ${errMsg}`;
          geminiErrors.push(detailedMsg);
          console.warn(`[Gemini Vision Warning] ${modelName} attempt ${attempts} failed:`, errMsg);

          // Retry on 503 high demand or 429 quota once after brief pause
          if ((errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('429')) && attempts < 2) {
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
