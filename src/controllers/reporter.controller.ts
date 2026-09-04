import Reporter from "../models/reporter.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { paginate } from "../utils/paginate.js";

// List reporters
export const getAllReporters = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
  } = req.query;

  const result = await paginate(Reporter, {}, {
    page: page as string,
    limit: limit as string,
    sort: { name: 1 },
  });

  res.status(200).json({
    success: true,
    ...result,
  });
});

// Create reporter
export const createReporter = asyncHandler(async (req, res) => {
  const { name, email, phone } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Reporter name is required",
    });
  }

  const reporter = await Reporter.create({
    name,
    email,
    phone,
  });

  res.status(201).json({
    success: true,
    message: "Reporter created successfully",
    data: reporter,
  });
});


// Update reporter
export const updateReporter = asyncHandler(async (req, res) => {
  const { name, email, phone, isActive } = req.body;

  const reporter = await Reporter.findById(req.params.id);

  if (!reporter) {
    return res.status(404).json({
      success: false,
      message: "Reporter not found",
    });
  }

  if (name !== undefined) reporter.name = name;
  if (email !== undefined) reporter.email = email;
  if (phone !== undefined) reporter.phone = phone;
  if (isActive !== undefined) reporter.isActive = isActive;

  await reporter.save();

  res.status(200).json({
    success: true,
    message: "Reporter updated successfully",
    data: reporter,
  });
});
