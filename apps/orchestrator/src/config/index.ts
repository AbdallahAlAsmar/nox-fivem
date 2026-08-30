import { z } from 'zod';

const configSchema = z.object({
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.number().int().positive().default(3001),
  databaseUrl: z.string().url(),
  directUrl: z.string().url().optional(),
  jwtSecret: z.string().min(32),
  anthropicApiKey: z.string().optional().default(''),
  corsOrigins: z.array(z.string()).default([
    'http://localhost:3000',
    'http://localhost:1420',
    'tauri://localhost',
    'http://tauri.localhost',
  ]),
});

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.ORCHESTRATOR_PORT || process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  directUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  corsOrigins: (
    process.env.CORS_ORIGINS ||
    'http://localhost:3000,http://localhost:1420,tauri://localhost,http://tauri.localhost'
  ).split(',').map((s) => s.trim()).filter(Boolean),
};

// Validate in production
if (config.nodeEnv === 'production') {
  const result = configSchema.safeParse(config);
  if (!result.success) {
    console.error('Invalid configuration:', result.error.flatten());
    process.exit(1);
  }

  // Additional production-only checks
  if (!config.jwtSecret) {
    console.error('CRITICAL: JWT_SECRET must be set in production');
    process.exit(1);
  }

  if (!process.env.CLERK_SECRET_KEY) {
    console.error('CRITICAL: CLERK_SECRET_KEY must be set in production');
    process.exit(1);
  }

  // Deny anonymous access in production unless explicitly allowed
  if (process.env.AUTH_ALLOW_ANON !== 'true' && process.env.AUTH_ALLOW_ANON !== '1') {
    console.log('auth: Anonymous access disabled (AUTH_ALLOW_ANON not set)');
  }
}
