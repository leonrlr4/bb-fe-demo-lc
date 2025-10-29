import { config } from '../config';
import { STORAGE_KEYS } from '../constants';
import { ApiError } from '../types';
import { parseApiError, NetworkError } from '../utils';

type RequestInterceptor = (config: RequestInit) => RequestInit | Promise<RequestInit>;
type ResponseInterceptor = <T>(response: Response) => Promise<T>;

class ApiService {
  private baseURL: string;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  constructor() {
    this.baseURL = config.API_BASE_URL;
    this.setupDefaultInterceptors();
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
    requiresAuth = true
  ): Promise<T> {
    try {
      let requestConfig = {
        ...config,
        headers: {
          ...config.headers,
          ...(requiresAuth ? this.getAuthHeaders() : {}),
        },
      };

      requestConfig = await this.applyRequestInterceptors(requestConfig);

      const response = await fetch(`${this.baseURL}${endpoint}`, requestConfig);
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
