import { describe, expect, it } from "vitest";
import {
  createUserSchema,
  loginSchema,
  registerUserSchema,
  updateUserSchema,
} from "./user.validation.js";

describe("loginSchema", () => {
  it("accepts a well-formed login payload", () => {
    const result = loginSchema.safeParse({
      email: "User@Example.com",
      password: "anything",
    });
    expect(result.success).toBe(true);
    // trimmed + lowercased so it matches Mongoose's `lowercase: true` schema field
    expect(result.data?.email).toBe("user@example.com");
  });

  it("rejects a malformed email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "x" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing password", () => {
    const result = loginSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(false);
  });
});

describe("registerUserSchema", () => {
  it("rejects a password shorter than 6 characters", () => {
    const result = registerUserSchema.safeParse({
      name: "Test",
      email: "user@example.com",
      password: "123",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid registration payload", () => {
    const result = registerUserSchema.safeParse({
      name: "Test User",
      email: "user@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });
});

describe("createUserSchema", () => {
  it("rejects an invalid role", () => {
    const result = createUserSchema.safeParse({
      name: "Staff",
      email: "staff@example.com",
      password: "password123",
      role: "not-a-real-role",
    });
    expect(result.success).toBe(false);
  });

  it("allows role to be omitted (controller defaults to editor)", () => {
    const result = createUserSchema.safeParse({
      name: "Staff",
      email: "staff@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });
});

describe("updateUserSchema", () => {
  it("accepts an empty object (the 'at least one field' rule lives in the controller)", () => {
    const result = updateUserSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects a newPassword shorter than 6 characters", () => {
    const result = updateUserSchema.safeParse({ newPassword: "abc" });
    expect(result.success).toBe(false);
  });
});
