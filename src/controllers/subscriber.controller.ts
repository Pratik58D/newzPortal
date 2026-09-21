import Subscriber from "../models/subscriber.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { paginate } from "../utils/paginate.js";

// Public: newsletter signup — idempotent, reactivates a previously
// unsubscribed email instead of erroring on the unique-index collision.
export const subscribe = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const existing = await Subscriber.findOne({ email });

  if (existing) {
    if (!existing.isActive) {
      existing.isActive = true;
      await existing.save();
    }

    return res.status(200).json({
      success: true,
      message: "You're subscribed to our newsletter.",
    });
  }

  await Subscriber.create({ email });

  res.status(201).json({
    success: true,
    message: "You're subscribed to our newsletter.",
  });
});

// Admin: list subscribers
export const getSubscribers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const result = await paginate(Subscriber, { isActive: true }, {
    page: page as string,
    limit: limit as string,
    sort: { createdAt: -1 },
  });

  res.status(200).json({
    success: true,
    ...result,
  });
});
