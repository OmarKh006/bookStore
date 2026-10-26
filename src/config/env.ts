export const REQUIRED_VARS = ["MONGO_URI", "BASE_URL", "JWT_SECRET"] as const;

/** Returns the names of required environment variables that are missing/empty. */
export const getMissingEnvVars = (
  env: NodeJS.ProcessEnv = process.env,
): string[] => REQUIRED_VARS.filter((name) => !env[name]);
