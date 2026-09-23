import { describe, expect, it, vi } from "vitest";

import { authMiddleware, isSuperAdmin, role } from "../middleware/auth.middleware.js";
import router from "./advertisement.route.js";

type Handler = (...args: never[]) => unknown;

interface RouteInfo {
  method: string;
  path: string;
  handlers: Handler[];
}

// Reads the Express router's own stack, so this checks the real wiring.
const routes: RouteInfo[] = (
  router as unknown as {
    stack: {
      route?: { path: string; methods: Record<string, boolean>; stack: { handle: Handler }[] };
    }[];
  }
).stack
  .filter((layer) => layer.route)
  .map((layer) => ({
    method: Object.keys(layer.route!.methods)[0],
    path: layer.route!.path,
    handlers: layer.route!.stack.map((s) => s.handle),
  }));

const find = (method: string, path: string) => {
  const found = routes.find((r) => r.method === method && r.path === path);
  if (!found) throw new Error(`route ${method.toUpperCase()} ${path} not found`);
  return found;
};

describe("advertisement route authorization", () => {
  it.each([
    ["get", "/"],
    ["get", "/:id"],
    ["post", "/"],
    ["patch", "/:id"],
  ])("%s %s requires authentication and admin/superadmin, in that order", (method, path) => {
    const { handlers } = find(method, path);
    const auth = handlers.indexOf(authMiddleware as Handler);
    const admin = handlers.indexOf(role as Handler);

    expect(auth).toBeGreaterThanOrEqual(0);
    expect(admin).toBeGreaterThan(auth);
  });

  it("the role check runs immediately after auth, before file upload and validation", () => {
    for (const [method, path] of [["post", "/"], ["patch", "/:id"]]) {
      const { handlers } = find(method, path);
      expect(handlers.indexOf(authMiddleware as Handler)).toBe(0);
      expect(handlers.indexOf(role as Handler)).toBe(1);
      // multer, validate and the controller follow.
      expect(handlers.length).toBe(5);
    }
  });

  it("DELETE authorization is unchanged: superadmin only", () => {
    const { handlers } = find("delete", "/:id");
    expect(handlers.indexOf(authMiddleware as Handler)).toBe(0);
    expect(handlers.indexOf(isSuperAdmin as Handler)).toBe(1);
    expect(handlers).not.toContain(role as Handler);
  });

  it("GET /active stays public", () => {
    const { handlers } = find("get", "/active");
    expect(handlers).not.toContain(authMiddleware as Handler);
    expect(handlers).not.toContain(role as Handler);
  });
});

describe("role middleware", () => {
  const run = async (userRole?: string) => {
    const next = vi.fn();
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    await role({ user: userRole ? { role: userRole } : undefined } as never, { status } as never, next);
    return { next, status };
  };

  it.each(["admin", "superadmin"])("lets %s through", async (userRole) => {
    const { next, status } = await run(userRole);
    expect(next).toHaveBeenCalledOnce();
    expect(status).not.toHaveBeenCalled();
  });

  it.each(["editor", "user", undefined])("blocks %s with 403", async (userRole) => {
    const { next, status } = await run(userRole);
    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
  });
});

describe("advertisement uploads", () => {
  it("allow 8 MB per ad image (animated GIF banners), while the default upload stays 5 MB", async () => {
    const { adUpload, AD_UPLOAD_MAX_BYTES } = await import("../middleware/multer.js");
    const { default: upload } = await import("../middleware/multer.js");

    expect(AD_UPLOAD_MAX_BYTES).toBe(8 * 1024 * 1024);
    expect((adUpload as unknown as { limits: { fileSize: number } }).limits.fileSize).toBe(8 * 1024 * 1024);
    expect((upload as unknown as { limits: { fileSize: number } }).limits.fileSize).toBe(5 * 1024 * 1024);
  });
});
