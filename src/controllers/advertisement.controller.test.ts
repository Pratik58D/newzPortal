import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/logger.js", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock("../models/advertisement.model.js", () => ({
  default: { find: vi.fn(), findById: vi.fn(), create: vi.fn() },
}));

vi.mock("../services/media.service.js", () => ({
  uploadAdvertisementImages: vi.fn(),
  deleteAdvertisementImages: vi.fn(),
}));

import Advertisement from "../models/advertisement.model.js";
import { deleteAdvertisementImages, uploadAdvertisementImages } from "../services/media.service.js";
import {
  createAdvertisement,
  deleteAdvertisement,
  getAdvertisementSlots,
  updateAdvertisement,
} from "./advertisement.controller.js";

const model = Advertisement as unknown as Record<string, ReturnType<typeof vi.fn>>;
const upload = uploadAdvertisementImages as unknown as ReturnType<typeof vi.fn>;
const remove = deleteAdvertisementImages as unknown as ReturnType<typeof vi.fn>;

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

const stored = (over: object = {}) => ({
  _id: "ad1",
  title: "Ad",
  redirectUrl: "https://example.com",
  image: { url: "https://cdn.test/a.jpg", key: "a" },
  placement: "sidebar",
  placements: ["sidebar"],
  priority: 50,
  weight: 1,
  startDate: new Date("2026-01-01"),
  endDate: new Date("2027-01-01"),
  isActive: true,
  ...over,
});

const file = { fieldname: "image" } as Express.Multer.File;

describe("GET /slots", () => {
  beforeEach(() => model.find.mockReset());

  it("queries only live ads and returns public fields per slot", async () => {
    model.find.mockReturnValue({
      lean: async () => [
        stored({ _id: "s1", placements: ["sidebar", "footer_top"], priority: 99, weight: 7 }),
        stored({ _id: "old", placements: undefined, placement: "top_banner" }),
        stored({ _id: "bad", redirectUrl: "javascript:alert(1)" }),
      ],
    });

    const { payload } = await run(getAdvertisementSlots);

    const filter = model.find.mock.calls[0][0];
    expect(filter.isActive).toBe(true);
    expect(filter.startDate.$lte).toBeInstanceOf(Date);
    expect(filter.endDate.$gte).toBeInstanceOf(Date);

    const { slots, pools } = payload.data as {
      slots: Record<string, { id: string }[]>;
      pools: Record<string, { id: string }[]>;
    };
    expect(slots.sidebar.map((a) => a.id)).toEqual(["s1"]);
    expect(slots.footer_top.map((a) => a.id)).toEqual(["s1"]);
    expect(slots.top_banner.map((a) => a.id)).toEqual(["old"]);
    expect(slots.home_banner).toEqual([]);

    // s1 has priority 99 (only ad in sidebar/footer_top), weight 7: the pool
    // repeats it 7x for client-side weighted rotation, still without leaking
    // the number itself.
    expect(pools.sidebar.map((a) => a.id)).toEqual(Array(7).fill("s1"));

    const json = JSON.stringify(payload);
    for (const secret of ["priority", "weight", "placements", '"key"', "startDate", "endDate", "isActive"]) {
      expect(json).not.toContain(secret);
    }
    expect(json).not.toContain("javascript:");
  });

  it("answers with empty slots and pools when nothing is live", async () => {
    model.find.mockReturnValue({ lean: async () => [] });

    const { payload } = await run(getAdvertisementSlots);

    const { slots, pools } = payload.data as {
      slots: Record<string, unknown[]>;
      pools: Record<string, unknown[]>;
    };
    expect(Object.values(slots).every((l) => l.length === 0)).toBe(true);
    expect(Object.values(pools).every((l) => l.length === 0)).toBe(true);
  });
});

