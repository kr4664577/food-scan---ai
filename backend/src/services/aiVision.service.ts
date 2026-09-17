import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

const getGrokApiKey = () => process.env.GROK_API_KEY || process.env.XAI_API_KEY || '';
const getGeminiApiKey = () => process.env.GEMINI_API_KEY || '';

import { normalizeImageInput, logSafeDebug } from './ai.service';

const parseJsonObject = (text: string): any | null => {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;

  const candidates = [
    trimmed,
    trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  ];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch (_) {
      // Continue to a bounded object extraction below.
    }
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(trimmed.slice(start, end + 1));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch (_) {
      return null;
    }
  }

  return null;
};

const isUsableVisionResult = (value: any): boolean => {
  if (!value || typeof value !== 'object') return false;
  const productName = typeof value.productName === 'string' ? value.productName.trim() : '';
  const rawOcrText = typeof value.rawOcrText === 'string' ? value.rawOcrText.trim() : '';
  const confidence = value.confidence;

  // Do not allow an empty/generic response to enter the catalog merge pipeline.
  if (!productName && !rawOcrText) return false;
  if (productName.length > 180) return false;

  if (confidence && typeof confidence === 'object') {
    const overall = Number(confidence.overall);
    if (Number.isFinite(overall) && (overall < 0 || overall > 1)) return false;
  }

  return true;
};

const buildVisionPrompt = (prompt: string) => `${prompt}\n\nIMAGE-GROUNDING RULES:\n- Base every identification on the pixels in the supplied image, not on prior examples or likely products.\n- Never assume the product is one of a known catalog list.\n- If the package text is unreadable, say so and lower confidence instead of guessing.\n- Do not copy nutrition, ingredients, allergens, or product details from another product merely because the visual appearance is similar.\n- If the image does not contain a packaged food/product, explicitly identify that fact.\n- Return only the requested JSON object.\n- Confidence values must be between 0 and 1 and must reflect image evidence.`;

/**
 * Unified Vision AI Engine
 * Supports Google Gemini Vision (and optional Grok Vision fallback).
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
  } catch (_) {
    logSafeDebug({ scanType, mimeType, base64Length: 0, parseError: 'Failed to normalize Base64 input' });
    return null;
  }

  const { cleanBase64, mimeType: finalMimeType } = normalized;
  const groundedPrompt = buildVisionPrompt(prompt);

  logSafeDebug({ scanType, mimeType: finalMimeType, base64Length: cleanBase64.length });

  const geminiKey = getGeminiApiKey();
  if (geminiKey) {
    // Keep the primary path deterministic. Additional models are used only after a failed response/error,
    // rather than automatically making several successful AI calls for one image.
    const modelsToTry = ['gemini-2.5-flash', 'gemini-3.5-flash-lite'];

    for (const modelName of modelsToTry) {
      let attempts = 0;
      while (attempts < 2) {
        attempts++;
        try {
          const genAI = new GoogleGenerativeAI(geminiKey);
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
          });
          const imagePart = { inlineData: { data: cleanBase64, mimeType: finalMimeType } };
          const result = await model.generateContent([groundedPrompt, imagePart]);
          const text = (result.response.text() || '').trim();
          const parsed = parseJsonObject(text);

          logSafeDebug({ scanType, mimeType: finalMimeType, base64Length: cleanBase64.length, geminiStatus: `HTTP 200 OK (${modelName})` });

          if (isUsableVisionResult(parsed)) return parsed;

          // A successful but unusable response should move to the next model, not be merged into catalog data.
          break;
        } catch (geminiErr: any) {
          const errMsg = geminiErr?.message || String(geminiErr);
          console.warn(`[Safe Debug] Gemini Vision (${modelName}, attempt ${attempts}) error:`, errMsg);
          if (errMsg.includes('503') || errMsg.includes('high demand')) {
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
          break;
        }
      }
    }
  }

  const grokKey = getGrokApiKey();
  if (grokKey) {
    try {
      const dataUrl = `data:${finalMimeType};base64,${cleanBase64}`;
      const response = await axios.post(
        'https://api.x.ai/v1/chat/completions',
        {
          model: 'grok-2-vision-1212',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: `${groundedPrompt}\n\nCRITICAL: Respond in STRICT RAW JSON.` },
              { type: 'image_url', image_url: { url: dataUrl } }
            ]
          }],
          temperature: 0.1,
          max_tokens: 1500
        },
        { headers: { 'Authorization': `Bearer ${grokKey}`, 'Content-Type': 'application/json' }, timeout: 25000 }
      );

      const content = response.data?.choices?.[0]?.message?.content || '';
      const parsed = parseJsonObject(content);
      if (isUsableVisionResult(parsed)) return parsed;
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

  const grokKey = getGrokApiKey();
  if (grokKey) {
    try {
      const response = await axios.post(
        'https://api.x.ai/v1/chat/completions',
        {
          model: 'grok-2',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
          temperature: 0.3
        },
        { headers: { 'Authorization': `Bearer ${grokKey}`, 'Content-Type': 'application/json' }, timeout: 15000 }
      );
      return response.data?.choices?.[0]?.message?.content || null;
    } catch (e: any) {
      console.warn('Grok chat error:', e?.message);
    }
  }

  const geminiKey = getGeminiApiKey();
  if (geminiKey) {
    const modelsToTry = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-1.5-flash'];
    for (const modelName of modelsToTry) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(`${systemPrompt}\n\nUser Question: ${userMessage}`);
        const text = result.response.text();
        if (text) return text;
      } catch (e: any) {
        console.warn(`Gemini chat (${modelName}) error:`, e?.message);
      }
    }
  }

  return null;
};
