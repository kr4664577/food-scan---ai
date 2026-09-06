export type ScreenType =
  | 'SPLASH'
  | 'ONBOARDING'
  | 'AUTH'
  | 'DASHBOARD'
  | 'SCAN_SELECTION'
  | 'CAMERA'
  | 'IMAGE_PREVIEW'
  | 'AI_PROCESSING'
  | 'PACKAGED_REPORT'
  | 'MEAL_REPORT'
  | 'QUALITY_REPORT'
  | 'HISTORY'
  | 'FAVORITES'
  | 'PROFILE'
  | 'SETTINGS'
  | 'PRIVACY';

export type ScanMode = 'PACKAGED_BARCODE' | 'PACKAGED_PHOTO' | 'MEAL_PHOTO' | 'QUALITY_CHECK';

export type FoodCategory = 'HOME_FOOD' | 'RESTAURANT_FOOD' | 'OUTSIDE_PACKAGED' | 'FRUITS' | 'VEGETABLES';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  dietaryGoals?: string;
  allergies: string[];
}

export interface PackagedFoodAnalysis {
  productName: string;
  brandName?: string;
  barcode?: string;
  nutrition: {
    calories: number;
    proteins: number;
    carbs: number;
    fats: number;
    sugar: number;
    sodium: number;
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
  rawOcrText?: string;
  nutritionScore?: string;
  
  // Phase 2 Packaged Intelligence Fields
  confidence?: {
    productName: number;
    ingredients: number;
    nutrition: number;
    allergens: number;
    overall: number;
  };
  sources?: {
    productName: 'PACKAGE_OCR' | 'EXTERNAL_DATABASE' | 'AI_ESTIMATE';
    brandName: 'PACKAGE_OCR' | 'EXTERNAL_DATABASE' | 'AI_ESTIMATE';
    ingredients: 'PACKAGE_OCR' | 'EXTERNAL_DATABASE' | 'AI_ESTIMATE';
    nutrition: 'PACKAGE_OCR' | 'EXTERNAL_DATABASE' | 'AI_ESTIMATE';
    allergens: 'PACKAGE_OCR' | 'EXTERNAL_DATABASE' | 'AI_ESTIMATE';
    additives: 'PACKAGE_OCR' | 'EXTERNAL_DATABASE' | 'AI_ESTIMATE';
  };
  missingFields?: string[];
  uncertaintyWarnings?: string[];
  isValidated?: boolean;
}

export interface IdentifiedFoodItem {
  name: string;
  estimatedPortion: string;
  confidence: number;
  isEstimated: boolean;
  dataSource: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
  };
}

export interface MealFoodAnalysis {
  detectedDishName: string;
  items: IdentifiedFoodItem[];
  
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
  };
  
  confidence: {
    itemsRecognition: number;
    portionVolume: number;
    totalNutrition: number;
    overall: number;
  };
  
  isEstimated: boolean;
  primaryDataSource: string;
  estimationDisclaimer: string;
  likelyIngredients: string[];
  healthSummary: string;
}

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

export interface QualityAnalysis {
  statusCategory: QualityResultCategory;
  overallConfidence: number;
  detectedIssues: QualityIssueDetail[];
  mandatoryDisclaimer: string;
  assessmentNotes: string;
  modelEngineProvider?: string;
  // Backward compatibility
  status?: string;
  confidenceScore?: number;
}

export interface ScanItem {
  id: string;
  scanType: 'PACKAGED' | 'MEAL' | 'QUALITY_INSPECTION';
  productName: string;
  brandName?: string;
  calories?: number;
  createdAt: string;
  isFavorite?: boolean;
  scanData?: PackagedFoodAnalysis | MealFoodAnalysis | QualityAnalysis;
}

export const SAFETY_DISCLAIMERS = {
  NO_VISIBLE_ISSUES: "No obvious visible signs of spoilage were detected. Note: Visual inspection cannot detect invisible bacteria, viruses, toxins, or chemical contamination.",
  POSSIBLE_ISSUE: "Possible visible issue detected (e.g., discoloration, mold, or packaging defect). Do not consume if suspicious.",
  UNABLE_TO_DETERMINE: "Unable to determine food quality or safety from the provided image.",
  ESTIMATED_NUTRITION_NOTICE: "All caloric, portion, and nutrient values are estimates based on visual computer vision models."
};

