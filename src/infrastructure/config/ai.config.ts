import { registerAs } from '@nestjs/config';
import {
  AI_DEFAULT_PROVIDER,
  OPENAI_API_KEY,
  OPENAI_MODEL,
  AI_MAX_RESPONSE_TOKENS,
} from '@/app.settings';

export interface AIConfig {
  defaultProvider: 'openai' | 'anthropic' | 'stub';
  maxResponseTokens: number;
  openai: {
    apiKey: string | undefined;
    model: string;
    maxRetries: number;
    timeout: number;
  };
}

export const aiConfig = registerAs(
  'ai',
  (): AIConfig => ({
    defaultProvider: AI_DEFAULT_PROVIDER as AIConfig['defaultProvider'],
    maxResponseTokens: AI_MAX_RESPONSE_TOKENS,
    openai: {
      apiKey: OPENAI_API_KEY || undefined,
      model: OPENAI_MODEL,
      maxRetries: 3,
      timeout: 30000,
    },
  }),
);
