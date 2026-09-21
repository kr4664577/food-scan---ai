import { create } from 'zustand';
import {
  ScreenType,
  ScanMode,
  FoodCategory,
  UserProfile,
  PackagedFoodAnalysis,
  MealFoodAnalysis,
  QualityAnalysis,
  ScanItem
} from '../types';
import { apiClient, setAuthToken, apiErrorMessage } from '../api/client';
interface AppState {
  currentScreen: ScreenType;
  previousScreen: ScreenType | null;
  scanMode: ScanMode;
  foodCategory: FoodCategory;
  token: string | null;
  user: UserProfile | null;
  authStatus: 'restoring' | 'ready' | 'unavailable';
  restoreSession: () => Promise<void>;
  capturedImage: string | null;
  capturedBarcode: string | null;
  
  activePackagedReport: PackagedFoodAnalysis | null;
  activeMealReport: MealFoodAnalysis | null;
  activeQualityReport: QualityAnalysis | null;
  
  history: ScanItem[];
  historyStatus: 'idle' | 'loading' | 'ready' | 'error';
  favorites: ScanItem[];
  isLoading: boolean;
  errorMessage: string | null;

  // Actions
  setScreen: (screen: ScreenType) => void;
  goBack: () => void;
  setScanMode: (mode: ScanMode) => void;
  setFoodCategory: (category: FoodCategory) => void;
  setCapturedImage: (img: string | null) => void;
  setCapturedBarcode: (barcode: string | null) => void;
  
  setUser: (user: UserProfile | null, token: string | null) => void;
  logout: () => void;
  
  // API Workflows
  processBarcodeScan: (barcode: string) => Promise<boolean>;
  processPackagedScan: (base64Image: string, customItemName?: string, foodCategory?: FoodCategory) => Promise<boolean>;
  processMealScan: (base64Image: string, customDishName?: string, foodCategory?: FoodCategory) => Promise<boolean>;
  processQualityScan: (base64Image: string) => Promise<boolean>;
  
  fetchHistory: () => Promise<void>;
  toggleFavorite: (scanId: string) => Promise<void>;
  updateUserProfile: (data: { fullName?: string; dietaryGoals?: string; allergies?: string[] }) => Promise<void>;
  
  // Interactive Meal Editing Actions
  updateMealDishName: (dishName: string) => void;
  scaleMealPortion: (multiplier: number) => void;
  addMealItem: (name: string, portion: string, calories: number, protein: number, carbs: number, fat: number) => void;
  removeMealItem: (index: number) => void;
}

const initialToken = typeof window !== 'undefined' ? localStorage.getItem('foodscan_auth_token') : null;
const getImageMimeType = (image: string): string | undefined =>
  image.match(/^data:([^;,]+)[;,]/i)?.[1]?.toLowerCase();

let initialUser: UserProfile | null = null;
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem('foodscan_user');
    if (raw) initialUser = JSON.parse(raw);
  } catch {}
}
if (initialToken) {
  setAuthToken(initialToken);
}

