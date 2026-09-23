import { describe, expect, it } from "vitest";

import Advertisement from "../models/advertisement.model.js";
import {
  createAdvertisementSchema,
  updateAdvertisementSchema,
} from "../validation/advertisement.validation.js";
import { updateHomepageSchema } from "../validation/homepage.validation.js";
import { AD_SLOT_KEYS, AD_SLOTS, isAdSlotKey } from "./adSlots.js";

// The slots that existed before Phase 1 must never change key or meaning:
// stored ads and homepage sections refer to them by these strings.
const LEGACY = ["top_banner", "home_banner", "sidebar", "news_detail_top", "news_detail_bottom"];
const ADDED = ["home_mid", "home_bottom", "footer_top", "sidebar_secondary", "in_list"];
const ALL = [...LEGACY, ...ADDED];

const validAd = {
  title: "Ad",
  redirectUrl: "https://example.com/landing",
  startDate: "2026-01-01",
  endDate: "2026-02-01",
};

describe("ad slot registry", () => {
  it("keeps the five legacy slots first and unchanged, then the new ones", () => {
    expect(AD_SLOTS.map((slot) => slot.key)).toEqual(ALL);
    expect([...AD_SLOT_KEYS]).toEqual(ALL);
    expect(AD_SLOTS.slice(0, 5).map((slot) => slot.key)).toEqual(LEGACY);
  });

  it("has unique keys, non-empty labels and a positive maxAds", () => {
    expect(new Set(AD_SLOTS.map((slot) => slot.key)).size).toBe(AD_SLOTS.length);
    expect(AD_SLOTS.every((slot) => slot.label.trim().length > 0)).toBe(true);
    expect(AD_SLOTS.every((slot) => Number.isInteger(slot.maxAds) && slot.maxAds >= 1)).toBe(true);
  });

  it("marks exactly the homepage slots", () => {
    expect(AD_SLOTS.filter((slot) => slot.homepage).map((slot) => slot.key)).toEqual([
      "home_banner",
      "home_mid",
      "home_bottom",
    ]);
  });

  it("isAdSlotKey accepts only registered keys", () => {
    for (const key of ALL) expect(isAdSlotKey(key)).toBe(true);
    for (const key of ["header", "", "SIDEBAR", 5, null, undefined]) {
      expect(isAdSlotKey(key)).toBe(false);
    }
  });
});

describe("registry is the only source of slot values", () => {
  it("the mongoose model enums match", () => {
    const single = Advertisement.schema.path("placement") as unknown as { enumValues: string[] };
    expect(single.enumValues).toEqual(ALL);

    const list = Advertisement.schema.path("placements") as unknown as {
      caster?: { enumValues: string[] };
      embeddedSchemaType?: { enumValues: string[] };
    };
    const enumValues = (list.embeddedSchemaType ?? list.caster)?.enumValues;
    expect(enumValues).toEqual(ALL);
  });

  it("create/update advertisement schemas accept every slot and reject others", () => {
    for (const placement of ALL) {
      expect(createAdvertisementSchema.safeParse({ ...validAd, placement }).success).toBe(true);
      expect(createAdvertisementSchema.safeParse({ ...validAd, placements: JSON.stringify([placement]) }).success).toBe(true);
      expect(updateAdvertisementSchema.safeParse({ placement }).success).toBe(true);
    }
    expect(createAdvertisementSchema.safeParse({ ...validAd, placement: "header" }).success).toBe(false);
    expect(createAdvertisementSchema.safeParse({ ...validAd, placements: '["header"]' }).success).toBe(false);
    expect(updateAdvertisementSchema.safeParse({ placement: "nope" }).success).toBe(false);
  });

  it("the homepage banner-ad section accepts every slot and rejects others", () => {
    const parse = (placement: string) =>
      updateHomepageSchema.safeParse({
        sections: [
          {
            type: "banner-ad",
            enabled: true,
            title: { np: "", en: "" },
            config: { placement },
          },
        ],
      }).success;

    for (const placement of ALL) expect(parse(placement)).toBe(true);
    expect(parse("header")).toBe(false);
  });

  it("the homepage allows one banner-ad section per slot", () => {
    const banner = (placement: string) => ({
      type: "banner-ad",
      enabled: true,
      title: { np: "", en: "" },
      config: { placement },
    });
    const parse = (...placements: string[]) =>
      updateHomepageSchema.safeParse({ sections: placements.map(banner) }).success;

    expect(parse("home_banner", "home_mid", "home_bottom")).toBe(true);
    expect(parse("home_banner", "home_banner")).toBe(false);
  });
});

describe("slot capacity and size hints", () => {
  it("stacks 2 ads in the top banner, 3 in the sidebar, 4 in the in-list slot; every other slot shows 1", () => {
    const max = Object.fromEntries(AD_SLOTS.map((slot) => [slot.key, slot.maxAds]));
    expect(max.top_banner).toBe(2);
    expect(max.sidebar).toBe(3);
    expect(max.in_list).toBe(4);
    for (const key of ALL.filter((k) => !["top_banner", "sidebar", "in_list"].includes(k))) {
      expect(max[key]).toBe(1);
    }
  });

  it("gives every slot a recommended size for the admin form", () => {
    expect(AD_SLOTS.every((slot) => slot.sizeHint.trim().length > 0)).toBe(true);
  });
});
