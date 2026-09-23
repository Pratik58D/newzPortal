import { z } from "zod";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isHttpUrl = (value: string) => {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};

// These values end up in <a href>. Only http(s) URLs (and, for footer links,
// site-relative paths) are accepted so a `javascript:` URL can never be stored.
const optionalHttpUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value === "" || isHttpUrl(value), {
    message: "Must be a full http(s) URL, or empty",
  });

const linkTarget = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) =>
      value === "" ||
      isHttpUrl(value) ||
      (value.startsWith("/") && !value.startsWith("//")),
    { message: "Must be an http(s) URL or a path starting with /" },
  );

const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .refine((value) => value === "" || z.email().safeParse(value).success, {
    message: "Invalid email address",
  });

const localized = (max: number, npRequired = false) =>
  z.strictObject({
    np: npRequired
      ? z.string().trim().min(1, "Nepali text is required").max(max)
      : z.string().trim().max(max),
    en: z.string().trim().max(max),
  });

const footerLinkSchema = z
  .strictObject({
    label: localized(80, true),
    pageSlug: z
      .string()
      .trim()
      .toLowerCase()
      .refine((value) => value === "" || SLUG_PATTERN.test(value), {
        message: "Invalid page slug",
      })
      .optional(),
    url: linkTarget.optional(),
  })
  .refine((link) => Boolean(link.pageSlug) !== Boolean(link.url), {
    message: "Set exactly one of pageSlug or url",
  });

const footerGroupSchema = z.strictObject({
  title: localized(80, true),
  links: z.array(footerLinkSchema).max(12),
});

// PUT replaces every editable field at once (the admin form always submits the
// whole document). `logo` and `key` are deliberately not accepted here: the
// logo has its own upload endpoint and `key` is the singleton marker.
export const updateSiteSettingsSchema = z.strictObject({
  siteName: localized(100, true),
  tagline: localized(160),
  about: localized(500),
  contact: z.strictObject({
    email: optionalEmail,
    phone: z.string().trim().max(40),
    address: localized(200),
  }),
  social: z.strictObject({
    facebook: optionalHttpUrl,
    twitter: optionalHttpUrl,
    youtube: optionalHttpUrl,
    instagram: optionalHttpUrl,
  }),
  seo: z.strictObject({
    title: localized(120),
    description: localized(320),
  }),
  footerLinks: z.array(footerGroupSchema).max(6),
  copyright: localized(120),
  footerNote: localized(160),
});

export type UpdateSiteSettingsInput = z.infer<typeof updateSiteSettingsSchema>;
