export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  jwt: { secret: string; expiresIn: string };
  corsOrigins: string[];
  throttle: { ttl: number; limit: number; authLimit: number };
  seed: {
    adminEmail: string;
    adminPassword: string;
    userEmail: string;
    userPassword: string;
  };
}

const required = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const configuration = (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL'),
  jwt: {
    secret: required('JWT_SECRET', process.env.NODE_ENV === 'production' ? undefined : 'dev-secret'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  throttle: {
    ttl: Number(process.env.THROTTLE_TTL ?? 60_000),
    limit: Number(process.env.THROTTLE_LIMIT ?? 240),
    // Raised for load tests, which sign a few hundred accounts in before the run.
    authLimit: Number(process.env.AUTH_THROTTLE_LIMIT ?? 20),
  },
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL ?? 'admin@datawow.io',
    adminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@1234',
    userEmail: process.env.SEED_USER_EMAIL ?? 'user@datawow.io',
    userPassword: process.env.SEED_USER_PASSWORD ?? 'User@1234',
  },
});
