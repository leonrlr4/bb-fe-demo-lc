export interface ApiError {
  detail: string | { error: string; message: string };
  status?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestConfig {
  requiresAuth?: boolean;
  headers?: HeadersInit;
}
