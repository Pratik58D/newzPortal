import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validateEnv } from "./env.js";

const REQUIRED_KEYS = [
  "JWT_SECRET",
  "MONGODB_URI_PROD",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
] as const;

describe("validateEnv", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    for (const key of REQUIRED_KEYS) {
      process.env[key] = `test-${key}`;
    }
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("does not exit when all required vars are present", () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    validateEnv();

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("exits with code 1 when a required var is missing", () => {
    delete process.env.JWT_SECRET;
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    validateEnv();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("reports every missing var, not just the first", () => {
    delete process.env.JWT_SECRET;
    delete process.env.CLOUDINARY_API_KEY;
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    validateEnv();

    const message = errorSpy.mock.calls[0][0] as string;
    expect(message).toContain("JWT_SECRET");
    expect(message).toContain("CLOUDINARY_API_KEY");
  });
});
