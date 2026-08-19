import District from "../models/district.model.js";
import { asyncHandler } from "../utilies/asyncHandler.js";
import { PROVINCES } from "../constants/provinces.js";

// Public: list all districts, optionally filtered by province
export const getDistricts = asyncHandler(async (req, res) => {
  const { province } = req.query;
  const query = {};
  if (province) {
    query.province = province.toLowerCase();
  }

  const districts = await District.find(query).sort({ "name.np": 1 });
  res.json({ success: true, districts });
});

// Public: the 7 provinces with bilingual labels (static reference data)
export const getProvinces = asyncHandler(async (req, res) => {
  res.json({ success: true, provinces: PROVINCES });
});
