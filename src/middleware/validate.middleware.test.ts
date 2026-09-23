import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { Request, Response } from "express";
import { validate } from "./validate.middleware.js";

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

const schema = z.object({
  name: z.string().min(1, "Name is required"),
});

describe("validate middleware", () => {
  it("calls next() and normalizes req.body when validation passes", () => {
    const req = { body: { name: "ok" } } as Request;
    const res = makeRes();
    const next = vi.fn();

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.body).toEqual({ name: "ok" });
    expect(res.status).not.toHaveBeenCalled();
  });

  it("responds 400 with field errors and does not call next() when validation fails", () => {
    const req = { body: {} } as Request;
    const res = makeRes();
    const next = vi.fn();

    validate(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(false);
    expect(payload.message).toBe("Validation failed");
    expect(payload.errors.name).toBeDefined();
  });
});
