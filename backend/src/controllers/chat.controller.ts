import { Request, Response } from 'express';
import { runUnifiedChat } from '../services/aiVision.service';
import { findFoodInCatalog, FOOD_MASTER_CATALOG } from '../db/foodCatalog';

export const handleNutritionChat = async (req: Request, res: Response) => {
  try {
    const { message, currentFoodContext, chatHistory } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: { message: 'Message is required.' } });
    }

    const queryLower = message.toLowerCase().trim();

    // Check if query is asking for healthier swaps or alternatives
    let recommendedSwaps: any[] = [];
    if (queryLower.includes('swap') || queryLower.includes('alternative') || queryLower.includes('healthy choice') || queryLower.includes('better')) {
      if (currentFoodContext?.detectedDishName || currentFoodContext?.productName) {
        const foodName = currentFoodContext.detectedDishName || currentFoodContext.productName;
        const matched = findFoodInCatalog(foodName);
        if (matched && matched.healthySwaps && matched.healthySwaps.length > 0) {
          recommendedSwaps = matched.healthySwaps;
        }
      }
      if (recommendedSwaps.length === 0) {
        recommendedSwaps = [
          { name: 'Organic Whole Grain Oats Cookies', brand: 'NutriChoice Clean', calories: 310, rating: 4.6, reason: 'Zero palm oil, 70% less sugar & high oat fiber.' },
          { name: 'Roasted Multigrain Makhana / Foxnuts', brand: 'Farm Fresh', calories: 180, rating: 4.9, reason: 'Zero added sugar, high plant protein.' }
        ];
      }
    }

    // Run Grok / Gemini AI if API Key is configured
    const contextPrompt = currentFoodContext
      ? `Current Food Scanned: ${JSON.stringify(currentFoodContext)}. `
      : '';

    const systemPrompt = `You are FoodScan AI's expert certified clinical nutritionist and food scientist.
${contextPrompt}
Instructions:
1. Provide a warm, concise, scientifically accurate answer (max 3-4 bullet points or short paragraphs).
2. If the user asks about diabetes, hypertension, weight loss, or ingredients, give direct practical health guidance.
3. If the food has high sugar, palm oil, or NOVA 4 status, recommend clean alternatives.
4. Keep the tone helpful, encouraging, and medical-grade yet easy to understand for everyday shoppers.`;

    const aiReply = await runUnifiedChat({ systemPrompt, userMessage: message });
    if (aiReply) {
      return res.status(200).json({
        success: true,
        data: {
          reply: aiReply,
          suggestions: [
            "What is a healthier alternative?",
            "Is this safe for diabetics?",
            "How to burn these calories?",
            "Can I eat this daily?"
          ],
          recommendedSwaps: recommendedSwaps.length > 0 ? recommendedSwaps : undefined
        }
      });
    }

    // Built-in Expert Nutrition Rule Engine Fallback
    let reply = '';
    const foodTitle = currentFoodContext?.detectedDishName || currentFoodContext?.productName || 'this food';
    const isHighSugar = currentFoodContext?.nutrition?.sugar > 15 || currentFoodContext?.totalNutrition?.sugar > 15;
    const isUltraProcessed = currentFoodContext?.novaGroup?.level === 4;

    if (queryLower.includes('diabet') || queryLower.includes('sugar') || queryLower.includes('glucose')) {
      reply = isHighSugar
        ? `⚠️ **Diabetic Notice for ${foodTitle}**:\nThis item contains significant simple sugars which can trigger a rapid blood sugar spike. Diabetics should limit portion size or switch to fiber-rich whole grain or vegetable alternatives.`
        : `✅ **Diabetic Assessment for ${foodTitle}**:\nThis food is relatively low in refined sugar. Its complex carbohydrates and fiber help prevent sudden glucose spikes. Safe in moderate portions.`;
    } else if (queryLower.includes('swap') || queryLower.includes('alternative') || queryLower.includes('better')) {
      reply = `🔄 **Recommended Healthier Alternatives for ${foodTitle}**:\n• Swap to items with zero palm oil, less than 5g added sugar, and higher whole-grain fiber.\n• See the recommended clean choices below!`;
    } else if (queryLower.includes('calorie') || queryLower.includes('burn') || queryLower.includes('exercise')) {
      const cals = currentFoodContext?.nutrition?.calories || currentFoodContext?.totalNutrition?.calories || 350;
      const walkMins = Math.round((cals / 4));
      reply = `🏃 **Calorie Burn Estimate for ${foodTitle} (~${cals} kcal)**:\n• ~${walkMins} minutes of brisk walking (5 km/h)\n• ~${Math.round(cals / 8)} minutes of moderate cycling\n• ~${Math.round(cals / 10)} minutes of jogging`;
    } else if (queryLower.includes('weight') || queryLower.includes('fat') || queryLower.includes('diet')) {
      reply = isUltraProcessed
        ? `⚖️ **Weight Management Guide**:\n${foodTitle} is classified as an Ultra-Processed Food (NOVA 4). For effective weight loss or maintenance, replace it with minimally processed home-cooked meals or fresh fruit salads.`
        : `⚖️ **Weight Management Guide**:\n${foodTitle} provides good satiety and balanced nutrients. Track your total daily calories and stay hydrated!`;
    } else {
      reply = `🥗 **Nutrition Analysis for ${foodTitle}**:\n${foodTitle} provides balanced energy and nutrients. Always pair packaged items with natural hydration (water/coconut water) and fresh green salads for optimal digestive absorption.`;
    }

    return res.status(200).json({
      success: true,
      data: {
        reply,
        suggestions: [
          "Is this safe for diabetics?",
          "Suggest a healthier alternative",
          "How many minutes of walking to burn this?",
          "What are the main ingredients?"
        ],
        recommendedSwaps: recommendedSwaps.length > 0 ? recommendedSwaps : undefined
      }
    });
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to process chat query.', details: error?.message }
    });
  }
};
