// Rules for an advertisement's click-through URL. Mirrored in
// newsportal_frontend/lib/adRedirectUrl.ts so the admin form and the API agree.

export const MAX_REDIRECT_URL_LENGTH = 2048;

// Spaces, tabs, newlines, other Unicode whitespace and control characters.
const hasWhitespaceOrControl = (value: string) =>
  [...value].some((ch) => {
    const code = ch.charCodeAt(0);
    return code <= 0x20 || code === 0x7f || /\s/.test(ch);
  });

// Returns a human-readable problem, or null when the URL is acceptable:
// absolute http:// or https:// only, no embedded credentials, <= 2048 chars.
export function redirectUrlProblem(value: string): string | null {
  const url = value.trim();

  if (!url) return "Redirect URL is required";
  if (url.length > MAX_REDIRECT_URL_LENGTH) {
    return `Redirect URL must be ${MAX_REDIRECT_URL_LENGTH} characters or fewer`;
  }

  // Explicit scheme with "//" (rules out `http:example.com`, `javascript:`,
  // `data:`, `//host`, relative paths) and no whitespace/control characters,
  // which URL parsing would otherwise silently strip.
  if (!/^https?:\/\//i.test(url)) {
    return "Redirect URL must start with http:// or https://";
  }
  if (hasWhitespaceOrControl(url)) {
    return "Redirect URL must not contain spaces or control characters";
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "Enter a valid URL";
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "Redirect URL must start with http:// or https://";
  }
  if (!parsed.hostname) return "Enter a valid URL";
  if (parsed.username || parsed.password) {
    return "Redirect URL must not contain a username or password";
  }

  return null;
}
