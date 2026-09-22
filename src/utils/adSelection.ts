import { AD_SLOTS, isAdSlotKey, type AdSlotKey } from "../constants/adSlots.js";
import { redirectUrlProblem } from "../validation/redirectUrl.js";

// Pure helpers behind GET /api/advertisements/slots.

// Defaults applied to ads saved before `priority` / `weight` existed.
export const DEFAULT_PRIORITY = 50;
export const DEFAULT_WEIGHT = 1;
// No label unless an admin types one on the ad (clean look, like the reference site).
export const DEFAULT_SPONSOR_LABEL = "";

export interface AdLike {
  _id?: unknown;
  title: string;
  altText?: string;
  image: { url: string };
  mobileImage?: { url: string } | null;
  redirectUrl: string;
  placement?: string;
  placements?: string[];
  priority?: number;
  weight?: number;
  sponsorLabel?: string;
  devices?: "all" | "desktop" | "mobile";
}

// The slots an ad appears in: `placements`, or the legacy single `placement`
// for documents saved before `placements` existed.
export function slotsOf(ad: Pick<AdLike, "placement" | "placements">): AdSlotKey[] {
  const raw = ad.placements?.length ? ad.placements : ad.placement ? [ad.placement] : [];
  return raw.filter(isAdSlotKey);
}

// Picks up to `maxAds` ads for one slot: higher `priority` always wins; ads of
// equal priority are drawn at random, weighted by `weight`. `rng` is injectable
// (returns [0, 1)) so the result is testable. Never mutates the input.
export function selectAds<T extends Pick<AdLike, "priority" | "weight">>(
  ads: readonly T[],
  maxAds: number,
  rng: () => number = Math.random,
): T[] {
  if (maxAds <= 0 || ads.length === 0) return [];

  const tiers = new Map<number, T[]>();
  for (const ad of ads) {
    const priority = ad.priority ?? DEFAULT_PRIORITY;
    tiers.set(priority, [...(tiers.get(priority) ?? []), ad]);
  }

  const selected: T[] = [];

  for (const priority of [...tiers.keys()].sort((a, b) => b - a)) {
    const pool = [...tiers.get(priority)!];

    while (pool.length > 0 && selected.length < maxAds) {
      const weights = pool.map((ad) => Math.max(ad.weight ?? DEFAULT_WEIGHT, 0));
      const total = weights.reduce((sum, weight) => sum + weight, 0);

      let index = 0;
      if (total > 0) {
        let target = rng() * total;
        index = weights.findIndex((weight) => (target -= weight) < 0);
        if (index === -1) index = pool.length - 1;
      }

      selected.push(pool.splice(index, 1)[0]);
    }

    if (selected.length >= maxAds) break;
  }

  return selected;
}

// The only fields the public site ever receives: no dates, priority, weight,
// storage keys or internal ids beyond a stable id for React keys.
export interface PublicAd {
  id: string;
  title: string;
  alt: string;
  image: { url: string };
  mobileImage?: { url: string };
  redirectUrl: string;
  sponsorLabel: string;
  devices: "all" | "desktop" | "mobile";
}

export function toPublicAd(ad: AdLike): PublicAd {
  return {
    id: String(ad._id ?? ""),
    title: ad.title,
    alt: ad.altText?.trim() || ad.title,
    image: { url: ad.image.url },
    ...(ad.mobileImage?.url ? { mobileImage: { url: ad.mobileImage.url } } : {}),
    redirectUrl: ad.redirectUrl,
    sponsorLabel: ad.sponsorLabel?.trim() || DEFAULT_SPONSOR_LABEL,
    devices: ad.devices ?? "all",
  };
}

// Groups live ads into `{ slotKey: PublicAd[] }` for every registered slot
// (empty array when nothing qualifies). Ads whose redirect URL breaks the
// http(s) rule (e.g. stored before the rule existed) are dropped here rather
// than sent to the browser.
export function buildSlotMap(
  liveAds: readonly AdLike[],
  rng: () => number = Math.random,
): Record<AdSlotKey, PublicAd[]> {
  const safe = liveAds.filter((ad) => redirectUrlProblem(ad.redirectUrl ?? "") === null);

  return Object.fromEntries(
    AD_SLOTS.map((slot) => {
      const forSlot = safe.filter((ad) => slotsOf(ad).includes(slot.key));
      return [slot.key, selectAds(forSlot, slot.maxAds, rng).map(toPublicAd)];
    }),
  ) as Record<AdSlotKey, PublicAd[]>;
}

// A pool entry appears more than once when its `weight` says it should win a
// draw more often - so the client can pick uniformly at random and still
// reproduce weighted odds, without `weight` itself ever reaching the browser
// (same rule as `priority`/`weight`/dates being excluded from PublicAd).
const MAX_POOL_ENTRIES = 30;

// The full pool a slot could draw from: every safe, live, eligible ad in the
// slot's *highest present* priority tier (a lower-priority ad must never
// appear just because the client re-rolled), each repeated by weight.
// `buildSlotMap` is the server-rendered / no-JS pick (one draw per cache
// window); the frontend's AdRotator client component re-draws from this pool
// after mount so different visitors in the same window can see a different
// ad among ties. A slot with only one eligible ad has a pool of one entry,
// so nothing rotates.
export function buildSlotPools(
  liveAds: readonly AdLike[],
): Record<AdSlotKey, PublicAd[]> {
  const safe = liveAds.filter((ad) => redirectUrlProblem(ad.redirectUrl ?? "") === null);

  return Object.fromEntries(
    AD_SLOTS.map((slot) => {
      const forSlot = safe.filter((ad) => slotsOf(ad).includes(slot.key));
      const topPriority = forSlot.reduce(
        (max, ad) => Math.max(max, ad.priority ?? DEFAULT_PRIORITY),
        -Infinity,
      );
      const tier = forSlot.filter((ad) => (ad.priority ?? DEFAULT_PRIORITY) === topPriority);

      const pool: PublicAd[] = [];
      for (const ad of tier) {
        const copies = Math.max(ad.weight ?? DEFAULT_WEIGHT, 1);
        for (let i = 0; i < copies && pool.length < MAX_POOL_ENTRIES; i++) {
          pool.push(toPublicAd(ad));
        }
      }

      return [slot.key, pool];
    }),
  ) as Record<AdSlotKey, PublicAd[]>;
}
