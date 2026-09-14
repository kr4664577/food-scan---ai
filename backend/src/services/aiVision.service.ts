import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

const getGrokApiKey = () => process.env.GROK_API_KEY || process.env.XAI_API_KEY || '';
const getGeminiApiKey = () => process.env.GEMINI_API_KEY || '';

import { normalizeBase64Image, normalizeImageInput, logSafeDebug } from './ai.service';

/**
 * Unified Vision AI Engine
 * Supports Google Gemini Vision (and optional Grok 2 Vision)
 */
export const runUnifiedVisionAnalysis = async (params: {
  prompt: string;
  imageBase64: string;
  mimeType?: string;
  scanType?: string;
}): Promise<any | null> => {
  const { prompt, imageBase64, mimeType = 'image/jpeg', scanType = 'VISION_ANALYSIS' } = params;
  
  let normalized;
  try {
    normalized = await normalizeImageInput(imageBase64, mimeType);
  } catch (err: any) {
    logSafeDebug({
      scanType,
      mimeType,
      base64Length: 0,
      parseError: 'Failed to normalize Base64 input'
    });
    return null;
  }

  const { cleanBase64, mimeType: finalMimeType } = normalized;

  logSafeDebug({
    scanType,
    mimeType: finalMimeType,
    base64Length: cleanBase64.length
  });

  // 1. Try Google Gemini Vision if GEMINI_API_KEY is configured
  const geminiKey = getGeminiApiKey();
  if (geminiKey) {
    const modelsToTry = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];
    for (const modelName of modelsToTry) {
      let attempts = 0;
      while (attempts < 2) {
        attempts++;
        try {
          const genAI = new GoogleGenerativeAI(geminiKey);
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: 'application/json' }
          });
          const imagePart = { inlineData: { data: cleanBase64, mimeType: finalMimeType } };

          const result = await model.generateContent([prompt, imagePart]);
          const response = await result.response;
          const text = (response.text() || '').trim();

          logSafeDebug({
            scanType,
            mimeType: finalMimeType,
            base64Length: cleanBase64.length,
            geminiStatus: `HTTP 200 OK (${modelName})`
          });

          // Direct parse if JSON format was enforced
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
            }
          }
        } catch (geminiErr: any) {
          const errMsg = geminiErr?.message || String(geminiErr);
          console.warn(`[Safe Debug] Gemini Vision (${modelName}, attempt ${attempts}) error:`, errMsg);
          if (errMsg.includes('503') || errMsg.includes('high demand')) {
            // Wait 1 second and retry once before next model
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
          break; // Move to next model for non-transient errors
        }
      }
    }
  }

  // 2. Try xAI Grok 2 Vision if GROK_API_KEY is configured (fallback)
  const grokKey = getGrokApiKey();
  if (grokKey) {
    try {
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
    }
  }

  return null;
};

/**
 * Unified Chatbot Engine
 * Supports xAI Grok and Google Gemini
 */
export const runUnifiedChat = async (params: {
  systemPrompt: string;
  userMessage: string;
}): Promise<string | null> => {
  const { systemPrompt, userMessage } = params;

  // 1. Try Grok
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

  // 2. Try Gemini
  const geminiKey = getGeminiApiKey();
  if (geminiKey) {
    const modelsToTry = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-1.5-flash'];
    for (const modelName of modelsToTry) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(`${systemPrompt}\n\nUser Question: ${userMessage}`);
        const response = await result.response;
        const text = response.text();
        if (text) return text;
      } catch (e: any) {
        console.warn(`Gemini chat (${modelName}) error:`, e?.message);
      }
    }
  }

  return null;
};
