import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/logger.js", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { logger } from "../config/logger.js";
import { REVALIDATE_TAGS, revalidateFrontend, sendRevalidation } from "./revalidate.js";

const SECRET = "super-secret-value";
const fetchMock = vi.fn();
const warn = logger.warn as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock.mockReset();
  warn.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  process.env.FRONTEND_REVALIDATE_URL = "http://frontend.test/";
  process.env.REVALIDATE_SECRET = SECRET;
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.FRONTEND_REVALIDATE_URL;
  delete process.env.REVALIDATE_SECRET;
});

describe("sendRevalidation", () => {
  it("does nothing when FRONTEND_REVALIDATE_URL is not configured", async () => {
    delete process.env.FRONTEND_REVALIDATE_URL;

    await sendRevalidation(["news"]);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("skips (and warns) when the URL is set but the secret is not", async () => {
    delete process.env.REVALIDATE_SECRET;

    await sendRevalidation(["news"]);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("POSTs de-duplicated tags with the secret header and a timeout", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await sendRevalidation(["news", "news", "news:a", ""], ["/x"]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://frontend.test/api/revalidate");
    expect(init.method).toBe("POST");
    expect(init.headers["x-revalidate-secret"]).toBe(SECRET);
    expect(JSON.parse(init.body)).toEqual({ tags: ["news", "news:a"], paths: ["/x"] });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("never throws when the frontend is unreachable, and never logs the secret", async () => {
    fetchMock.mockRejectedValue(new Error("connect ECONNREFUSED"));

    await expect(sendRevalidation(["pages"])).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(warn.mock.calls)).not.toContain(SECRET);
    expect(JSON.stringify(warn.mock.calls)).toContain("ECONNREFUSED");
  });

  it("logs (without throwing) when the frontend rejects the request", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401 });

    await expect(sendRevalidation(["pages"])).resolves.toBeUndefined();

    expect(JSON.stringify(warn.mock.calls)).toContain("401");
    expect(JSON.stringify(warn.mock.calls)).not.toContain(SECRET);
  });
});

describe("revalidateFrontend (fire and forget)", () => {
  it("returns synchronously and swallows failures", () => {
    fetchMock.mockRejectedValue(new Error("boom"));

    expect(revalidateFrontend([REVALIDATE_TAGS.settings])).toBeUndefined();
  });
});

describe("tag helpers", () => {
  it("builds the documented tag names", () => {
    expect(REVALIDATE_TAGS.newsItem("a-b")).toBe("news:a-b");
    expect(REVALIDATE_TAGS.category("sports")).toBe("category:sports");
    expect([
      REVALIDATE_TAGS.news,
      REVALIDATE_TAGS.settings,
      REVALIDATE_TAGS.homepage,
      REVALIDATE_TAGS.pages,
    ]).toEqual(["news", "settings", "homepage", "pages"]);
  });
});
