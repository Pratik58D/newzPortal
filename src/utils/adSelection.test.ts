import { describe, expect, it } from "vitest";

import { AD_SLOTS } from "../constants/adSlots.js";
import { buildSlotMap, buildSlotPools, selectAds, slotsOf, toPublicAd, type AdLike } from "./adSelection.js";

const ad = (over: Partial<AdLike> & { name?: string } = {}): AdLike & { name: string } => ({
  name: "a",
  _id: "id",
  title: "Title",
  image: { url: "https://cdn.test/a.jpg" },
  redirectUrl: "https://example.com",
  placements: ["sidebar"],
  ...over,
});

// A scripted rng: returns the given values in order (then 0).
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++] ?? 0;
};

describe("selectAds", () => {
  it("returns nothing for no ads or maxAds <= 0", () => {
    expect(selectAds([], 1)).toEqual([]);
    expect(selectAds([ad()], 0)).toEqual([]);
  });

  it("higher priority always beats lower, regardless of weight or rng", () => {
    const low = ad({ name: "low", priority: 10, weight: 10 });
    const high = ad({ name: "high", priority: 90, weight: 1 });
    for (const r of [0, 0.5, 0.999]) {
      expect(selectAds([low, high], 1, () => r)[0].name).toBe("high");
    }
  });

  it("falls back to lower tiers only to fill remaining slots", () => {
    const a = ad({ name: "a", priority: 90 });
    const b = ad({ name: "b", priority: 50 });
    const c = ad({ name: "c", priority: 10 });
    expect(selectAds([c, b, a], 2, () => 0).map((x) => x.name)).toEqual(["a", "b"]);
  });

  it("draws within a tier by weight", () => {
    const light = ad({ name: "light", priority: 50, weight: 1 });
    const heavy = ad({ name: "heavy", priority: 50, weight: 9 });
    // total 10: rng < 0.1 -> first (light); otherwise heavy.
    expect(selectAds([light, heavy], 1, () => 0.05)[0].name).toBe("light");
    expect(selectAds([light, heavy], 1, () => 0.5)[0].name).toBe("heavy");
    expect(selectAds([light, heavy], 1, () => 0.999)[0].name).toBe("heavy");
  });

  it("weighted draw roughly follows the weights over many draws", () => {
    const light = ad({ name: "light", priority: 50, weight: 1 });
    const heavy = ad({ name: "heavy", priority: 50, weight: 3 });
    let heavyCount = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) {
      if (selectAds([light, heavy], 1)[0].name === "heavy") heavyCount++;
    }
    expect(heavyCount / N).toBeGreaterThan(0.7);
    expect(heavyCount / N).toBeLessThan(0.8);
  });

  it("does not repeat an ad and respects maxAds", () => {
    const ads = ["a", "b", "c"].map((name) => ad({ name }));
    const result = selectAds(ads, 5, seq(0, 0, 0));
    expect(result.map((x) => x.name).sort()).toEqual(["a", "b", "c"]);
    expect(selectAds(ads, 2).length).toBe(2);
  });

  it("uses defaults for legacy ads without priority/weight, and ignores zero total weight", () => {
    const legacy = ad({ name: "legacy" });
    const modern = ad({ name: "modern", priority: 60 });
    expect(selectAds([legacy, modern], 1)[0].name).toBe("modern");
    const zero = [ad({ name: "z1", weight: 0 }), ad({ name: "z2", weight: 0 })];
    expect(selectAds(zero, 1)).toHaveLength(1);
  });

  it("does not mutate its input", () => {
    const ads = [ad({ name: "a" }), ad({ name: "b", priority: 90 })];
    const copy = [...ads];
    selectAds(ads, 1);
    expect(ads).toEqual(copy);
  });
});

describe("slotsOf", () => {
  it("prefers placements, falls back to the legacy placement, drops unknown keys", () => {
    expect(slotsOf({ placements: ["sidebar", "top_banner"] })).toEqual(["sidebar", "top_banner"]);
    expect(slotsOf({ placement: "home_banner" })).toEqual(["home_banner"]);
    expect(slotsOf({ placements: [], placement: "sidebar" })).toEqual(["sidebar"]);
    expect(slotsOf({ placements: ["sidebar", "bogus"] })).toEqual(["sidebar"]);
    expect(slotsOf({})).toEqual([]);
  });
});

describe("toPublicAd", () => {
  it("exposes only public fields and applies defaults", () => {
    const pub = toPublicAd(
      ad({ _id: "x1", priority: 99, weight: 5, placements: ["sidebar"], altText: "  " }) as AdLike,
    );
    expect(pub).toEqual({
      id: "x1",
      title: "Title",
      alt: "Title",
      image: { url: "https://cdn.test/a.jpg" },
      redirectUrl: "https://example.com",
      sponsorLabel: "",
      devices: "all",
    });
    expect(pub).not.toHaveProperty("priority");
    expect(pub).not.toHaveProperty("placements");
  });

  it("includes the mobile image and custom alt/label when set", () => {
    const pub = toPublicAd(
      ad({ mobileImage: { url: "https://cdn.test/m.jpg" }, altText: "Alt", sponsorLabel: "Sponsored" }) as AdLike,
    );
    expect(pub.mobileImage).toEqual({ url: "https://cdn.test/m.jpg" });
    expect(pub.alt).toBe("Alt");
    expect(pub.sponsorLabel).toBe("Sponsored");
  });
});

