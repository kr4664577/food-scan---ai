import axios from 'axios';

export const DEFAULT_API_URL = 'https://cap-verification-deeply-appointed.trycloudflare.com/api';

/**
 * Normalizes an API base URL:
 * - Strips whitespace and trailing slashes.
 * - Strips accidental /health or /api/health if user pasted full health endpoint.
 * - Ensures '/api' is appended if omitted, but prevents duplicating '/api/api'.
 */
export const normalizeApiUrl = (rawUrl: string): string => {
  if (!rawUrl || typeof rawUrl !== 'string') return DEFAULT_API_URL;
  let cleaned = rawUrl.trim().replace(/\/+$/, '');
  cleaned = cleaned.replace(/\/health$/i, '');
  if (!cleaned.endsWith('/api')) {
    cleaned = `${cleaned}/api`;
  }
  return cleaned;
};

export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const protocol = window.location?.protocol;
    const isCapacitor = protocol === 'capacitor:' || protocol === 'file:' || (window as any).Capacitor?.isNativePlatform?.();

    // Production web app is deployed together with the Vercel serverless API.
    // Always use same-origin /api so VITE_API_URL or an old saved tunnel URL
    // cannot send browser requests to an external backend and trigger CORS errors.
    if (!isCapacitor) {
      return '/api';
    }

    const envUrl = (import.meta as any).env?.VITE_API_URL;
    if (envUrl) return normalizeApiUrl(envUrl);

    const saved = localStorage.getItem('foodscan_api_url');
    if (saved) {
      const normalized = normalizeApiUrl(saved);
      if (normalized.includes('localhost') || normalized.includes('127.0.0.1') || normalized.includes('192.168.')) {
        return DEFAULT_API_URL;
      }
      return normalized;
    }

    return DEFAULT_API_URL;
  }
  return DEFAULT_API_URL;
};

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const base = (config.baseURL || '').replace(/\/+$/, '');
  const path = (config.url || '').replace(/^\/+/, '');
  const fullUrl = config.url?.startsWith('http') ? config.url : `${base}/${path}`;
  console.log(`[HTTP Request] ${config.method?.toUpperCase()} ${fullUrl}`);
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const base = (response.config.baseURL || '').replace(/\/+$/, '');
    const path = (response.config.url || '').replace(/^\/+/, '');
    const fullUrl = response.config.url?.startsWith('http') ? response.config.url : `${base}/${path}`;
    console.log(`[HTTP Response] ${response.status} ${fullUrl}`, response.data);
    return response;
  },
  (error) => {
    const base = (error.config?.baseURL || '').replace(/\/+$/, '');
    const path = (error.config?.url || '').replace(/^\/+/, '');
    const fullUrl = error.config?.url?.startsWith('http') ? error.config?.url : `${base}/${path}`;
    console.warn(`[HTTP Error] ${error.response?.status || 'Network Failed'} ${fullUrl}`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);

export const updateApiBaseUrl = (newUrl: string): string => {
  const normalized = normalizeApiUrl(newUrl);
  apiClient.defaults.baseURL = normalized;
  if (typeof window !== 'undefined') {
    localStorage.setItem('foodscan_api_url', normalized);
  }
  return normalized;
};

export const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

export interface ConnectionTestResult {
  success: boolean;
  type: 'SUCCESS' | 'NETWORK_FAILURE' | 'TIMEOUT' | 'HTTP_ERROR' | 'INVALID_RESPONSE';
  method: string;
  url: string;
  status: number | null;
  statusText?: string;
  data?: any;
  message: string;
  exceptionType?: string;
  rawError?: string;
  elapsedMs: number;
}

export const testBackendConnection = async (targetBaseUrl?: string): Promise<ConnectionTestResult> => {
  const base = normalizeApiUrl(targetBaseUrl || apiClient.defaults.baseURL || getApiBaseUrl());
  const fullHealthUrl = `${base.replace(/\/+$/, '')}/health`;
  const method = 'GET';
  const startTime = Date.now();

  try {
    const res = await axios.get(fullHealthUrl, {
      timeout: 10000,
      headers: { Accept: 'application/json' },
      validateStatus: () => true
    });

    const elapsedMs = Date.now() - startTime;
    const isOkStatus = res.status >= 200 && res.status < 300;
    const hasValidBody = res.data && (res.data.status === 'OK' || res.data.service || res.data.version);

    if (isOkStatus && hasValidBody) {
      return {
        success: true,
        type: 'SUCCESS',
        method,
        url: fullHealthUrl,
        status: res.status,
        statusText: res.statusText || 'OK',
        data: res.data,
        message: `HTTP ${res.status} OK — Backend is healthy (${res.data.service || 'FoodScan AI'} v${res.data.version || '1.0'})`,
        elapsedMs
      };
    } else if (isOkStatus && !hasValidBody) {
      return {
        success: false,
        type: 'INVALID_RESPONSE',
        method,
        url: fullHealthUrl,
        status: res.status,
        statusText: res.statusText,
        data: res.data,
        message: `Invalid response body received from server (Status: ${res.status})`,
        elapsedMs
      };
    } else {
      return {
        success: false,
        type: 'HTTP_ERROR',
        method,
        url: fullHealthUrl,
        status: res.status,
        statusText: res.statusText,
        data: res.data,
        message: `Server returned HTTP ${res.status} ${res.statusText || ''}`,
        elapsedMs
      };
    }
  } catch (err: any) {
    const elapsedMs = Date.now() - startTime;
    const exceptionType = err.name || 'Error';
    const rawError = err.message || String(err);
    let failureType: ConnectionTestResult['type'] = 'NETWORK_FAILURE';
    let userMsg = `${exceptionType}: ${rawError}`;

    if (err.code === 'ECONNABORTED' || rawError.toLowerCase().includes('timeout')) {
      failureType = 'TIMEOUT';
      userMsg = `Request timed out after 10s.`;
    } else if (rawError.toLowerCase().includes('cleartext') || rawError.toLowerCase().includes('not permitted')) {
      failureType = 'NETWORK_FAILURE';
      userMsg = `Cleartext HTTP traffic was blocked by Android system policy.`;
    } else if (rawError === 'Network Error' || err.code === 'ERR_NETWORK') {
      failureType = 'NETWORK_FAILURE';
      userMsg = `Network Error: Could not reach ${fullHealthUrl}.`;
    }

    return {
      success: false,
      type: failureType,
      method,
      url: fullHealthUrl,
      status: null,
      message: userMsg,
      exceptionType,
      rawError,
      elapsedMs
    };
  }
};
