import axios from 'axios';
import { GoogleGenAI } from '@google/genai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const getGeminiKey = () => process.env.GEMINI_API_KEY || '';
const getGenAI = () => {
  const key = getGeminiKey();
  return key ? new GoogleGenerativeAI(key) : null;
};
const getGoogleGenAI = () => {
  const key = getGeminiKey();
  return key ? new GoogleGenAI({ apiKey: key, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } }) : null;
};

export interface PackagedAnalysisResult {
  productName: string;
  brandName?: string;
  nutrition: {
    calories: number;
    proteins: number;
    carbs: number;
    fats: number;
    sugar: number;
    sodium: number; // in mg
    saturatedFat: number;
  };
  healthHighlights: Array<{
    type: 'warning' | 'info' | 'good';
    label: string;
    description: string;
  }>;
  ingredients: string[];
  detectedAllergens: string[];
  additives: Array<{
    code: string;
    name: string;
    safety: 'Safe' | 'Use in Moderation' | 'Avoid';
    explanation: string;
  }>;
  summary: string;
  rawOcrText: string;
}

export interface MealAnalysisResult {
  productName: string;
  items: Array<{
    name: string;
    estimatedPortion: string;
    calories: number;
  }>;
  nutrition: {
    totalCalories: number;
    proteins: number;
    carbs: number;
    fats: number;
    fiber?: number;
  };
  confidenceScore: number;
  estimationDisclaimer: string;
  likelyIngredients: string[];
  healthSummary: string;
}

export interface QualityAnalysisResult {
  status: 'NO_OBVIOUS_ISSUES' | 'POSSIBLE_ISSUE_DETECTED' | 'UNABLE_TO_DETERMINE';
  confidenceScore: number;
  visibleIssues: string[];
  safetyDisclaimer: string;
  assessmentNotes: string;
}

// Safety disclaimer constants required by specification
export const SAFETY_DISCLAIMERS = {
  NO_VISIBLE_ISSUES: "No obvious visible signs of spoilage were detected. Note: Visual inspection cannot detect invisible bacteria, viruses, toxins, or chemical contamination.",
  POSSIBLE_ISSUE: "Possible visible issue detected (e.g., discoloration, mold, or packaging defect). Do not consume if suspicious.",
  UNABLE_TO_DETERMINE: "Unable to determine food quality or safety from the provided image.",
  ESTIMATED_NUTRITION_NOTICE: "All caloric, portion, and nutrient values are estimates based on visual computer vision models."
};

export interface NormalizedImage {
  cleanBase64: string;
  mimeType: string;
}

/**
 * Normalizes a Base64 input string by stripping data URI scheme (if present),
 * extracting and preserving the MIME type, and cleaning internal whitespace.
 */
export function normalizeBase64Image(rawInput: string, fallbackMime: string = 'image/jpeg'): NormalizedImage {
  if (!rawInput || typeof rawInput !== 'string') {
    throw new Error('Food image analysis failed. Please try again.');
  }

  let str = rawInput.trim();
  let mimeType = fallbackMime;

  const match = str.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/s);
  if (match) {
    mimeType = match[1].toLowerCase();
    str = match[2];
  } else if (str.startsWith('data:')) {
    const commaIndex = str.indexOf(',');
    if (commaIndex !== -1) {
      const header = str.substring(0, commaIndex);
      const mimeMatch = header.match(/^data:([^;]+)/);
      if (mimeMatch) {
        mimeType = mimeMatch[1].toLowerCase();
      }
      str = str.substring(commaIndex + 1);
    }
  }

  const cleanBase64 = str.replace(/\s+/g, '');
  if (!cleanBase64) {
    throw new Error('Food image analysis failed. Please try again.');
  }

  return { cleanBase64, mimeType };
}

/**
 * Normalizes an image input string, whether raw Base64, data URI, or remote HTTP URL.
 */
export async function normalizeImageInput(
  rawInput: string,
  fallbackMime: string = 'image/jpeg'
): Promise<NormalizedImage> {
  if (!rawInput || typeof rawInput !== 'string') {
    throw new Error('Food image analysis failed. Please try again.');
  }

  let str = rawInput.trim();
  let mimeType = fallbackMime;

  // Handle remote HTTP/HTTPS URL
  if (str.startsWith('http://') || str.startsWith('https://')) {
    try {
      const cleanUrl = str.split('#')[0];
      const response = await axios.get(cleanUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: { Accept: 'image/*' }
      });
      const headerMime = String(response.headers['content-type'] || '');
      if (headerMime.startsWith('image/')) {
        mimeType = headerMime.split(';')[0].trim().toLowerCase();
      }
      const buffer = Buffer.from(response.data);
      const cleanBase64 = buffer.toString('base64');
      return { cleanBase64, mimeType };
    } catch (urlErr: any) {
      console.warn('[Safe Debug] Failed to fetch remote image:', urlErr?.message);
      throw new Error('Food image analysis failed. Please try again.');
    }
  }

  return normalizeBase64Image(rawInput, fallbackMime);
}

