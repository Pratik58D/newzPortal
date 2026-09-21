import { logger } from "../config/logger.js";

// Tells the Next.js frontend which cached data changed, so admin edits show up
// on the public site in seconds instead of waiting for the 60s time-based
// revalidate (which stays as the fallback).
//
// Strictly best-effort: this never throws and never delays a response. A
// mutation has already been saved by the time it is called, so a slow or
// unreachable frontend must not turn a successful write into an error.

// Tag scheme shared with newsportal_frontend/lib/cacheTags.ts.
export const REVALIDATE_TAGS = {
  news: "news",
  newsItem: (slug: string) => `news:${slug}`,
  categories: "categories",
  category: (slug: string) => `category:${slug}`,
  settings: "settings",
  homepage: "homepage",
  pages: "pages",
} as const;

const TIMEOUT_MS = 3000;

const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

export async function sendRevalidation(
  tags: string[],
  paths: string[] = [],
): Promise<void> {
  const baseUrl = process.env.FRONTEND_REVALIDATE_URL?.trim();

  // Optional integration: unconfigured means local development.
  if (!baseUrl) return;

  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    logger.warn("frontend revalidation skipped: REVALIDATE_SECRET is not set");
    return;
  }

  const body = { tags: unique(tags), paths: unique(paths) };
  const endpoint = `${baseUrl.replace(/\/+$/, "")}/api/revalidate`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      logger.warn(
        { status: res.status, endpoint, tags: body.tags },
        "frontend revalidation was rejected",
      );
    }
  } catch (error) {
    // Only the message: never log headers/config, which hold the secret.
    logger.warn(
      {
        endpoint,
        tags: body.tags,
        reason: error instanceof Error ? error.message : String(error),
      },
      "frontend revalidation failed",
    );
  }
}

// Fire-and-forget entry point for controllers.
export function revalidateFrontend(tags: string[], paths: string[] = []): void {
  void sendRevalidation(tags, paths).catch(() => undefined);
}
