import { asyncHandler } from "../utils/asyncHandler.js";
import { PROVINCES } from "../constants/provinces.js";

// Public: the 7 provinces with bilingual labels (static reference data)
export const getProvinces = asyncHandler(async (req, res) => {
  // Standardized to { success, data } — no frontend consumer of this
  // endpoint exists yet (confirmed 2026-09-18, see docs/news-portal-findings.md
  // B4), so this is a zero-risk shape change rather than a breaking one.
  res.json({ success: true, data: PROVINCES });
});
