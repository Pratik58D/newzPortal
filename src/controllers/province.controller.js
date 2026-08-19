import { asyncHandler } from "../utilies/asyncHandler.js";
import { PROVINCES } from "../constants/provinces.js";

// Public: the 7 provinces with bilingual labels (static reference data)
export const getProvinces = asyncHandler(async (req, res) => {
  res.json({ success: true, provinces: PROVINCES });
});
