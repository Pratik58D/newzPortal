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

export const validateEnv = (): void => {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        "Check your .env file (see newzPortal/README.md for the full list).",
    );
    process.exit(1);
  }
};
