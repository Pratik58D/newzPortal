// The 7 provinces are fixed and used directly as the enum on NewsArticle.province -
// this list essentially never changes, so it's a plain constant rather than a
// DB collection, just used to give the enum codes bilingual display labels.
export const PROVINCES = [
  { code: "koshi", name: { np: "कोशी", en: "Koshi" } },
  { code: "madesh", name: { np: "मधेश", en: "Madhesh" } },
  { code: "bagmati", name: { np: "बागमती", en: "Bagmati" } },
  { code: "gandaki", name: { np: "गण्डकी", en: "Gandaki" } },
  { code: "lumbini", name: { np: "लुम्बिनी", en: "Lumbini" } },
  { code: "karnali", name: { np: "कर्णाली", en: "Karnali" } },
  { code: "sudurpashchim", name: { np: "सुदूरपश्चिम", en: "Sudurpashchim" } },
];
