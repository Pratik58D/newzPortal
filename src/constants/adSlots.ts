// Single source of truth for where an advertisement may be placed. The model
// enum, the advertisement and homepage validation schemas and the public
// /slots endpoint all derive from this list; the frontend mirrors it in
// newsportal_frontend/lib/adSlots.ts (keep the two in step, as with the cache
// tags).
//
// Each key is the value stored on an ad (`placements`, and the legacy
// single `placement`) and in a homepage `banner-ad` section's
// `config.placement`, so existing documents stay valid.
//
//   maxAds    how many ads one slot shows at once (stacked, top to bottom)
//   homepage  offered as a target for homepage "banner ad" sections
//   sizeHint  recommended creative size, shown in the admin form

export const AD_SLOTS = [
  { key: "top_banner", label: "Top Banner", maxAds: 2, homepage: false, sizeHint: "wide strip, about 1210 × 95 px" },
  { key: "home_banner", label: "Home Banner", maxAds: 1, homepage: true, sizeHint: "wide banner, about 1210 × 150 px" },
  { key: "sidebar", label: "Sidebar", maxAds: 3, homepage: false, sizeHint: "300 px wide, any height" },
  { key: "news_detail_top", label: "News Detail (Top)", maxAds: 1, homepage: false, sizeHint: "wide banner, about 800 × 120 px" },
  { key: "news_detail_bottom", label: "News Detail (Bottom)", maxAds: 1, homepage: false, sizeHint: "wide banner, about 800 × 120 px" },
  { key: "home_mid", label: "Home Middle", maxAds: 1, homepage: true, sizeHint: "wide banner, about 1210 × 150 px" },
  { key: "home_bottom", label: "Home Bottom", maxAds: 1, homepage: true, sizeHint: "wide banner, about 1210 × 150 px" },
  { key: "footer_top", label: "Above Footer", maxAds: 1, homepage: false, sizeHint: "wide strip, about 1210 × 95 px" },
  { key: "sidebar_secondary", label: "Sidebar (Lower)", maxAds: 1, homepage: false, sizeHint: "300 px wide, any height" },
  // Phase 2: dropped into a news list every N cards (see InListAdSlot on the
  // frontend); several candidates so consecutive insertion points differ.
  { key: "in_list", label: "In-List (feed)", maxAds: 4, homepage: false, sizeHint: "wide banner, about 800 × 120 px" },
] as const;

export type AdSlotKey = (typeof AD_SLOTS)[number]["key"];

// Tuple form for z.enum() / mongoose `enum`.
export const AD_SLOT_KEYS = AD_SLOTS.map((slot) => slot.key) as unknown as readonly [
  AdSlotKey,
  ...AdSlotKey[],
];

export const isAdSlotKey = (value: unknown): value is AdSlotKey =>
  typeof value === "string" && (AD_SLOT_KEYS as readonly string[]).includes(value);
