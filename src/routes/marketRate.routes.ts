import express from "express";

import {
  getMarketRates,
  updateGoldSilver,
  updatePetrol,
} from "../controllers/marketRate.controller.js";

import { authMiddleware, role } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { marketRateSchemasByKind } from "../validation/marketRate.validation.js";

const router = express.Router();

// Public
router.get("/", getMarketRates);

// Admin + superadmin
router.put(
  "/gold-silver",
  authMiddleware,
  role,
  validate(marketRateSchemasByKind["gold-silver"]),
  updateGoldSilver,
);

router.put(
  "/petrol",
  authMiddleware,
  role,
  validate(marketRateSchemasByKind.petrol),
  updatePetrol,
);

export default router;
