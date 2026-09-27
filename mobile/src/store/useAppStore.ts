import { create } from 'zustand';
import {
  ScreenType,
  ScanMode,
  FoodCategory,
  UserProfile,
  PackagedFoodAnalysis,
  MealFoodAnalysis,
  QualityAnalysis,
  ScanItem,
  MealNutrition
} from '../types';
import { apiClient, setAuthToken } from '../api/client';
import { emptyMealNutrition, sumMealNutrition, scaleMealNutrition } from '../utils/mealNutrition';
import { getFriendlyScanErrorMessage } from '../utils/scanErrors';
import { beginScanRequest, cancelScanTrace, scanResponse } from '../utils/scanPerformance';
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
  activeScanRequestId: string | null;
  cancelScan: () => void;

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
  addMealItem: (name: string, portion: string | null, nutrition: MealNutrition) => void;
  removeMealItem: (index: number) => void;
}

const initialToken = typeof window !== 'undefined' ? localStorage.getItem('foodscan_auth_token') : null;
const getImageMimeType = (image: string): string | undefined =>
  image.match(/^data:([^;,]+)[;,]/i)?.[1]?.toLowerCase();

let initialUser: UserProfile | null = null;
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem('foodscan_user');
    if (raw && initialToken) initialUser = JSON.parse(raw);
  } catch {}
}
if (initialToken) {
  setAuthToken(initialToken);
}

