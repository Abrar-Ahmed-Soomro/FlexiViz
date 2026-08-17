import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  DUCKDB_PATH: z.string().default('./data/flexiviz.duckdb'),
});

export const env = envSchema.parse(process.env);
