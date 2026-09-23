// Fails fast at startup instead of surfacing as a confusing runtime error
// (e.g. `jwt.verify(token, process.env.JWT_SECRET!)` silently producing a
// generic 401 when JWT_SECRET is missing — see docs/news-portal-findings.md, B5).

const REQUIRED_ENV_VARS = [
  "JWT_SECRET",
  "MONGODB_URI_PROD",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
] as const;

// Optional frontend cache-revalidation hook. Leaving FRONTEND_REVALIDATE_URL
// unset disables it (local development); setting it requires the shared secret.
function revalidationProblems(): string[] {
  const url = process.env.FRONTEND_REVALIDATE_URL?.trim();
  if (!url) return [];

  const problems: string[] = [];

  try {
    const { protocol } = new URL(url);
    if (protocol !== "http:" && protocol !== "https:") {
      problems.push("FRONTEND_REVALIDATE_URL must be an http(s) URL");
    }
  } catch {
    problems.push("FRONTEND_REVALIDATE_URL is not a valid URL");
  }

  if (!process.env.REVALIDATE_SECRET) {
    problems.push("REVALIDATE_SECRET is required when FRONTEND_REVALIDATE_URL is set");
  }

  return problems;
}

export const validateEnv = (): void => {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  const problems = revalidationProblems();

  if (missing.length > 0) {
    console.error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        "Check your .env file (see newzPortal/README.md for the full list).",
    );
  }

  for (const problem of problems) {
    console.error(`Invalid environment: ${problem}.`);
  }

  if (missing.length > 0 || problems.length > 0) {
    process.exit(1);
  }
};
