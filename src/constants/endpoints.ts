export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
  },
  CONVERSATIONS: {
    LIST: '/api/conversations',
    DETAIL: (id: string) => `/api/conversations/${id}`,
  },
  CHAT: {
    GENERATE: '/api/generate',
  },
} as const;
