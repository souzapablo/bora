export interface FrontendEnv {
  VITE_API_URL: string;
}

const REQUIRED_KEYS: Array<keyof FrontendEnv> = ["VITE_API_URL"];

/**
 * Validates that every env var documented in .env.example is present.
 * Throws a clear, named error at import time if one is missing (fail-fast, SCAF-05).
 */
export function validateEnv(
  source: Record<string, string | undefined> = import.meta.env as unknown as Record<
    string,
    string | undefined
  >,
): FrontendEnv {
  const missing = REQUIRED_KEYS.filter((key) => !source[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. Copy .env.example to .env.development and fill in the values.`,
    );
  }

  return { VITE_API_URL: source.VITE_API_URL as string };
}