export const useAppStore = create<AppState>((set, get) => ({
  currentScreen: 'SPLASH',
  previousScreen: null,
  scanMode: 'MEAL_PHOTO',
  foodCategory: 'HOME_FOOD',
  token: initialToken,
  user: initialUser,
  authStatus: initialToken ? 'restoring' : 'ready',
  restoreSession: async () => {
    const token = get().token;
    if (!token) { set({ authStatus: 'ready' }); return; }
    set({ authStatus: 'restoring' });
    try {
      const response = await apiClient.get('/auth/me');
      // Ignore a response from a session that was logged out/replaced in flight.
      if (get().token !== token) return;
      if (!response.data?.success || !response.data.data?.id) throw new Error('Invalid session response');
      get().setUser(response.data.data, token);
      set({ authStatus: 'ready', currentScreen: 'DASHBOARD' });
    } catch (error: any) {
      if (get().token !== token) return;
      if (error.response?.status === 401) get().logout();
      else set({ authStatus: 'unavailable' });
    }
  },
  capturedImage: null,
  capturedBarcode: null,
  
  activePackagedReport: null,
  activeMealReport: null,
  activeQualityReport: null,
  
  history: [],
  historyStatus: 'idle',
  favorites: [],
  isLoading: false,
  errorMessage: null,

  setScreen: (screen) => set((state) => ({ previousScreen: state.currentScreen, currentScreen: screen })),
  goBack: () => set((state) => ({ currentScreen: state.previousScreen || 'DASHBOARD' })),
  setScanMode: (mode) => set({ scanMode: mode }),
  setFoodCategory: (category) => set({ foodCategory: category }),
  setCapturedImage: (img) => set({ capturedImage: img }),
  setCapturedBarcode: (barcode) => set({ capturedBarcode: barcode }),
  
  setUser: (user, token) => {
    setAuthToken(token);
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('foodscan_auth_token', token);
      else localStorage.removeItem('foodscan_auth_token');
      if (user) localStorage.setItem('foodscan_user', JSON.stringify(user));
      else localStorage.removeItem('foodscan_user');
    }
    set(state => ({ user, token, authStatus: 'ready', ...(state.user?.id !== user?.id ? { history: [], favorites: [], historyStatus: 'idle' as const, activeMealReport: null, activePackagedReport: null, activeQualityReport: null } : {}) }));
  },

  logout: () => {
    setAuthToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('foodscan_auth_token');
      localStorage.removeItem('foodscan_user');
    }
    set({ user: null, token: null, authStatus: 'ready', currentScreen: 'AUTH', isLoading: false, historyStatus: 'idle', history: [], favorites: [], activeMealReport: null, activePackagedReport: null, activeQualityReport: null, capturedImage: null, capturedBarcode: null, errorMessage: null });
  },

  processBarcodeScan: async (barcode: string) => {
    if (get().isLoading) return false;
    const scanToken = get().token;
    set({
      isLoading: true,
      errorMessage: null,
      activePackagedReport: null,
      activeMealReport: null,
      activeQualityReport: null
    });
    try {
      const response = await apiClient.post('/scan/barcode', { barcode });
      if (get().token !== scanToken) return false;
      if (response.data?.success && response.data.data?.analysis) {
        const analysis: PackagedFoodAnalysis = response.data.data.analysis;
        set({ activePackagedReport: analysis, isLoading: false, currentScreen: 'PACKAGED_REPORT' });
        return true;
      } else {
        const errorMsg = response.data?.error?.message || (typeof response.data?.error === 'string' ? response.data.error : 'Food barcode lookup failed. Please try again.');
        set({ isLoading: false, errorMessage: errorMsg, currentScreen: 'IMAGE_PREVIEW' });
        return false;
      }
    } catch (err: any) {
      if (get().token !== scanToken) return false;
      const errorMsg = err.response?.data?.error?.message || (typeof err.response?.data?.error === 'string' ? err.response.data.error : 'Food barcode lookup failed. Please try again.');
      console.warn('Barcode scan error:', errorMsg);
      set({ isLoading: false, errorMessage: errorMsg, currentScreen: 'IMAGE_PREVIEW' });
      return false;
    }
  },

  processPackagedScan: async (base64Image: string, customItemName?: string, foodCategory?: FoodCategory) => {
    if (get().isLoading) return false;
    const scanToken = get().token;
    set({
      isLoading: true,
      errorMessage: null,
      activePackagedReport: null,
      activeMealReport: null,
      activeQualityReport: null
    });
    const currentCategory = foodCategory || get().foodCategory;
    try {
      const response = await apiClient.post('/scan/packaged', {
        imageBase64: base64Image,
        mimeType: getImageMimeType(base64Image),
        customItemName,
        foodCategory: currentCategory
      });
      if (get().token !== scanToken) return false;
      if (response.data?.success && response.data.data?.analysis) {
        const analysis: PackagedFoodAnalysis = response.data.data.analysis;
        set({ activePackagedReport: analysis, isLoading: false, currentScreen: 'PACKAGED_REPORT' });
        return true;
      } else {
        const errorMsg = apiErrorMessage(response.data?.error, 'Food image analysis failed. Please try again.');
        set({ isLoading: false, errorMessage: errorMsg, currentScreen: 'IMAGE_PREVIEW' });
        return false;
      }
    } catch (err: any) {
      if (get().token !== scanToken) return false;
      const errorMsg = apiErrorMessage(err.response?.data?.error, !err.response ? 'Cannot reach the server. Please check your connection.' : 'Food image analysis failed. Please try again.');
      console.warn('Packaged scan error:', errorMsg);
      set({ isLoading: false, errorMessage: errorMsg, currentScreen: 'IMAGE_PREVIEW' });
      return false;
    }
  },

  processMealScan: async (base64Image: string, customDishName?: string, foodCategory?: FoodCategory) => {
    if (get().isLoading) return false;
    const scanToken = get().token;
    set({
      isLoading: true,
      errorMessage: null,
      activePackagedReport: null,
      activeMealReport: null,
      activeQualityReport: null
    });
    const currentCategory = foodCategory || get().foodCategory;
    try {
      console.log('[Meal Scan] Dispatching POST /scan/meal to backend ...');
      const response = await apiClient.post('/scan/meal', {
        imageBase64: base64Image,
        mimeType: getImageMimeType(base64Image),
        customDishName,
        foodCategory: currentCategory
      });
      if (get().token !== scanToken) return false;
      console.log('[Meal Scan] Backend responded with status:', response.status);

      const mealAnalysis: MealFoodAnalysis | undefined =
        response.data?.data?.mealAnalysis || response.data?.data?.analysis;
      if (response.data?.success && mealAnalysis) {
        console.log('[Meal Scan Success] Report ready.');
        set({ activeMealReport: mealAnalysis, isLoading: false, currentScreen: 'MEAL_REPORT' });
        return true;
      } else {
        const errorMsg = apiErrorMessage(response.data?.error, 'Food image analysis failed. Please try again.');
        console.warn('[Meal Scan Response Missing Analysis]', {
          status: response.status,
          success: response.data?.success,
          hasMealAnalysis: !!mealAnalysis,
        });
        set({ isLoading: false, errorMessage: errorMsg, currentScreen: 'IMAGE_PREVIEW' });
        return false;
      }
    } catch (err: any) {
      if (get().token !== scanToken) return false;
      const status = err.response?.status;
      const statusText = err.response?.statusText;
      const backendError = err.response?.data?.error || err.response?.data?.message || err.response?.data?.details;
      const errorMsg = apiErrorMessage(err.response?.data?.error, !err.response ? 'Cannot reach the server. Please check your connection.' : 'Food image analysis failed. Please try again.');
      
      console.warn('[Meal Scan Request Failed]', { httpStatus: status });
      set({ isLoading: false, errorMessage: errorMsg, currentScreen: 'IMAGE_PREVIEW' });
      return false;
    }
  },

  processQualityScan: async (base64Image: string) => {
    if (get().isLoading) return false;
    const scanToken = get().token;
    set({
      isLoading: true,
      errorMessage: null,
      activePackagedReport: null,
      activeMealReport: null,
      activeQualityReport: null
    });
    try {
      const response = await apiClient.post('/scan/quality', {
        imageBase64: base64Image,
        mimeType: getImageMimeType(base64Image)
      });
      if (get().token !== scanToken) return false;
      if (response.data?.success && response.data.data?.qualityResult) {
        const qualityResult: QualityAnalysis = response.data.data.qualityResult;
        set({ activeQualityReport: qualityResult, isLoading: false, currentScreen: 'QUALITY_REPORT' });
        return true;
      } else {
        const errorMsg = apiErrorMessage(response.data?.error, 'Food image analysis failed. Please try again.');
        set({ isLoading: false, errorMessage: errorMsg, currentScreen: 'IMAGE_PREVIEW' });
        return false;
      }
    } catch (err: any) {
      if (get().token !== scanToken) return false;
      const errorMsg = apiErrorMessage(err.response?.data?.error, !err.response ? 'Cannot reach the server. Please check your connection.' : 'Food image analysis failed. Please try again.');
      console.warn('Quality scan error:', errorMsg);
      set({ isLoading: false, errorMessage: errorMsg, currentScreen: 'IMAGE_PREVIEW' });
      return false;
    }
  },

  fetchHistory: async () => {
    const token = get().token;
    const userId = get().user?.id;
    if (!token || !userId || userId === 'guest') { set({ history: [], historyStatus: 'ready' }); return; }
    set({ historyStatus: 'loading' });
    try {
      const res = await apiClient.get('/history/scans');
      if (get().token !== token || get().user?.id !== userId) return;
      if (!res.data?.success || !Array.isArray(res.data.data)) throw new Error('History unavailable');
      set({ history: res.data.data.filter((scan: ScanItem) => scan.userId === userId), historyStatus: 'ready' });
    } catch (err) {
      if (get().token === token) set({ historyStatus: 'error' });
    }
  },

  toggleFavorite: async (scanId: string) => {
    try {
      await apiClient.post('/history/favorites/toggle', { scanId });
      set((state) => ({
        history: state.history.map(item =>
          item.id === scanId ? { ...item, isFavorite: !item.isFavorite } : item
        )
      }));
    } catch (err) {
      console.warn('Toggle favorite error:', err);
    }
  },

  updateUserProfile: async (data) => {
    const token = get().token;
    set({ isLoading: true });
    try {
      const res = await apiClient.put('/auth/me', data);
      if (get().token !== token) return;
      if (!res.data?.success || !res.data.data?.id) throw new Error('Profile update failed');
      get().setUser(res.data.data, token);
      set({ isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw new Error('Profile update failed. Please try again.');
    }
  },

  updateMealDishName: (dishName: string) => {
    const state = get();
    if (!state.activeMealReport) return;
    set({ activeMealReport: { ...state.activeMealReport, detectedDishName: dishName } });
  },

  scaleMealPortion: (multiplier: number) => {
    const state = get();
    if (!state.activeMealReport) return;
    const report = state.activeMealReport;

    const scaledItems = (report.items || []).map(item => ({
      ...item,
      nutrition: {
        ...item.nutrition,
        calories: Math.round(item.nutrition.calories * multiplier),
        protein: Math.round(item.nutrition.protein * multiplier * 10) / 10,
        carbs: Math.round(item.nutrition.carbs * multiplier * 10) / 10,
        fat: Math.round(item.nutrition.fat * multiplier * 10) / 10,
        fiber: Math.round(item.nutrition.fiber * multiplier * 10) / 10,
        sugar: Math.round((item.nutrition.sugar || 0) * multiplier * 10) / 10,
        sodium: Math.round((item.nutrition.sodium || 0) * multiplier)
      }
    }));

    const totalNutrition = scaledItems.reduce((acc, item) => ({
      calories: acc.calories + item.nutrition.calories,
      protein: Math.round((acc.protein + item.nutrition.protein) * 10) / 10,
      carbs: Math.round((acc.carbs + item.nutrition.carbs) * 10) / 10,
      fat: Math.round((acc.fat + item.nutrition.fat) * 10) / 10,
      fiber: Math.round((acc.fiber + item.nutrition.fiber) * 10) / 10,
      sugar: Math.round((acc.sugar + (item.nutrition.sugar || 0)) * 10) / 10,
      sodium: Math.round(acc.sodium + (item.nutrition.sodium || 0))
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 });

    set({
      activeMealReport: {
        ...report,
        items: scaledItems,
        totalNutrition
      }
    });
  },

  addMealItem: (name: string, portion: string, calories: number, protein: number, carbs: number, fat: number) => {
    const state = get();
    if (!state.activeMealReport) return;
    const report = state.activeMealReport;

    const newItem = {
      name,
      estimatedPortion: portion,
      confidence: 0.95,
      isEstimated: true,
      dataSource: "User Meal Custom Addition",
      nutrition: { calories, protein, carbs, fat, fiber: 2, sugar: 1, sodium: 150 }
    };

    const updatedItems = [...(report.items || []), newItem];
    const totalNutrition = updatedItems.reduce((acc, item) => ({
      calories: acc.calories + item.nutrition.calories,
      protein: Math.round((acc.protein + item.nutrition.protein) * 10) / 10,
      carbs: Math.round((acc.carbs + item.nutrition.carbs) * 10) / 10,
      fat: Math.round((acc.fat + item.nutrition.fat) * 10) / 10,
      fiber: Math.round((acc.fiber + item.nutrition.fiber) * 10) / 10,
      sugar: Math.round((acc.sugar + (item.nutrition.sugar || 0)) * 10) / 10,
      sodium: Math.round(acc.sodium + (item.nutrition.sodium || 0))
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 });

    set({
      activeMealReport: {
        ...report,
        items: updatedItems,
        totalNutrition
      }
    });
  },

  removeMealItem: (index: number) => {
    const state = get();
    if (!state.activeMealReport) return;
    const report = state.activeMealReport;

    const updatedItems = (report.items || []).filter((_, i) => i !== index);
    const totalNutrition = updatedItems.reduce((acc, item) => ({
      calories: acc.calories + item.nutrition.calories,
      protein: Math.round((acc.protein + item.nutrition.protein) * 10) / 10,
      carbs: Math.round((acc.carbs + item.nutrition.carbs) * 10) / 10,
      fat: Math.round((acc.fat + item.nutrition.fat) * 10) / 10,
      fiber: Math.round((acc.fiber + item.nutrition.fiber) * 10) / 10,
      sugar: Math.round((acc.sugar + (item.nutrition.sugar || 0)) * 10) / 10,
      sodium: Math.round(acc.sodium + (item.nutrition.sodium || 0))
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 });

    set({
      activeMealReport: {
        ...report,
        items: updatedItems,
        totalNutrition
      }
    });
  }
}));
