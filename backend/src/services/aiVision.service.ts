import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

const getGrokApiKey = () => process.env.GROK_API_KEY || process.env.XAI_API_KEY || '';
const getGeminiApiKey = () => process.env.GEMINI_API_KEY || '';

/**
 * Unified Vision AI Engine
 * Supports xAI Grok 2 Vision and Google Gemini 1.5 Flash Vision
 */
export const runUnifiedVisionAnalysis = async (params: {
  prompt: string;
  imageBase64: string;
  mimeType?: string;
}): Promise<any | null> => {
  const { prompt, imageBase64, mimeType = 'image/jpeg' } = params;
  const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  const dataUrl = `data:${mimeType};base64,${cleanBase64}`;

  // 1. Try xAI Grok 2 Vision if GROK_API_KEY is configured
  const grokKey = getGrokApiKey();
  if (grokKey) {
    try {
      console.log('🚀 Running Vision Analysis via xAI Grok 2 Vision...');
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

  // 2. Try Google Gemini 1.5 Flash Vision if GEMINI_API_KEY is configured
  const geminiKey = getGeminiApiKey();
  if (geminiKey) {
    try {
      console.log('✨ Running Vision Analysis via Google Gemini 1.5 Flash...');
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const imagePart = { inlineData: { data: cleanBase64, mimeType } };

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text() || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (geminiErr: any) {
      console.warn('⚠️ Gemini Vision error:', geminiErr?.message);
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
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(`${systemPrompt}\n\nUser Question: ${userMessage}`);
      const response = await result.response;
      return response.text() || null;
    } catch (e: any) {
      console.warn('Gemini chat error:', e?.message);
    }
  }

  return null;
};
