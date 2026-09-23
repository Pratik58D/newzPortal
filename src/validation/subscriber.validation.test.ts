import { describe, expect, it } from "vitest";
import { subscribeSchema } from "./subscriber.validation.js";

describe("subscribeSchema", () => {
  it("accepts a valid email", () => {
    const result = subscribeSchema.safeParse({ email: "reader@example.com" });
    expect(result.success).toBe(true);
  });

  it("lowercases and trims the email", () => {
    const result = subscribeSchema.safeParse({ email: "  Reader@Example.com  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("reader@example.com");
    }
  });

  it("rejects a malformed email", () => {
    const result = subscribeSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing email", () => {
    const result = subscribeSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
