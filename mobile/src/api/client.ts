import axios from 'axios';

/**
 * Normalizes an API base URL:
 * - Strips whitespace and trailing slashes.
 * - Strips accidental /health or /api/health if user pasted full health endpoint.
 * - Ensures '/api' is appended if omitted, but prevents duplicating '/api/api'.
 */
export const normalizeApiUrl = (rawUrl: string): string => {
  if (!rawUrl || typeof rawUrl !== 'string') return 'http://192.168.31.218:5001/api';
  let cleaned = rawUrl.trim().replace(/\/+$/, '');
  
  // Strip trailing /health if user pasted full health endpoint
  cleaned = cleaned.replace(/\/health$/i, '');
  
  if (!cleaned.endsWith('/api')) {
    cleaned = `${cleaned}/api`;
  }
  return cleaned;
};

export const getApiBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) return normalizeApiUrl(envUrl);

  if (typeof window !== 'undefined') {
    const protocol = window.location?.protocol;
    const isCapacitor = protocol === 'capacitor:' || protocol === 'file:' || (window as any).Capacitor?.isNativePlatform?.();

    const saved = localStorage.getItem('foodscan_api_url');
    if (saved) {
      const normalized = normalizeApiUrl(saved);
      // If running inside native Android APK and the saved URL points to localhost or 127.0.0.1,
      // override with verified LAN IP so phone does not query itself
      if (isCapacitor && (normalized.includes('localhost') || normalized.includes('127.0.0.1'))) {
        return 'http://192.168.31.218:5001/api';
      }
      return normalized;
    }

    // Running inside native Capacitor Android APK: default to verified LAN IP
    if (isCapacitor) {
      return 'http://192.168.31.218:5001/api';
    }

    // In web browser (localhost, 127.0.0.1, or local network IP via Vite)
    // Always use '/api' to route seamlessly through Vite reverse proxy to backend port 5001
    return '/api';
  }
  return 'http://192.168.31.218:5001/api';
};

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 60000, // 60s timeout for multimodal vision models
  headers: {
    'Content-Type': 'application/json',
  },
});

// Development request logging interceptor
apiClient.interceptors.request.use((config) => {
  const base = (config.baseURL || '').replace(/\/+$/, '');
  const path = (config.url || '').replace(/^\/+/, '');
  const fullUrl = config.url?.startsWith('http') ? config.url : `${base}/${path}`;
  console.log(`[HTTP Request] ${config.method?.toUpperCase()} ${fullUrl}`);
  return config;
});

// Development response & error logging interceptor
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

/**
 * Diagnostics runner for testing backend connectivity.
 * Evaluates GET /api/health directly against the target base URL.
 */
export const testBackendConnection = async (targetBaseUrl?: string): Promise<ConnectionTestResult> => {
  const base = normalizeApiUrl(targetBaseUrl || apiClient.defaults.baseURL || getApiBaseUrl());
  // The health endpoint is at /health relative to /api (i.e. http://192.168.31.218:5001/api/health)
  const fullHealthUrl = `${base.replace(/\/+$/, '')}/health`;
  const method = 'GET';

  console.log(`[Connection Test] Initiating ${method} ${fullHealthUrl} ...`);
  const startTime = Date.now();

  try {
    const res = await axios.get(fullHealthUrl, {
      timeout: 10000,
      headers: { Accept: 'application/json' },
      validateStatus: () => true // Allow non-2xx status to distinguish HTTP errors from network down
    });

    const elapsedMs = Date.now() - startTime;
    const isOkStatus = res.status >= 200 && res.status < 300;
    const hasValidBody = res.data && (res.data.status === 'OK' || res.data.service || res.data.version);

    console.log(`[Connection Test Result] ${method} ${fullHealthUrl} -> HTTP ${res.status} (${elapsedMs}ms)`, res.data);

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
    console.error(`[Connection Test Error] ${exceptionType} on ${method} ${fullHealthUrl} (${elapsedMs}ms):`, err);

    let failureType: ConnectionTestResult['type'] = 'NETWORK_FAILURE';
    let userMsg = '';

    if (err.code === 'ECONNABORTED' || rawError.toLowerCase().includes('timeout')) {
      failureType = 'TIMEOUT';
      userMsg = `Request timed out after 10s. Server port 5001 might be unresponsive or blocked by macOS firewall.`;
    } else if (rawError.toLowerCase().includes('cleartext') || rawError.toLowerCase().includes('not permitted')) {
      failureType = 'NETWORK_FAILURE';
      userMsg = `Cleartext HTTP traffic was blocked by Android system policy.`;
    } else if (rawError === 'Network Error' || err.code === 'ERR_NETWORK') {
      failureType = 'NETWORK_FAILURE';
      userMsg = `Network Error: Could not reach ${fullHealthUrl}. Ensure phone & Mac are connected to the same Wi-Fi network.`;
    } else {
      failureType = 'NETWORK_FAILURE';
      userMsg = `${exceptionType}: ${rawError}`;
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
