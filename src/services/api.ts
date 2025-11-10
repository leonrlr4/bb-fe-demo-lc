import { config } from '../config';
import { API_ENDPOINTS, STORAGE_KEYS } from '../constants';
import { ApiError } from '../types';
import { RefreshTokenResponse } from '../types/auth';
import { parseApiError, NetworkError } from '../utils';

type RequestInterceptor = (config: RequestInit) => RequestInit | Promise<RequestInit>;
type ResponseInterceptor = <T>(response: Response) => Promise<T>;

class ApiService {
  private baseURL: string;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private isRefreshing = false;
  private refreshPromise: Promise<string> | null = null;
  private onUnauthorizedCallback: (() => void) | null = null;

  constructor() {
    this.baseURL = config.API_BASE_URL;
    this.setupDefaultInterceptors();
  }

  setOnUnauthorized(callback: () => void) {
    this.onUnauthorizedCallback = callback;
  }

  private setupDefaultInterceptors() {
    this.addRequestInterceptor((config) => {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (token && config.headers) {
        (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
      }
      return config;
    });
  }

  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor);
  }

  private async applyRequestInterceptors(config: RequestInit): Promise<RequestInit> {
    let finalConfig = config;
    for (const interceptor of this.requestInterceptors) {
      finalConfig = await interceptor(finalConfig);
    }
    return finalConfig;
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    return {
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  private async refreshToken(): Promise<string> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await fetch(`${this.baseURL}${API_ENDPOINTS.AUTH.REFRESH}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) {
          localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
          localStorage.removeItem(STORAGE_KEYS.USER);

          if (this.onUnauthorizedCallback) {
            this.onUnauthorizedCallback();
          }

          throw new Error('Token refresh failed');
        }

        const data: RefreshTokenResponse = await response.json();
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.access_token);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
        const expiresAt = Date.now() + data.expires_in * 1000;
        localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt.toString());

        return data.access_token;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private shouldRefreshToken(): boolean {
    const expiresAt = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
    if (!expiresAt) return false;
    return Date.now() > parseInt(expiresAt, 10) - 5 * 60 * 1000;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let error: ApiError;
      try {
        error = await response.json();
        error.status = response.status;
      } catch {
        error = {
          detail: `HTTP error ${response.status}`,
          status: response.status,
        };
      }
      throw parseApiError(error);
    }

    try {
      return await response.json();
    } catch {
      return {} as T;
    }
  }

  private async request<T>(
    endpoint: string,
    config: RequestInit,
    requiresAuth = true,
    isRetry = false
  ): Promise<T> {
    try {
      if (requiresAuth && !isRetry && this.shouldRefreshToken()) {
        await this.refreshToken();
      }

      let requestConfig = {
        ...config,
        headers: {
          ...config.headers,
          ...(requiresAuth ? this.getAuthHeaders() : {}),
        },
      };

      requestConfig = await this.applyRequestInterceptors(requestConfig);

      const response = await fetch(`${this.baseURL}${endpoint}`, requestConfig);

      if (response.status === 401 && requiresAuth && !isRetry) {
        try {
          await this.refreshToken();
          return this.request<T>(endpoint, config, requiresAuth, true);
        } catch (refreshError) {
          throw parseApiError({
            detail: 'Session expired. Please login again.',
            status: 401
          });
        }
      }

      return await this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new NetworkError('Network connection failed. Please check your internet connection.');
      }
      throw error;
    }
  }

  async get<T>(endpoint: string, requiresAuth = true): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }, requiresAuth);
  }

  async post<T>(endpoint: string, data: unknown, requiresAuth = true): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }, requiresAuth);
  }

  async put<T>(endpoint: string, data: unknown, requiresAuth = true): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }, requiresAuth);
  }

  async delete<T>(endpoint: string, requiresAuth = true): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    }, requiresAuth);
  }

  async postFormData<T>(endpoint: string, formData: FormData, requiresAuth = true): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
    }, requiresAuth);
  }
}

export const apiService = new ApiService();
