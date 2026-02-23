import { registerAs } from '@nestjs/config';
import { APP_BASE_URL, PORT } from '@/app.settings';

export interface AppConfig {
  baseUrl: string;
}

/** Typed keys for `configService.get(...)` lookups against the `app` namespace. */
export const APP_CONFIG_KEYS = {
  BASE_URL: 'app.baseUrl',
} as const;

export const appConfig = registerAs(
  'app',
  (): AppConfig => ({
    baseUrl: APP_BASE_URL || `http://localhost:${PORT}`,
  }),
);
