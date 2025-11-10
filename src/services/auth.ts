import { apiService } from './api';
import { API_ENDPOINTS, STORAGE_KEYS } from '../constants';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../types';

class AuthService {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      data,
      false
    );
    this.saveToken(response.access_token);
    this.saveRefreshToken(response.refresh_token);
    this.saveTokenExpiry(response.expires_in);

    const user: User = {
      id: response.user_id,
      username: response.username,
      email: response.email,
      subscription_tier: response.subscription_tier,
      created_at: response.created_at,
    };
    this.saveUser(user);
    return response;
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      data,
      false
    );
    this.saveToken(response.access_token);
    this.saveRefreshToken(response.refresh_token);
    this.saveTokenExpiry(response.expires_in);

    const user: User = {
      id: response.user_id,
      username: response.username,
      email: response.email,
      subscription_tier: response.subscription_tier,
      created_at: response.created_at,
    };
    this.saveUser(user);
    return response;
  }

  saveToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  }

  getToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  saveRefreshToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  saveTokenExpiry(expiresIn: number): void {
    const expiresAt = Date.now() + expiresIn * 1000;
    localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt.toString());
  }

  getTokenExpiry(): number | null {
    const expiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
    return expiry ? parseInt(expiry, 10) : null;
  }

  isTokenExpiringSoon(): boolean {
    const expiresAt = this.getTokenExpiry();
    if (!expiresAt) return true;
    return Date.now() > expiresAt - 5 * 60 * 1000;
  }

  saveUser(user: User): void {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }

  getUser(): User | null {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export const authService = new AuthService();
