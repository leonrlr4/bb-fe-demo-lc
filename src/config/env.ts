interface EnvConfig {
  API_BASE_URL: string;
  IS_PRODUCTION: boolean;
  IS_DEVELOPMENT: boolean;
}

const env: EnvConfig = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEVELOPMENT: import.meta.env.DEV,
};

export const config = {
  ...env,
  API_TIMEOUT: 30000,
} as const;
