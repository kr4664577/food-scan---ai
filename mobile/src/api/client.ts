import axios from 'axios';

// Default production URL for native mobile apps when no custom endpoint or VITE_API_URL is configured
export const DEFAULT_MOBILE_API_URL = 'https://food-scan-ai-one.vercel.app/api';

/**
 * Normalizes an API base URL:
 * - Strips whitespace and trailing slashes.
 * - Strips accidental /health or /api/health if user pasted full health endpoint.
 * - Ensures '/api' is appended if omitted, but prevents duplicating '/api/api'.
 */
export const normalizeApiUrl = (rawUrl: string): string => {
  if (!rawUrl || typeof rawUrl !== 'string') return '/api';
  let cleaned = rawUrl.trim().replace(/\/+$/, '');
  
  // Strip trailing /health if user pasted full health endpoint
  cleaned = cleaned.replace(/\/health$/i, '');
  
  if (!cleaned.endsWith('/api')) {
    cleaned = `${cleaned}/api`;
  }
  return cleaned;
};

export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const protocol = window.location?.protocol;
    const hostname = window.location?.hostname || '';
    const isCapacitor = protocol === 'capacitor:' || protocol === 'file:' || (window as any).Capacitor?.isNativePlatform?.();

    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
    const isVercel = hostname.includes('vercel.app');

    // 1. On Vercel production web deployment, same-origin /api is ALWAYS used
    if (isVercel) {
      // Purge any stale temporary development tunnels or localhost URLs from localStorage
      const saved = localStorage.getItem('foodscan_api_url');
      if (saved) {
        const isTemporary = ['trycloudflare.com', 'loca.lt', 'ngrok', 'serveo.net', 'localhost', '127.0.0.1'].some((d) =>
          saved.includes(d)
        );
        if (isTemporary) {
          localStorage.removeItem('foodscan_api_url');
        }
      }
      return '/api';
    }

    // 2. Check localStorage for custom user-configured endpoint
    const saved = localStorage.getItem('foodscan_api_url');
    if (saved) {
      const normalized = normalizeApiUrl(saved);
      const isObsoleteTunnel = ['trycloudflare.com', 'loca.lt', 'ngrok', 'serveo.net'].some((domain) =>
        normalized.includes(domain)
      );
      if (isObsoleteTunnel) {
        localStorage.removeItem('foodscan_api_url');
        return isCapacitor ? DEFAULT_MOBILE_API_URL : '/api';
      }
      // If web user in production has a localhost or LAN IP stored, purge it
      if (!isCapacitor && !isLocalhost && (normalized.includes('localhost') || normalized.includes('127.0.0.1') || normalized.includes('192.168.') || normalized.includes('10.'))) {
        localStorage.removeItem('foodscan_api_url');
        return '/api';
      }
      return normalized;
    }

    // 3. Check VITE_API_URL, guarding against overriding production with local/tunnel URLs
    const envUrl = (import.meta as any).env?.VITE_API_URL;
    if (envUrl) {
      const isTemporary = ['trycloudflare.com', 'loca.lt', 'ngrok', 'serveo.net', 'localhost', '127.0.0.1'].some((d) =>
        envUrl.includes(d)
      );
      // In remote web production, ignore invalid local/tunnel env URLs and use same-origin /api
      if (!isCapacitor && !isLocalhost && isTemporary) {
        return '/api';
      }
      return normalizeApiUrl(envUrl);
    }

    // 4. Running inside native Capacitor Android APK
    if (isCapacitor) {
      return DEFAULT_MOBILE_API_URL;
    }

    // 5. In web browser (localhost development with Vite proxy or production same-origin)
    return '/api';
  }

  // Fallback for SSR or non-browser execution
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) return normalizeApiUrl(envUrl);
  return '/api';
};

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 60000, // 60s timeout for multimodal vision models
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request logging interceptor
apiClient.interceptors.request.use((config) => {
  const base = (config.baseURL || '').replace(/\/+$/, '');
  const path = (config.url || '').replace(/^\/+/, '');
  const fullUrl = config.url?.startsWith('http') ? config.url : `${base}/${path}`;
  console.log(`[HTTP Request] ${config.method?.toUpperCase()} ${fullUrl}`);
  return config;
});

// Response & error logging interceptor
apiClient.interceptors.response.use(
  (response) => {
    const base = (response.config.baseURL || '').replace(/\/+$/, '');
    const path = (response.config.url || '').replace(/^\/+/, '');
    const fullUrl = response.config.url?.startsWith('http') ? response.config.url : `${base}/${path}`;
    console.log(`[HTTP Response] ${response.status} ${fullUrl}`);
    return response;
  },
  (error) => {
    const base = (error.config?.baseURL || '').replace(/\/+$/, '');
    const path = (error.config?.url || '').replace(/^\/+/, '');
    const fullUrl = error.config?.url?.startsWith('http') ? error.config?.url : `${base}/${path}`;
    console.warn(`[HTTP Error] ${error.response?.status || 'Network Failed'} ${fullUrl}`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
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
  if (token && token !== 'null' && token !== 'undefined') {
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
 * Evaluates GET /health relative to /api (i.e. /api/health)
 */
export const testBackendConnection = async (targetBaseUrl?: string): Promise<ConnectionTestResult> => {
  const base = normalizeApiUrl(targetBaseUrl || apiClient.defaults.baseURL || getApiBaseUrl());
  const fullHealthUrl = `${base.replace(/\/+$/, '')}/health`;
  const method = 'GET';

  console.log(`[Connection Test] Initiating ${method} ${fullHealthUrl} ...`);
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
    } else {
      return {
        success: false,
        type: isOkStatus ? 'INVALID_RESPONSE' : 'HTTP_ERROR',
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

    return {
      success: false,
      type: 'NETWORK_FAILURE',
      method,
      url: fullHealthUrl,
      status: null,
      message: `${exceptionType}: ${rawError}`,
      exceptionType,
      rawError,
      elapsedMs
    };
  }
};
