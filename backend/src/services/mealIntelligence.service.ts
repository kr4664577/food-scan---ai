import { runUnifiedVisionAnalysis } from './aiVision.service';

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

export interface MealIntelligenceResult {
  detectedDishName: string;
  items: IdentifiedFoodItem[];
  totalNutrition: IdentifiedFoodItem['nutrition'];
  confidence: { itemsRecognition:number; portionVolume:number; totalNutrition:number; overall:number };
  isEstimated: boolean;
  primaryDataSource: string;
  estimationDisclaimer: string;
  likelyIngredients: string[];
  healthSummary: string;
  uncertaintyWarnings?: string[];
}

export const MANDATORY_MEAL_DISCLAIMER = 'All caloric, portion, and nutrient values are visual AI estimations based on computer vision volume heuristics and food database references. They are not exact laboratory measurements.';

const n=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,v):0;
const c=(v:unknown)=>Math.max(0,Math.min(1,n(v)));
const normalizeItem=(item:any):IdentifiedFoodItem=>({
  name:typeof item?.name==='string'&&item.name.trim()?item.name.trim():'Unknown food item',
  estimatedPortion:typeof item?.estimatedPortion==='string'&&item.estimatedPortion.trim()?item.estimatedPortion.trim():'Portion not reliably estimated',
  confidence:c(item?.confidence),
  isEstimated:true,
  dataSource:typeof item?.dataSource==='string'&&item.dataSource.trim()?item.dataSource.trim():'AI Vision Estimate',
  nutrition:{calories:n(item?.nutrition?.calories),protein:n(item?.nutrition?.protein),carbs:n(item?.nutrition?.carbs),fat:n(item?.nutrition?.fat),fiber:n(item?.nutrition?.fiber),sugar:n(item?.nutrition?.sugar),sodium:n(item?.nutrition?.sodium)}
});

const validateNutrition=(item:IdentifiedFoodItem)=>{
  const warnings:string[]=[]; const x=item.nutrition;
  const estimatedCalories=4*x.protein+4*x.carbs+9*x.fat+2*x.fiber;
  if(x.calories>0&&estimatedCalories>0&&Math.abs(x.calories-estimatedCalories)/Math.max(x.calories,estimatedCalories)>0.45)warnings.push(`${item.name}: calories are inconsistent with reported macros`);
  if(x.saturatedFat>0&&x.fat>0&&x.saturatedFat>x.fat)warnings.push(`${item.name}: saturated fat exceeds total fat`);
  if(x.sugar>x.carbs&&x.carbs>0)warnings.push(`${item.name}: sugar exceeds carbohydrates`);
  return warnings;
};

const calculateTotals=(items:IdentifiedFoodItem[])=>items.reduce((a,i)=>({calories:a.calories+i.nutrition.calories,protein:a.protein+i.nutrition.protein,carbs:a.carbs+i.nutrition.carbs,fat:a.fat+i.nutrition.fat,fiber:a.fiber+i.nutrition.fiber,sugar:a.sugar+i.nutrition.sugar,sodium:a.sodium+i.nutrition.sodium}),{calories:0,protein:0,carbs:0,fat:0,fiber:0,sugar:0,sodium:0});

