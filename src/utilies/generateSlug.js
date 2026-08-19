import slugify from "slugify";

// Nepali is required wherever this is used, so it's always a safe slug source
// if English is absent. Devanagari doesn't transliterate through slugify, so
// an empty result falls back to a timestamp-based slug instead of a broken URL.
export const generateSlug = (titleEn, titleNp, prefix = "item") => {
  const source = titleEn || titleNp;
  const slug = slugify(source, { lower: true, strict: true });
  return slug || `${prefix}-${Date.now()}`;
};
