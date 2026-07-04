export interface BackendEnv {
  PORT: string;
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
}

const REQUIRED_KEYS: Array<keyof BackendEnv> = ["PORT", "DATABASE_URL", "JWT_ACCESS_SECRET"];

/**
 * Validates that every env var documented in .env.example is present.
 * Throws a clear, named error at bootstrap if one is missing (fail-fast, SCAF-05).
 */
export function validateEnv(source: NodeJS.ProcessEnv = process.env): BackendEnv {
  const missing = REQUIRED_KEYS.filter((key) => !source[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. Copy .env.example to .env.development and fill in the values.`,
    );
  }

  return {
    PORT: source.PORT as string,
    DATABASE_URL: source.DATABASE_URL as string,
    JWT_ACCESS_SECRET: source.JWT_ACCESS_SECRET as string,
  };
}