export const runMealIntelligencePipeline=async(params:{imageBase64:string;mimeType?:string;customDishName?:string;foodCategory?:string}):Promise<MealIntelligenceResult>=>{
  const {imageBase64,mimeType,customDishName,foodCategory}=params;
  const prompt=`You are a food computer-vision and nutrition estimation engine. Analyze ONLY the supplied image. Detect every visually distinct edible food item, including separate components on the same plate. Do not invent hidden ingredients or foods that cannot be visually supported.

Context: ${foodCategory==='HOME_FOOD'?'homemade home-cooked food':foodCategory==='OUTSIDE_PACKAGED'?'packaged/store-bought food':'restaurant or dining dish'}.
${customDishName?`User hint (not proof): ${customDishName}`:''}

MULTI-FOOD RULES:
- Return one item per distinct visible food component; do not collapse a mixed plate into one item when components can be separated.
- If two visually separate portions are the same food, combine them only when they clearly represent one serving.
- Give an image-grounded portion estimate using grams, ml, pieces, cups, tablespoons or another concrete unit when possible.
- Never claim an exact weight from a normal photograph. Set isEstimated=true.
- If portion size is uncertain, say so and lower portionVolume confidence.

NUTRITION RULES:
- Nutrition must correspond to the estimated portion, not an arbitrary 100g value. State the basis in estimatedPortion.
- Do not fabricate exact nutrients. Use plausible estimates based on visible food and stated portion.
- Keep calories broadly consistent with protein/carbohydrate/fat/fiber using 4/4/9/2 kcal per gram; allow reasonable variation for food composition.
- Sugar cannot exceed carbohydrates; saturated fat cannot exceed total fat.
- Unknown values must be 0 and reflected in uncertaintyWarnings.
- Sum item nutrition into totalNutrition; do not ask the model to invent a separate conflicting total.

Return STRICT JSON ONLY:
{"detectedDishName":"primary meal description","items":[{"name":"food","estimatedPortion":"~150 g","confidence":0.8,"isEstimated":true,"dataSource":"AI Vision Estimate","nutrition":{"calories":250,"protein":10,"carbs":30,"fat":8,"fiber":4,"sugar":5,"sodium":300}}],"confidence":{"itemsRecognition":0.85,"portionVolume":0.7,"totalNutrition":0.8,"overall":0.78},"isEstimated":true,"primaryDataSource":"AI Vision Estimate","estimationDisclaimer":"${MANDATORY_MEAL_DISCLAIMER}","likelyIngredients":[],"healthSummary":"...","uncertaintyWarnings":[]}`;
  const result=await runUnifiedVisionAnalysis({prompt,imageBase64,mimeType,scanType:'MEAL'});
  if(!result)throw new Error('Food image analysis failed. Please try again.');
  const rawItems=Array.isArray(result.items)?result.items:[];
  if(!rawItems.length)throw new Error('No distinct food items could be identified reliably. Please use a clearer meal photo.');
  const items=rawItems.slice(0,12).map(normalizeItem);
  const warnings=new Set<string>(Array.isArray(result.uncertaintyWarnings)?result.uncertaintyWarnings.filter((x:any)=>typeof x==='string'):[]);
  items.forEach(i=>validateNutrition(i).forEach(w=>warnings.add(w)));
  const totalNutrition=calculateTotals(items);
  const recognition=c(result.confidence?.itemsRecognition), portion=c(result.confidence?.portionVolume);
  const nutritionConfidence=c(result.confidence?.totalNutrition);
  const overall=Math.min(c(result.confidence?.overall||((recognition+portion+nutritionConfidence)/3)),recognition||1,portion||1,nutritionConfidence||1);
  if(items.length>1)warnings.add(`Detected ${items.length} distinct food items; nutrition is estimated separately for each item and then summed.`);
  if(portion<0.7)warnings.add('Portion size is uncertain because a normal photo cannot provide an exact weight.');
  return {
    detectedDishName:typeof result.detectedDishName==='string'&&result.detectedDishName.trim()?result.detectedDishName.trim():items[0].name,
    items,totalNutrition,
    confidence:{itemsRecognition:recognition,portionVolume:portion,totalNutrition:nutritionConfidence,overall:Math.round(overall*100)/100},
    isEstimated:true,
    primaryDataSource:typeof result.primaryDataSource==='string'?result.primaryDataSource:'AI Vision Estimate',
    estimationDisclaimer:MANDATORY_MEAL_DISCLAIMER,
    likelyIngredients:Array.isArray(result.likelyIngredients)?result.likelyIngredients.filter((x:any)=>typeof x==='string').slice(0,30):[],
    healthSummary:typeof result.healthSummary==='string'?result.healthSummary:'Nutrition and portion values are visual estimates; verify important details where possible.',
    uncertaintyWarnings:[...warnings]
  };
};

export const analyzeFoodFromImage=(_imageBase64:string,_customDishName?:string,_foodCategory?:string):MealIntelligenceResult=>{throw new Error('Food image analysis failed. Please try again.');};