const clearedReports = { activeMealReport: null, activePackagedReport: null, activeQualityReport: null };
let requestSequence = 0;
let activeScan: { id: string; controller: AbortController } | null = null;
function cancelCurrentScan() {
  const pending = activeScan;
  activeScan = null;
  pending?.controller.abort();
  if (pending) {
    cancelScanTrace(pending.id);
    useAppStore.setState({ activeScanRequestId: null, isLoading: false, ...clearedReports });
  }
}
function validAnalysis(value: any, screen: ScreenType, barcode: boolean) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (screen === 'QUALITY_REPORT') return ['No obvious visible issue detected', 'Possible visible issue detected', 'Unable to determine'].includes(value.statusCategory) && Array.isArray(value.detectedIssues);
  const name = screen === 'MEAL_REPORT' ? value.detectedDishName : value.productName;
  const nutrition = screen === 'MEAL_REPORT' ? value.totalNutrition : value.nutrition;
  if (typeof name !== 'string' || !name.trim() || !nutrition || typeof nutrition !== 'object' || Array.isArray(nutrition)) return false;
  if (screen === 'MEAL_REPORT' && (value.foodClassification !== 'food' || !Array.isArray(value.items) || !value.items.length)) return false;
  if (barcode && value.foodClassification !== 'food') return false;
  return Object.values(nutrition).every(n => n === null || (typeof n === 'number' && Number.isFinite(n) && n >= 0));
}
async function runScan(endpoint: string, payload: Record<string, unknown>, screen: ScreenType): Promise<boolean> {
  const state = useAppStore.getState();
  if (state.isLoading || state.activeScanRequestId) return false;
  const id = `scan-${Date.now()}-${++requestSequence}`, controller = new AbortController();
  const token = state.token, userId = state.user?.id;
  activeScan = { id, controller };
  const current = () => !controller.signal.aborted && activeScan?.id === id && useAppStore.getState().activeScanRequestId === id && useAppStore.getState().token === token && useAppStore.getState().user?.id === userId;
  useAppStore.setState({ activeScanRequestId: id, isLoading: true, errorMessage: null, ...clearedReports });
  beginScanRequest(id);
  try {
    const response = await apiClient.post(endpoint, payload, { signal: controller.signal, scanRequestId: id });
    if (!current()) return false;
    if (response.data?.success !== true) throw { response };
    const result = screen === 'MEAL_REPORT' ? response.data?.data?.mealAnalysis || response.data?.data?.analysis : screen === 'QUALITY_REPORT' ? response.data?.data?.qualityResult : response.data?.data?.analysis;
    if (!validAnalysis(result, screen, endpoint === '/scan/barcode')) throw { response: { status: 502, data: { error: { code: 'AI_INVALID_RESPONSE' } } } };
    useAppStore.setState({ ...(screen === 'MEAL_REPORT' ? { activeMealReport: result } : screen === 'QUALITY_REPORT' ? { activeQualityReport: result } : { activePackagedReport: result }), currentScreen: screen });
    return true;
  } catch (error) {
    if (!current()) return false;
    scanResponse(undefined, false, id);
    useAppStore.setState({ ...clearedReports, errorMessage: getFriendlyScanErrorMessage(error, endpoint === '/scan/barcode'), currentScreen: 'IMAGE_PREVIEW' });
    return false;
  } finally {
    // A late request must never clear the newer request's loading state.
    if (useAppStore.getState().activeScanRequestId === id) useAppStore.setState({ isLoading: false, activeScanRequestId: null });
    if (activeScan?.id === id) activeScan = null;
  }
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
  activeScanRequestId: null,
  cancelScan: cancelCurrentScan,

  setScreen: (screen) => { if (screen !== 'AI_PROCESSING') cancelCurrentScan(); set((state) => ({ previousScreen: state.currentScreen, currentScreen: screen })); },
  goBack: () => { cancelCurrentScan(); set((state) => ({ currentScreen: state.previousScreen || 'DASHBOARD' })); },
  setScanMode: (mode) => { if (get().scanMode !== mode) cancelCurrentScan(); set({ scanMode: mode }); },
  setFoodCategory: (category) => { if (get().foodCategory !== category) cancelCurrentScan(); set({ foodCategory: category }); },
  setCapturedImage: (img) => { if (get().capturedImage !== img) { cancelCurrentScan(); set({ ...clearedReports, errorMessage: null }); } set({ capturedImage: img }); },
  setCapturedBarcode: (barcode) => { if (get().capturedBarcode !== barcode) cancelCurrentScan(); set({ capturedBarcode: barcode }); },
  
  setUser: (user, token) => {
    if (get().token !== token || get().user?.id !== user?.id) cancelCurrentScan();
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
    cancelCurrentScan();
    setAuthToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('foodscan_auth_token');
      localStorage.removeItem('foodscan_user');
    }
    set({ user: null, token: null, authStatus: 'ready', currentScreen: 'AUTH', isLoading: false, historyStatus: 'idle', history: [], favorites: [], activeMealReport: null, activePackagedReport: null, activeQualityReport: null, capturedImage: null, capturedBarcode: null, errorMessage: null });
  },

  processBarcodeScan: (barcode) => runScan('/scan/barcode', { barcode }, 'PACKAGED_REPORT'),
  processPackagedScan: (base64Image, customItemName, foodCategory) => runScan('/scan/packaged', {
    imageBase64: base64Image, mimeType: getImageMimeType(base64Image), customItemName, foodCategory: foodCategory || get().foodCategory
  }, 'PACKAGED_REPORT'),
  processMealScan: (base64Image, customDishName, foodCategory) => runScan('/scan/meal', {
    imageBase64: base64Image, mimeType: getImageMimeType(base64Image), customDishName, foodCategory: foodCategory || get().foodCategory
  }, 'MEAL_REPORT'),
  processQualityScan: (base64Image) => runScan('/scan/quality', {
    imageBase64: base64Image, mimeType: getImageMimeType(base64Image)
  }, 'QUALITY_REPORT'),

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
    const token = get().token, userId = get().user?.id;
    if (!token || !userId) return;
    try {
      const response = await apiClient.post('/history/favorites/toggle', { scanId });
      if (get().token !== token || get().user?.id !== userId || response.data?.success !== true || typeof response.data?.isFavorite !== 'boolean') return;
      set((state) => ({
        history: state.history.map(item =>
          item.id === scanId && item.userId === userId ? { ...item, isFavorite: response.data.isFavorite } : item
        )
      }));
    } catch (err) {
      console.warn('Unable to update favorite.');
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
    if (!dishName.trim() || dishName.trim() === state.activeMealReport.detectedDishName) return;
    // Renaming an identification cannot validate the old food's nutrients.
    set({ activeMealReport: { ...state.activeMealReport, detectedDishName: dishName.trim(), items: [], totalNutrition: emptyMealNutrition(), confidence: { itemsRecognition: 0, portionVolume: 0, totalNutrition: 0, overall: 0 }, likelyIngredients: [], healthSummary: 'Food name corrected. Scan again with this name to estimate nutrition.', uncertaintyWarnings: ['Nutrition is unavailable after a food correction until the image is analyzed again.'] } });
  },

  scaleMealPortion: (multiplier: number) => {
    const state = get();
    if (!state.activeMealReport || !Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 10) return;
    const report = state.activeMealReport;

    const scaledItems = (report.items || []).map(item => ({
      ...item,
      portionMultiplier: (item.portionMultiplier || 1) * multiplier,
      nutrition: scaleMealNutrition(item.nutrition, multiplier)
    }));

    const totalNutrition = sumMealNutrition(scaledItems);

    set({
      activeMealReport: {
        ...report,
        items: scaledItems,
        totalNutrition
      }
    });
  },

  addMealItem: (name: string, portion: string | null, nutrition: MealNutrition) => {
    const state = get();
    if (!state.activeMealReport || !name.trim()) return;
    const report = state.activeMealReport;

    const newItem = {
      name,
      estimatedPortion: portion,
      confidence: 0,
      isEstimated: true,
      dataSource: "User Meal Custom Addition",
      nutrition: scaleMealNutrition({ ...emptyMealNutrition(), ...nutrition }, 1)
    };

    const updatedItems = [...(report.items || []), newItem];
    const totalNutrition = sumMealNutrition(updatedItems);

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
    const totalNutrition = sumMealNutrition(updatedItems);

    set({
      activeMealReport: {
        ...report,
        items: updatedItems,
        totalNutrition
      }
    });
  }
}));
