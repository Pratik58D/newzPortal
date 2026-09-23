import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { sanitizeInput } from "./sanitize.middleware.js";

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    params: {},
    query: {},
    ...overrides,
  } as Request;
}

describe("sanitizeInput", () => {
  it("strips $-prefixed operator keys from req.body", () => {
    const req = makeReq({
      body: { email: { $gt: "" }, password: { $gt: "" } },
    });
    const next = vi.fn();

    sanitizeInput(req, {} as Response, next);

    expect(req.body).toEqual({ email: {}, password: {} });
    expect(next).toHaveBeenCalledOnce();
  });

  it("strips dotted keys (Mongo field-path injection)", () => {
    const req = makeReq({
      body: { "role.$set": "admin", name: "ok" },
    });

    sanitizeInput(req, {} as Response, vi.fn());

    expect(req.body).toEqual({ name: "ok" });
  });

  it("recurses into nested objects and arrays", () => {
    const req = makeReq({
      body: {
        items: [{ $where: "1==1" }, { safe: "value" }],
        nested: { deeper: { $ne: null } },
      },
    });

    sanitizeInput(req, {} as Response, vi.fn());

    expect(req.body).toEqual({
      items: [{}, { safe: "value" }],
      nested: { deeper: {} },
    });
  });

  it("leaves normal payloads untouched", () => {
    const original = { email: "user@example.com", password: "secret123" };
    const req = makeReq({ body: { ...original } });

    sanitizeInput(req, {} as Response, vi.fn());

    expect(req.body).toEqual(original);
  });

  it("sanitizes req.query and req.params by mutating in place (never reassigns them)", () => {
    const req = makeReq({
      query: { search: { $gt: "" } },
      params: { id: "abc" },
    });
    const queryRef = req.query;
    const paramsRef = req.params;

    sanitizeInput(req, {} as Response, vi.fn());

    // Same object references — this is the Express 5 compatibility guarantee
    // (req.query has no setter there), not just equal values.
    expect(req.query).toBe(queryRef);
    expect(req.params).toBe(paramsRef);
    expect(req.query).toEqual({ search: {} });
  });

  it("always calls next()", () => {
    const next = vi.fn();
    sanitizeInput(makeReq(), {} as Response, next);
    expect(next).toHaveBeenCalledOnce();
  });
});