describe("revalidation hooks", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    process.env.FRONTEND_REVALIDATE_URL = "http://frontend.test";
    process.env.REVALIDATE_SECRET = "s3cret";
    upload.mockReset().mockResolvedValue([{ url: "https://cdn.test/n.jpg", key: "n" }]);
    remove.mockReset().mockResolvedValue(undefined);
    model.create.mockReset().mockResolvedValue(stored());
    model.findById.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.FRONTEND_REVALIDATE_URL;
    delete process.env.REVALIDATE_SECRET;
  });

  const tagsSent = (call = 0) => JSON.parse(fetchMock.mock.calls[call][1].body).tags;

  const body = {
    title: "Ad",
    redirectUrl: "https://example.com",
    placement: "sidebar",
    placements: ["sidebar", "footer_top"],
    startDate: "2026-01-01",
    endDate: "2027-01-01",
    priority: 70,
  };

  it("create invalidates the ads tag and stores placements/priority", async () => {
    const { status } = await run(createAdvertisement, { body, files: { image: [file] } });

    expect(status).toBe(201);
    expect(tagsSent()).toEqual(["ads"]);
    const created = model.create.mock.calls[0][0];
    expect(created.placements).toEqual(["sidebar", "footer_top"]);
    expect(created.priority).toBe(70);
    expect(created).not.toHaveProperty("mobileImage");
  });

  it("create still requires the desktop image", async () => {
    await expect(run(createAdvertisement, { body, files: {} })).rejects.toMatchObject({ statusCode: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("create stores an uploaded mobile image, and cleans up if that upload fails", async () => {
    upload
      .mockResolvedValueOnce([{ url: "https://cdn.test/d.jpg", key: "d" }])
      .mockResolvedValueOnce([{ url: "https://cdn.test/m.jpg", key: "m" }]);
    await run(createAdvertisement, { body, files: { image: [file], mobileImage: [file] } });
    expect(model.create.mock.calls[0][0].mobileImage).toEqual({ url: "https://cdn.test/m.jpg", key: "m" });

    upload.mockReset().mockResolvedValueOnce([{ url: "https://cdn.test/d.jpg", key: "d" }]).mockRejectedValueOnce(new Error("cloudinary down"));
    await expect(
      run(createAdvertisement, { body, files: { image: [file], mobileImage: [file] } }),
    ).rejects.toThrow("cloudinary down");
    expect(remove).toHaveBeenCalledWith([{ url: "https://cdn.test/d.jpg", key: "d" }]);
  });

  it("still succeeds when the frontend is unreachable", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const { status, payload } = await run(createAdvertisement, { body, files: { image: [file] } });

    expect(status).toBe(201);
    expect(payload.success).toBe(true);
  });

  const editable = (over: object = {}) => {
    const doc: Record<string, unknown> = {
      ...stored(),
      save: vi.fn().mockResolvedValue(undefined),
      set: vi.fn((key: string, value: unknown) => {
        doc[key] = value;
      }),
      ...over,
    };
    return doc;
  };

  it("update sets placements (mirroring the first into placement) and invalidates ads", async () => {
    const doc = editable();
    model.findById.mockResolvedValue(doc);

    await run(updateAdvertisement, { params: { id: "ad1" }, body: { placements: ["top_banner", "sidebar"], priority: 90 }, files: {} });

    expect(doc.placements).toEqual(["top_banner", "sidebar"]);
    expect(doc.placement).toBe("top_banner");
    expect(doc.priority).toBe(90);
    expect(doc.save).toHaveBeenCalled();
    expect(tagsSent()).toEqual(["ads"]);
  });

  it("update with only the legacy placement also fills placements", async () => {
    const doc = editable({ placements: undefined });
    model.findById.mockResolvedValue(doc);

    await run(updateAdvertisement, { params: { id: "ad1" }, body: { placement: "footer_top" }, files: {} });

    expect(doc.placements).toEqual(["footer_top"]);
  });

  it("a rejected update (bad dates) neither uploads, deletes, saves nor invalidates", async () => {
    const doc = editable();
    model.findById.mockResolvedValue(doc);

    await expect(
      run(updateAdvertisement, {
        params: { id: "ad1" },
        body: { startDate: "2028-01-01", endDate: "2027-01-01" },
        files: { image: [file] },
      }),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(upload).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(doc.save).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("replacing the images deletes the old ones only after the save", async () => {
    const order: string[] = [];
    const doc = editable({
      mobileImage: { url: "https://cdn.test/oldm.jpg", key: "oldm" },
      save: vi.fn(async () => { order.push("save"); }),
    });
    remove.mockImplementation(async () => { order.push("delete"); });
    model.findById.mockResolvedValue(doc);

    await run(updateAdvertisement, {
      params: { id: "ad1" },
      body: {},
      files: { image: [file], mobileImage: [file] },
    });

    expect(order).toEqual(["save", "delete"]);
    expect(remove.mock.calls[0][0]).toEqual([
      { url: "https://cdn.test/a.jpg", key: "a" },
      { url: "https://cdn.test/oldm.jpg", key: "oldm" },
    ]);
  });

  it("removeMobileImage clears the mobile image", async () => {
    const doc = editable({ mobileImage: { url: "https://cdn.test/m.jpg", key: "m" } });
    model.findById.mockResolvedValue(doc);

    await run(updateAdvertisement, { params: { id: "ad1" }, body: { removeMobileImage: "true" }, files: {} });

    expect(doc.mobileImage).toBeUndefined();
    expect(remove).toHaveBeenCalledWith([{ url: "https://cdn.test/m.jpg", key: "m" }]);
  });

  it("delete removes both images and invalidates ads", async () => {
    const doc = editable({
      mobileImage: { url: "https://cdn.test/m.jpg", key: "m" },
      deleteOne: vi.fn().mockResolvedValue(undefined),
    });
    model.findById.mockResolvedValue(doc);

    await run(deleteAdvertisement, { params: { id: "ad1" } });

    expect(remove.mock.calls[0][0]).toHaveLength(2);
    expect(doc.deleteOne).toHaveBeenCalled();
    expect(tagsSent()).toEqual(["ads"]);
  });
});
