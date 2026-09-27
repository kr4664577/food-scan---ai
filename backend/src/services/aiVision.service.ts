import axios from 'axios';
import { GoogleGenAI } from '@google/genai';
import { timeScan, logScanFailure, scanAbortSignal } from '../middlewares/scanTiming';
import { normalizeImageInput } from './ai.service';
import { AIProviderError, classifyProviderError, isModelUnavailable, providerHttpStatus } from './providerErrors';
import { retryAfterSeconds, runProviderAttempt, waitForProviderRetry, providerRetryDelay, VISION_DEADLINE_MS, MAX_PROVIDER_CALLS, MAX_TRANSIENT_RETRIES } from './providerRetry';

const getGrokApiKey = () => process.env.GROK_API_KEY || process.env.XAI_API_KEY || '';
const getGeminiApiKey = () => process.env.GEMINI_API_KEY || '';
let client: GoogleGenAI | undefined;
let clientKey: string | undefined;
const cooldowns = new WeakMap<GoogleGenAI, { until: number; code: 'AI_QUOTA_EXCEEDED' | 'AI_TEMPORARY_ERROR' }>();
const visionClient = (apiKey: string) => {
  if (!client || clientKey !== apiKey) {
    clientKey = apiKey;
    client = new GoogleGenAI({ apiKey, httpOptions: {
      headers: { 'User-Agent': 'aistudio-build' }, retryOptions: { attempts: 1 },
      fetch: async (input, init) => {
        const response = await globalThis.fetch(input, init);
        // SDK errors omit headers. Retain only safe retry metadata.
        if ([429, 500, 502, 503].includes(response.status) && retryAfterSeconds({ headers: response.headers })) {
          await response.body?.cancel();
          throw Object.assign(new Error('Provider requested a cooldown.'), { status: response.status, headers: { 'retry-after': response.headers.get('retry-after') } });
        }
        return response;
      }
    } });
  }
  return client;
};
// Preserve model preference/quality. Only model-unavailable errors advance it.
const GEMINI_VISION_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];

function parseVisionResponse(text: unknown): Record<string, any> {
  if (typeof text !== 'string' || !text.trim()) throw new AIProviderError('AI_INVALID_RESPONSE');
  const cleaned = text.trim().replace(/^\`\`\`(?:json)?\s*/i, '').replace(/\s*\`\`\`$/i, '');
  try {
    const result = JSON.parse(cleaned);
    if (!result || typeof result !== 'object' || Array.isArray(result) || !Object.keys(result).length) throw new Error();
    return result;
  } catch { throw new AIProviderError('AI_INVALID_RESPONSE'); }
}

export const runUnifiedVisionAnalysis = async (params: {
  prompt: string; imageBase64: string; mimeType?: string; scanType?: string; signal?: AbortSignal;
}): Promise<any> => {
  const started = Date.now(), deadlineAt = started + VISION_DEADLINE_MS;
  const signal = params.signal || scanAbortSignal();
  if (signal?.aborted) throw new AIProviderError('AI_TIMEOUT');
  const geminiKey = getGeminiApiKey();
  const modernAI = geminiKey ? visionClient(geminiKey) : undefined;
  const cooldown = modernAI && cooldowns.get(modernAI);
  if (cooldown && cooldown.until > Date.now()) throw new AIProviderError(cooldown.code, { retryAfterSeconds: Math.ceil((cooldown.until - Date.now()) / 1000) });
  let normalized;
  try { normalized = await timeScan('normalize', () => normalizeImageInput(params.imageBase64, params.mimeType || 'image/jpeg')); }
  catch { throw Object.assign(new Error('This image could not be read. Please choose a clear photo.'), { code: 'INVALID_IMAGE', statusCode: 400, retryable: false, publicMessage: 'This image could not be read. Please choose a clear photo.' }); }
  const { cleanBase64, mimeType } = normalized;
  let calls = 0, retries = 0;
  if (modernAI) {
    for (const model of GEMINI_VISION_MODELS) {
      while (calls < MAX_PROVIDER_CALLS) {
        calls++;
        try {
          const response = await timeScan('gemini', () => runProviderAttempt(abortSignal => modernAI.models.generateContent({
            model, contents: [{ inlineData: { mimeType, data: cleanBase64 } }, { text: params.prompt }],
            config: { responseMimeType: 'application/json', abortSignal }
          }), { deadlineAt, signal }));
          return await timeScan('ai_parse', async () => parseVisionResponse(response.text));
        } catch (raw) {
          const error = classifyProviderError(raw);
          logScanFailure({ category: error.category, httpStatus: providerHttpStatus(raw) || error.statusCode, provider: 'gemini', model, durationMs: Date.now() - started, retryCount: retries });
          if (error.code === 'AI_QUOTA_EXCEEDED' || error.retryAfterSeconds) {
            const seconds = error.retryAfterSeconds || 60;
            cooldowns.set(modernAI, { until: Date.now() + seconds * 1000, code: error.code === 'AI_QUOTA_EXCEEDED' ? error.code : 'AI_TEMPORARY_ERROR' });
            throw error;
          }
          if (isModelUnavailable(raw)) break;
          if (['AI_TEMPORARY_ERROR', 'AI_NETWORK_ERROR'].includes(error.code) && retries < MAX_TRANSIENT_RETRIES && calls < MAX_PROVIDER_CALLS) {
            try { await waitForProviderRetry(providerRetryDelay(retries++), deadlineAt, signal); }
            catch (deadlineError) { throw classifyProviderError(deadlineError); }
            continue;
          }
          throw error;
        }
      }
    }
  }
  // Existing opt-in xAI fallback remains only for unavailable Gemini models or
  // absent Gemini configuration. Never send a quota/failed-response retry to xAI.
  const grokKey = getGrokApiKey();
  if (grokKey && calls < MAX_PROVIDER_CALLS) {
    try {
      const response = await runProviderAttempt(abortSignal => axios.post('https://api.x.ai/v1/chat/completions', {
        model: 'grok-2-vision-1212',
        messages: [{ role: 'user', content: [
          { type: 'text', text: params.prompt + '\nReturn strict JSON only.' },
          { type: 'image_url', image_url: { url: 'data:' + mimeType + ';base64,' + cleanBase64 } }
        ] }], temperature: 0.1, max_tokens: 1500
      }, { headers: { Authorization: 'Bearer ' + grokKey, 'Content-Type': 'application/json' }, signal: abortSignal, timeout: Math.max(1, deadlineAt - Date.now()) }), { deadlineAt, signal });
      return parseVisionResponse(response.data?.choices?.[0]?.message?.content);
    } catch (raw) {
      const error = classifyProviderError(raw);
      logScanFailure({ category: error.category, httpStatus: providerHttpStatus(raw) || error.statusCode, provider: 'xai', model: 'grok-2-vision-1212', durationMs: Date.now() - started, retryCount: 0 });
      throw error;
    }
  }
  throw new AIProviderError('AI_UNKNOWN_ERROR');
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
