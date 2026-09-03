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
  createReporter
);

reporterRouter.patch(
  "/:id",
  authMiddleware,
  role,
  updateReporter
);

export default reporterRouter;