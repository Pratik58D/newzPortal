import express from "express";

import {
  getAllReporters,
  createReporter,
  updateReporter,
} from "../controllers/reporter.controller.js";

import {
  authMiddleware,
  isSuperAdmin,
  role,
  staffOnly
} from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createReporterSchema, updateReporterSchema } from "../validation/reporter.validation.js";

const reporterRouter = express.Router();

reporterRouter.get(
  "/",
  authMiddleware,
    staffOnly,
  getAllReporters
);

reporterRouter.post(
  "/",
  authMiddleware,
  role,
  validate(createReporterSchema),
  createReporter
);

reporterRouter.patch(
  "/:id",
  authMiddleware,
  role,
  validate(updateReporterSchema),
  updateReporter
);

export default reporterRouter;