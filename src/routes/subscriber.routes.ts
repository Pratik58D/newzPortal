import express from "express";

import { subscribe, getSubscribers } from "../controllers/subscriber.controller.js";
import { authMiddleware, staffOnly } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { subscribeSchema } from "../validation/subscriber.validation.js";

const subscriberRouter = express.Router();

// Public — covered by the general apiLimiter mounted on all /api routes in server.ts
subscriberRouter.post("/", validate(subscribeSchema), subscribe);

// Admin
subscriberRouter.get("/", authMiddleware, staffOnly, getSubscribers);

export default subscriberRouter;
