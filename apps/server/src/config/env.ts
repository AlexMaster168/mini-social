import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean)
        : [],
    ),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  // Defaults to true in production. Only disable for plain-HTTP setups you trust.
  COOKIE_SECURE: z.stringbool().optional(),
  // Set to true when running behind a reverse proxy (nginx, Render, Fly, ...).
  TRUST_PROXY: z.stringbool().default(false),
  // Directory with the built web app; served by the API when it exists.
  WEB_DIST_DIR: z.string().optional(),
})

export type Env = z.infer<typeof EnvSchema>

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    console.error('Invalid environment variables:\n' + z.prettifyError(parsed.error))
    process.exit(1)
  }
  return parsed.data
}

export const env = loadEnv()
export const isProduction = env.NODE_ENV === 'production'