export function logSafeDebug(info: {
  scanType: string;
  mimeType: string;
  base64Length: number;
  geminiStatus?: string;
  parseError?: string;
}) {
  console.log(`[Safe Debug] Scan Type: ${info.scanType}`);
  console.log(`[Safe Debug] Image MIME: ${info.mimeType}, Base64 Length: ${info.base64Length} chars`);
  if (info.geminiStatus) {
    console.log(`[Safe Debug] Gemini Response Status: ${info.geminiStatus}`);
  }
  if (info.parseError) {
    console.warn(`[Safe Debug] Parsing Error: ${info.parseError}`);
  }
}

const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];

export const analyzePackagedFoodImage = async (
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<PackagedAnalysisResult> => {
  const normalized = await normalizeImageInput(imageBase64, mimeType);
  logSafeDebug({
    scanType: 'PACKAGED_FOOD',
    mimeType: normalized.mimeType,
    base64Length: normalized.cleanBase64.length
  });

  const modernAI = getGoogleGenAI();
  const legacyAI = getGenAI();

  if (!modernAI && !legacyAI) {
    console.error('[Safe Debug] Gemini API Key is missing');
    throw new Error('Food image analysis failed. Gemini API key is missing.');
  }

  const prompt = `You are an expert AI food scientist. Analyze the food packaging image(s). Extract text (OCR), ingredients, nutrition facts, and additives. Return STRICT JSON with keys:
{
  "productName": "string",
  "brandName": "string",
  "nutrition": { "calories": 0, "proteins": 0, "carbs": 0, "fats": 0, "sugar": 0, "sodium": 0, "saturatedFat": 0 },
  "healthHighlights": [{ "type": "warning"|"info"|"good", "label": "string", "description": "string" }],
  "ingredients": ["string"],
  "detectedAllergens": ["string"],
  "additives": [{ "code": "E300", "name": "Ascorbic Acid", "safety": "Safe"|"Use in Moderation"|"Avoid", "explanation": "Simple language explanation" }],
  "summary": "Plain English summary of nutritional profile",
  "rawOcrText": "Extracted text string"
}`;

  const imagePart = {
    inlineData: {
      data: normalized.cleanBase64,
      mimeType: normalized.mimeType
    }
  };

  const errors: string[] = [];

  for (const modelName of GEMINI_MODELS) {
    let attempts = 0;
    while (attempts < 2) {
      attempts++;
      try {
        let text = '';
        if (modernAI) {
          const res = await modernAI.models.generateContent({
            model: modelName,
            contents: [prompt, imagePart],
            config: { responseMimeType: 'application/json' }
          });
          text = (res.text || '').trim();
        } else if (legacyAI) {
          const model = legacyAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: 'application/json' }
          });
          const result = await model.generateContent([prompt, imagePart]);
          const response = await result.response;
          text = (response.text() || '').trim();
        }

        logSafeDebug({
          scanType: 'PACKAGED_FOOD',
          mimeType: normalized.mimeType,
          base64Length: normalized.cleanBase64.length,
          geminiStatus: `HTTP 200 OK (${modelName})`
        });

        try {
          return JSON.parse(text);
        } catch (e) {
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
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        errors.push(`${modelName}: ${errMsg}`);
        console.warn(`[Safe Debug] Gemini Vision (${modelName}, attempt ${attempts}) failed:`, errMsg);
        if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('429')) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        break;
      }
    }
  }

  throw new Error(`Food image analysis failed: ${errors.join(' | ')}`);
};

