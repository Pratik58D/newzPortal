import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/logger.js", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock("../models/page.model.js", () => ({
  default: {
    estimatedDocumentCount: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    exists: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}));

import Page from "../models/page.model.js";
import {
  createPage,
  deletePage,
  getPageBySlug,
  getPages,
  updatePage,
} from "./page.controller.js";
import { pagesSeed } from "../seeds/siteContent.data.js";

const model = Page as unknown as Record<string, ReturnType<typeof vi.fn>>;
const ID = "507f1f77bcf86cd799439011";

// asyncHandler doesn't return its promise: resolve on res.json, reject on next.
function run(
  handler: (req: never, res: never, next: never) => void,
  req: object = {},
): Promise<{ status: number; payload: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    let status = 200;
    const res = {
      status(code: number) {
        status = code;
        return res;
      },
      json: (payload: Record<string, unknown>) => resolve({ status, payload }),
    };
    handler(req as never, res as never, reject as never);
  });
}

const doc = (over: object = {}) => ({
  _id: ID,
  slug: "about",
  title: { np: "क", en: "A" },
  body: { np: "x", en: "y" },
  isPublished: true,
  showInFooter: true,
  ...over,
});

const chain = (docs: unknown) => {
  const c: Record<string, unknown> = {};
  c.sort = () => c;
  c.select = () => c;
  c.lean = async () => docs;
  return c;
};

beforeEach(() => {
  Object.values(model).forEach((fn) => fn.mockReset());
});

describe("public reads", () => {
  it("serves the seeded published pages while the collection is empty", async () => {
    model.estimatedDocumentCount.mockResolvedValue(0);
    const { payload } = await run(getPages);
    expect((payload.data as unknown[]).length).toBe(
      pagesSeed.filter((p) => p.isPublished).length,
    );

    const one = await run(getPageBySlug, { params: { slug: "about" } });
    expect((one.payload.data as { slug: string }).slug).toBe("about");
  });

  it("404s an unknown slug in the seeded fallback", async () => {
    model.estimatedDocumentCount.mockResolvedValue(0);
    await expect(run(getPageBySlug, { params: { slug: "nope" } })).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("queries published only and 404s drafts/missing once the collection has data", async () => {
    model.estimatedDocumentCount.mockResolvedValue(3);
    model.findOne.mockReturnValue({ lean: async () => null });
    await expect(run(getPageBySlug, { params: { slug: "draft" } })).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(model.findOne).toHaveBeenCalledWith({ slug: "draft", isPublished: true });

    model.find.mockReturnValue(chain([doc()]));
    await run(getPages);
    expect(model.find).toHaveBeenCalledWith({ isPublished: true });
  });

  it("list omits bodies", async () => {
    model.estimatedDocumentCount.mockResolvedValue(1);
    model.find.mockReturnValue(chain([doc()]));
    const { payload } = await run(getPages);
    expect((payload.data as object[])[0]).not.toHaveProperty("body");
  });
});

describe("writes", () => {
  it("409s a duplicate slug on create, by lookup and by E11000", async () => {
    model.exists.mockResolvedValue({ _id: ID });
    await expect(run(createPage, { body: doc() })).rejects.toMatchObject({ statusCode: 409 });

    model.exists.mockResolvedValue(null);
    model.create.mockRejectedValue({ code: 11000 });
    await expect(run(createPage, { body: doc() })).rejects.toMatchObject({ statusCode: 409 });
  });

  it("creates with 201", async () => {
    model.exists.mockResolvedValue(null);
    model.create.mockResolvedValue({ toObject: () => doc() });
    const { status } = await run(createPage, { body: doc() });
    expect(status).toBe(201);
  });

  it("update: 400 bad id, 409 duplicate, 404 missing", async () => {
    await expect(run(updatePage, { params: { id: "x" }, body: doc() })).rejects.toMatchObject({
      statusCode: 400,
    });

    model.exists.mockResolvedValue({ _id: "other" });
    await expect(run(updatePage, { params: { id: ID }, body: doc() })).rejects.toMatchObject({
      statusCode: 409,
    });

    model.exists.mockResolvedValue(null);
    model.findByIdAndUpdate.mockReturnValue({ lean: async () => null });
    await expect(run(updatePage, { params: { id: ID }, body: doc() })).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("delete: 404 when missing, ok when found", async () => {
    model.findByIdAndDelete.mockReturnValue({ lean: async () => null });
    await expect(run(deletePage, { params: { id: ID } })).rejects.toMatchObject({
      statusCode: 404,
    });

    model.findByIdAndDelete.mockReturnValue({ lean: async () => doc() });
    const { payload } = await run(deletePage, { params: { id: ID } });
    expect(payload.success).toBe(true);
  });
});

describe("frontend revalidation", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    process.env.FRONTEND_REVALIDATE_URL = "http://frontend.test";
    process.env.REVALIDATE_SECRET = "s3cret";
    model.exists.mockResolvedValue(null);
    model.create.mockResolvedValue({ toObject: () => doc() });
    model.findByIdAndDelete.mockReturnValue({ lean: async () => doc() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.FRONTEND_REVALIDATE_URL;
    delete process.env.REVALIDATE_SECRET;
  });

  it("invalidates the pages tag after a successful create and delete", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await run(createPage, { body: doc() });
    await run(deletePage, { params: { id: ID } });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).tags).toEqual(["pages"]);
  });

  it("still succeeds when the frontend is unreachable", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const { status, payload } = await run(createPage, { body: doc() });

    expect(status).toBe(201);
    expect(payload.success).toBe(true);
  });

  it("does not notify when the write itself fails", async () => {
    model.exists.mockResolvedValue({ _id: ID });

    await expect(run(createPage, { body: doc() })).rejects.toMatchObject({ statusCode: 409 });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
