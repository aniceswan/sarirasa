import { resolve } from 'node:path';
import { z } from 'zod';
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().default('postgres://sisarasa:sisarasa@127.0.0.1:55432/sisarasa'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  ACCESS_SECRET: z.string().min(32).default('development-only-access-secret-32-chars'),
  CALLBACK_SECRET: z.string().min(32).default('development-only-callback-secret-32-chars'),
  PICKUP_KEY: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .default('0'.repeat(64)),
  MEDIA_DIR: z.string().default('./uploads'),
  FEE_BPS: z.coerce.number().int().min(0).max(10000).default(500),
  TRUST_PROXY: z.string().default(''),
  CORS_ORIGINS: z.string().default(''),
});
export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const c = schema.parse(env);
  if (c.NODE_ENV === 'production') {
    for (const secret of [c.ACCESS_SECRET, c.CALLBACK_SECRET, c.PICKUP_KEY]) {
      if (
        secret.includes('development') ||
        /example|changeme|test|password/i.test(secret) ||
        new Set(secret).size < 12
      )
        throw new Error('Unsafe production secret');
    }
    if (c.ACCESS_SECRET === c.CALLBACK_SECRET) throw new Error('Separate callback secret required');
  }
  return { ...c, MEDIA_DIR: resolve(c.MEDIA_DIR) };
}
export type Config = ReturnType<typeof loadConfig>;