export const analyzeMealImage = async (
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<MealAnalysisResult> => {
  const normalized = await normalizeImageInput(imageBase64, mimeType);
  logSafeDebug({
    scanType: 'MEAL',
    mimeType: normalized.mimeType,
    base64Length: normalized.cleanBase64.length
  });

  const modernAI = getGoogleGenAI();
  const legacyAI = getGenAI();

  if (!modernAI && !legacyAI) {
    console.error('[Safe Debug] Gemini API Key is missing');
    throw new Error('Food image analysis failed. Gemini API key is missing.');
  }

  const prompt = `You are an AI nutrition expert. Analyze this photo of restaurant or homemade food. Identify items, estimate portion sizes, calories, and macronutrients. Return STRICT JSON with keys:
{
  "productName": "Main dish name",
  "items": [{ "name": "Item name", "estimatedPortion": "e.g. 150g", "calories": 250 }],
  "nutrition": { "totalCalories": 550, "proteins": 35, "carbs": 50, "fats": 20, "fiber": 6 },
  "confidenceScore": 0.88,
  "estimationDisclaimer": "${SAFETY_DISCLAIMERS.ESTIMATED_NUTRITION_NOTICE}",
  "likelyIngredients": ["ingredient 1", "ingredient 2"],
  "healthSummary": "High protein balanced meal with moderate carbs."
}`;

  const imagePart = {
    inlineData: {
      data: normalized.cleanBase64,
      mimeType: normalized.mimeType
    }
  };

  const errors: string[] = [];

  for (const modelName of GEMINI_MODELS) {
    let attempts = 0;
    while (attempts < 2) {
      attempts++;
      try {
        let text = '';
        if (modernAI) {
          const res = await modernAI.models.generateContent({
            model: modelName,
            contents: [prompt, imagePart],
            config: { responseMimeType: 'application/json' }
          });
          text = (res.text || '').trim();
        } else if (legacyAI) {
          const model = legacyAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: 'application/json' }
          });
          const result = await model.generateContent([prompt, imagePart]);
          const response = await result.response;
          text = (response.text() || '').trim();
        }

        logSafeDebug({
          scanType: 'MEAL',
          mimeType: normalized.mimeType,
          base64Length: normalized.cleanBase64.length,
          geminiStatus: `HTTP 200 OK (${modelName})`
        });

        try {
          return JSON.parse(text);
        } catch (e) {
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
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        errors.push(`${modelName}: ${errMsg}`);
        console.warn(`[Safe Debug] Gemini Meal Vision (${modelName}, attempt ${attempts}) failed:`, errMsg);
        if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('429')) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        break;
      }
    }
  }

  throw new Error(`Food image analysis failed: ${errors.join(' | ')}`);
};

export const analyzeVisualQualityImage = async (
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<QualityAnalysisResult> => {
  const normalized = await normalizeImageInput(imageBase64, mimeType);
  logSafeDebug({
    scanType: 'QUALITY_INSPECTION',
    mimeType: normalized.mimeType,
    base64Length: normalized.cleanBase64.length
  });

  const modernAI = getGoogleGenAI();
  const legacyAI = getGenAI();

  if (!modernAI && !legacyAI) {
    console.error('[Safe Debug] Gemini API Key is missing');
    throw new Error('Food image analysis failed. Gemini API key is missing.');
  }

  const prompt = `You are an AI visual food quality inspector. Check ONLY visible signs of spoilage (mold, unusual discoloration, foreign objects, packaging tearing/dents).
IMPORTANT: NEVER claim food is definitely safe, hygienic, or free from invisible bacteria/toxins.
Return STRICT JSON:
{
  "status": "NO_OBVIOUS_ISSUES" | "POSSIBLE_ISSUE_DETECTED" | "UNABLE_TO_DETERMINE",
  "confidenceScore": 0.92,
  "visibleIssues": ["e.g. Minor surface bruising on fruit skin"],
  "safetyDisclaimer": "Standard disclaimer text",
  "assessmentNotes": "Observation notes"
}`;

  const imagePart = {
    inlineData: {
      data: normalized.cleanBase64,
      mimeType: normalized.mimeType
    }
  };

  const errors: string[] = [];

  for (const modelName of GEMINI_MODELS) {
    let attempts = 0;
    while (attempts < 2) {
      attempts++;
      try {
        let text = '';
        if (modernAI) {
          const res = await modernAI.models.generateContent({
            model: modelName,
            contents: [prompt, imagePart],
            config: { responseMimeType: 'application/json' }
          });
          text = (res.text || '').trim();
        } else if (legacyAI) {
          const model = legacyAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: 'application/json' }
          });
          const result = await model.generateContent([prompt, imagePart]);
          const response = await result.response;
          text = (response.text() || '').trim();
        }

        logSafeDebug({
          scanType: 'QUALITY_INSPECTION',
          mimeType: normalized.mimeType,
          base64Length: normalized.cleanBase64.length,
          geminiStatus: `HTTP 200 OK (${modelName})`
        });

        let res: any = null;
        try {
          res = JSON.parse(text);
        } catch (e) {
          const cleanText = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
          try {
            res = JSON.parse(cleanText);
          } catch (e2) {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              res = JSON.parse(jsonMatch[0]);
            }
          }
        }

        if (res) {
          if (res.status === 'NO_OBVIOUS_ISSUES') {
            res.safetyDisclaimer = SAFETY_DISCLAIMERS.NO_VISIBLE_ISSUES;
          } else if (res.status === 'POSSIBLE_ISSUE_DETECTED') {
            res.safetyDisclaimer = SAFETY_DISCLAIMERS.POSSIBLE_ISSUE;
          } else {
            res.safetyDisclaimer = SAFETY_DISCLAIMERS.UNABLE_TO_DETERMINE;
          }
          return res;
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        errors.push(`${modelName}: ${errMsg}`);
        console.warn(`[Safe Debug] Gemini Quality Vision (${modelName}, attempt ${attempts}) failed:`, errMsg);
        if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('429')) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        break;
      }
    }
  }

  throw new Error(`Food image analysis failed: ${errors.join(' | ')}`);
};
