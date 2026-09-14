import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Exact Final Result Categories Required by Specification
export type QualityResultCategory =
  | 'No obvious visible issue detected'
  | 'Possible visible issue detected'
  | 'Unable to determine';

export type ObservableIssueType =
  | 'MOLD_LIKE_APPEARANCE'
  | 'UNUSUAL_DISCOLORATION'
  | 'VISIBLE_INSECTS'
  | 'FOREIGN_OBJECTS'
  | 'OBVIOUS_SPOILAGE'
  | 'DAMAGED_PACKAGING'
  | 'NONE';

export interface QualityIssueDetail {
  issue_type: ObservableIssueType;
  confidence: number;
  affected_area?: string;
  explanation: string;
  limitations: string;
}

export interface QualityIntelligenceResult {
  statusCategory: QualityResultCategory;
  overallConfidence: number;
  detectedIssues: QualityIssueDetail[];
  mandatoryDisclaimer: string;
  assessmentNotes: string;
  modelEngineProvider: string;
}

export const MANDATORY_MICROORGANISM_DISCLAIMER =
  "CRITICAL SAFETY WARNING: Visual image analysis evaluates surface optical indicators only. It CANNOT detect invisible microorganisms (such as Salmonella, E. coli, Botulinum), bacterial toxins, viral pathogens, or chemical contamination. Always follow standard food safety and hygiene guidelines.";

// Prohibited wording filter to strictly enforce safety compliance
const BANNED_PHRASES = [
  /100%\s*safe/gi,
  /completely\s*hygienic/gi,
  /free\s*from\s*bacteria/gi,
  /safe\s*to\s*eat/gi,
  /guaranteed\s*fresh/gi
];

export const sanitizeQualityOutput = (text: string): string => {
  let sanitized = text;
  BANNED_PHRASES.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "[no obvious visible defects observed]");
  });
  return sanitized;
};

/**
 * Modular Computer Vision Model Architecture Interface
 * Allows replacing Gemini Vision with a custom-trained PyTorch / TensorFlow / YOLO model
 */
export interface IVisualQualityModelEngine {
  providerName: string;
  analyze(imageBase64: string, mimeType?: string): Promise<QualityIntelligenceResult>;
}

/**
 * Gemini Multi-Modal Implementation of IVisualQualityModelEngine
 */
import { normalizeBase64Image, logSafeDebug } from './ai.service';

export class GeminiQualityModelEngine implements IVisualQualityModelEngine {
  providerName = "Gemini Multi-Modal Vision Quality Engine (Pluggable CV Architecture)";

  async analyze(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<QualityIntelligenceResult> {
    if (!genAI || !imageBase64) {
      throw new Error('Food image analysis failed. Please try again.');
    }

    const { cleanBase64, mimeType: finalMimeType } = normalizeBase64Image(imageBase64, mimeType);
    logSafeDebug({
      scanType: 'QUALITY_INSPECTION',
      mimeType: finalMimeType,
      base64Length: cleanBase64.length
    });

    const prompt = `You are a certified AI visual food quality inspector.
Analyze ONLY visually observable surface issues.
Possible categories:
- Mold-like appearance (MOLD_LIKE_APPEARANCE)
- Unusual discoloration (UNUSUAL_DISCOLORATION)
- Visible insects (VISIBLE_INSECTS)
- Foreign objects (FOREIGN_OBJECTS)
- Obvious spoilage (OBVIOUS_SPOILAGE)
- Damaged food packaging (DAMAGED_PACKAGING)

STRICT RULE 1: You MUST choose EXACTLY one of these 3 final result categories for statusCategory:
1. "No obvious visible issue detected"
2. "Possible visible issue detected"
3. "Unable to determine"

STRICT RULE 2: NEVER use phrases like "100% safe", "Completely hygienic", "Free from bacteria", or "Safe to eat".

Return STRICT JSON ONLY (no markdown codeblock) matching schema:
{
  "statusCategory": "No obvious visible issue detected" | "Possible visible issue detected" | "Unable to determine",
  "overallConfidence": 0.92,
  "detectedIssues": [
    {
      "issue_type": "MOLD_LIKE_APPEARANCE"|"UNUSUAL_DISCOLORATION"|"VISIBLE_INSECTS"|"FOREIGN_OBJECTS"|"OBVIOUS_SPOILAGE"|"DAMAGED_PACKAGING"|"NONE",
      "confidence": 0.88,
      "affected_area": "e.g. Upper surface area / Seal boundary",
      "explanation": "Human readable visual observation",
      "limitations": "Visual checks cannot inspect internal core or microbial safety"
    }
  ],
  "assessmentNotes": "Observation summary notes"
}`;

    const imagePart = { inlineData: { data: cleanBase64, mimeType: finalMimeType } };
    const modelsToTry = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.5-flash'];

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text() || '';

        logSafeDebug({
          scanType: 'QUALITY_INSPECTION',
          mimeType: finalMimeType,
          base64Length: cleanBase64.length,
          geminiStatus: `HTTP 200 OK (${modelName})`
        });

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            return this.formatAndSanitizeResult(parsed);
          } catch (parseErr: any) {
            logSafeDebug({
              scanType: 'QUALITY_INSPECTION',
              mimeType: finalMimeType,
              base64Length: cleanBase64.length,
              parseError: parseErr.message
            });
          }
        }
      } catch (err: any) {
        console.warn(`[Safe Debug] Gemini Quality Vision (${modelName}) failed:`, err.message || err);
      }
    }

    throw new Error('Food image analysis failed. Please try again.');
  }

  private formatAndSanitizeResult(raw: any): QualityIntelligenceResult {
    let category: QualityResultCategory = "Unable to determine";
    if (raw.statusCategory === "No obvious visible issue detected" || raw.statusCategory === "NO_OBVIOUS_ISSUES") {
      category = "No obvious visible issue detected";
    } else if (raw.statusCategory === "Possible visible issue detected" || raw.statusCategory === "POSSIBLE_ISSUE_DETECTED") {
      category = "Possible visible issue detected";
    }

    const sanitizedNotes = sanitizeQualityOutput(raw.assessmentNotes || "");

    const detectedIssues: QualityIssueDetail[] = (raw.detectedIssues || []).map((issue: any) => ({
      issue_type: issue.issue_type || "NONE",
      confidence: issue.confidence || 0.90,
      affected_area: issue.affected_area || "Visible surface",
      explanation: sanitizeQualityOutput(issue.explanation || "Visual surface observation"),
      limitations: sanitizeQualityOutput(
        issue.limitations || "Image analysis cannot inspect internal bacterial or viral safety."
      )
    }));

    return {
      statusCategory: category,
      overallConfidence: raw.overallConfidence || 0.91,
      detectedIssues,
      mandatoryDisclaimer: MANDATORY_MICROORGANISM_DISCLAIMER,
      assessmentNotes: sanitizedNotes,
      modelEngineProvider: this.providerName
    };
  }
}

/**
 * Quality Inspection Engine Factory
 * Allows replacing Gemini Vision with a custom-trained PyTorch / TensorFlow CV model at runtime
 */
export class QualityInspectionEngineFactory {
  private static activeEngine: IVisualQualityModelEngine = new GeminiQualityModelEngine();

  public static getEngine(): IVisualQualityModelEngine {
    return this.activeEngine;
  }

  public static setEngine(customEngine: IVisualQualityModelEngine): void {
    this.activeEngine = customEngine;
  }
}