describe("buildSlotMap", () => {
  it("returns an entry for every registered slot, empty when unused", () => {
    const map = buildSlotMap([]);
    expect(Object.keys(map)).toEqual(AD_SLOTS.map((s) => s.key));
    expect(Object.values(map).every((list) => list.length === 0)).toBe(true);
  });

  it("puts an ad in each slot it lists and only there", () => {
    const map = buildSlotMap([ad({ _id: "1", placements: ["sidebar", "footer_top"] })]);
    expect(map.sidebar.map((a) => a.id)).toEqual(["1"]);
    expect(map.footer_top.map((a) => a.id)).toEqual(["1"]);
    expect(map.top_banner).toEqual([]);
  });

  it("serves a legacy ad (no placements) from its single placement", () => {
    const map = buildSlotMap([ad({ _id: "L", placements: undefined, placement: "top_banner" })]);
    expect(map.top_banner.map((a) => a.id)).toEqual(["L"]);
  });

  it("drops ads with an unsafe redirect URL", () => {
    const map = buildSlotMap([
      ad({ _id: "bad1", redirectUrl: "javascript:alert(1)" }),
      ad({ _id: "bad2", redirectUrl: "https://u:p@example.com" }),
      ad({ _id: "good" }),
    ]);
    expect(map.sidebar.map((a) => a.id)).toEqual(["good"]);
  });

  it("stacks ads in a multi-ad slot, highest priority first", () => {
    const map = buildSlotMap([
      ad({ _id: "low", priority: 5, placements: ["sidebar"] }),
      ad({ _id: "high", priority: 95, placements: ["sidebar", "top_banner"] }),
    ]);
    expect(map.sidebar.map((a) => a.id)).toEqual(["high", "low"]);
    expect(map.top_banner.map((a) => a.id)).toEqual(["high"]);
  });

  it("caps each slot at its maxAds: top banner 2, sidebar 3, single-ad slots 1", () => {
    const many = (slot: string, n: number) =>
      Array.from({ length: n }, (_, i) => ad({ _id: `${slot}-${i}`, priority: 100 - i, placements: [slot] }));

    const map = buildSlotMap([
      ...many("top_banner", 5),
      ...many("sidebar", 5),
      ...many("footer_top", 5),
      ...many("home_banner", 5),
    ]);

    expect(map.top_banner.map((a) => a.id)).toEqual(["top_banner-0", "top_banner-1"]);
    expect(map.sidebar.map((a) => a.id)).toEqual(["sidebar-0", "sidebar-1", "sidebar-2"]);
    expect(map.footer_top).toHaveLength(1);
    expect(map.home_banner).toHaveLength(1);
  });

  it("lets a lower-priority ad fill a free stack position, but never displace a higher one", () => {
    const map = buildSlotMap([
      ad({ _id: "a", priority: 90, placements: ["top_banner"] }),
      ad({ _id: "b", priority: 10, placements: ["top_banner"] }),
      ad({ _id: "c", priority: 50, placements: ["top_banner"] }),
    ]);
    expect(map.top_banner.map((a) => a.id)).toEqual(["a", "c"]);
  });
});

describe("buildSlotPools", () => {
  it("includes only the top priority tier, each ad repeated by weight", () => {
    const pools = buildSlotPools([
      ad({ _id: "high", priority: 90, weight: 3, placements: ["sidebar"] }),
      ad({ _id: "low", priority: 10, weight: 5, placements: ["sidebar"] }),
    ]);
    expect(pools.sidebar.map((a) => a.id)).toEqual(["high", "high", "high"]);
  });

  it("never leaks weight or priority on a pool entry", () => {
    const pools = buildSlotPools([ad({ _id: "x", priority: 90, weight: 5, placements: ["sidebar"] })]);
    const json = JSON.stringify(pools.sidebar);
    expect(json).not.toContain("weight");
    expect(json).not.toContain("priority");
  });

  it("caps a pool at 30 entries even with a large weight", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      ad({ _id: `s-${i}`, priority: 50, weight: 10, placements: ["sidebar"] }),
    );
    const pools = buildSlotPools(many);
    expect(pools.sidebar.length).toBe(30);
  });

  it("empty when nothing is eligible", () => {
    const pools = buildSlotPools([]);
    for (const slot of AD_SLOTS) expect(pools[slot.key]).toEqual([]);
  });
});
