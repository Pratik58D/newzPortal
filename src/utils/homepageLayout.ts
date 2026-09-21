import type { HomepageSectionInput } from "../validation/homepage.validation.js";

// Order is stepped by 10 (matching the seed) so a section can later be slotted
// between two others without renumbering everything.
export const ORDER_STEP = 10;

export const orderFor = (index: number) => (index + 1) * ORDER_STEP;

function baseKey(section: HomepageSectionInput): string {
  switch (section.type) {
    case "category":
      return `category-${section.config.categorySlug}`;
    case "banner-ad":
      return `banner-ad-${section.config.placement.replace(/_/g, "-")}`;
    default:
      return section.type;
  }
}

// Gives every section a unique, readable, deterministic key. Keys the client
// already holds are kept as-is (they identify existing rows); new sections get
// e.g. `category-sports`, then `category-sports-2` if that is taken.
export function assignKeys(
  sections: HomepageSectionInput[],
): (HomepageSectionInput & { key: string })[] {
  const taken = new Set(
    sections.flatMap((section) => (section.key ? [section.key] : [])),
  );

  return sections.map((section) => {
    if (section.key) return { ...section, key: section.key };

    const base = baseKey(section);
    let key = base;
    let suffix = 2;

    while (taken.has(key)) {
      key = `${base}-${suffix}`;
      suffix += 1;
    }

    taken.add(key);
    return { ...section, key };
  });
}
