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
} from "../middleware/auth.middleware.js";

const reporterRouter = express.Router();

reporterRouter.get(
  "/reporters",
  authMiddleware,
  role,
  getAllReporters
);

reporterRouter.post(
  "/reporters",
  authMiddleware,
  role,
  createReporter
);

reporterRouter.patch(
  "/reporters/:id",
  authMiddleware,
  role,
  updateReporter
);

export default reporterRouter;