import userModel, { type UserRole } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { paginate } from "../utils/paginate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getCookieOptions } from "../utils/cookieOptions.js";

// superadmin only: list all staff accounts
export const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  // password has select:false on the schema, so it's excluded by default
  const result = await paginate(userModel, {}, {
    page: page as string,
    limit: limit as string,
    sort: { createdAt: -1 },
  });
  res.json({ success: true, ...result });
});

// superadmin only: update another user's role, password and/or active status
// (all optional, at least one required). Staff accounts are never hard-deleted -
// deactivating (isActive: false) blocks login/access while keeping their name
// correctly attached to every article they've authored.
export const updateUser = asyncHandler(async (req, res) => {
  const { role: newRole, newPassword, isActive } = req.body;
  const allowedRoles: UserRole[] = ["user", "editor", "admin", "superadmin"];

  if (newRole === undefined && newPassword === undefined && isActive === undefined) {
    return res
      .status(400)
      .json({ message: "Provide role, newPassword and/or isActive to update" });
  }
  if (newRole && !allowedRoles.includes(newRole)) {
    return res
      .status(400)
      .json({ message: `role must be one of: ${allowedRoles.join(", ")}` });
  }
  if (newPassword && newPassword.length < 6) {
    return res
      .status(400)
      .json({ message: "New password must be at least 6 characters long" });
  }

  const targetUser = await userModel.findById(req.params.id);
  if (!targetUser) {
    return res.status(404).json({ message: "User not found" });
  }

  // never let the last active superadmin be demoted or deactivated -
  // that would leave nobody able to manage staff accounts at all
  const wasActiveSuperadmin = targetUser.role === "superadmin" && targetUser.isActive;
  const wouldLoseSuperadminStatus =
    wasActiveSuperadmin &&
    ((newRole && newRole !== "superadmin") || isActive === false);
  if (wouldLoseSuperadminStatus) {
    const activeSuperadmins = await userModel.countDocuments({
      role: "superadmin",
      isActive: true,
    });
    if (activeSuperadmins <= 1) {
      return res
        .status(400)
        .json({ message: "Cannot remove the last active superadmin" });
    }
  }

  if (newRole) targetUser.role = newRole;
  if (isActive !== undefined) targetUser.isActive = isActive;
  if (newPassword) targetUser.password = await bcrypt.hash(newPassword, 10);

  await targetUser.save();

  res.json({ success: true, message: "User updated successfully" });
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!email || !name || !password) {
    return res.status(404).json({ message: "Please provide all the fields" });
  }

  // Check if user exists
  const existingUser = await userModel.findOne({ email });
  if (existingUser)
    return res.status(400).json({ message: "User already exists" });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(422).json({ error: "Invalid email format" });
  }
  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters long" });
  }

  // Only superadmin can assign admin/superadmin; anything else falls back to the model's default staff role
  const allowedRoles: UserRole[] = ["editor", "admin", "superadmin"];
  let userRole: UserRole = "editor";
  if (role && allowedRoles.includes(role)) {
    if (["admin", "superadmin"].includes(role) && req.user?.role !== "superadmin") {
      return res.status(403).json({
        message: "Only superadmin can assign admin or superadmin role",
      });
    }
    userRole = role;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new userModel({
    name,
    password: hashedPassword,
    email,
    role: userRole,
  });
  await user.save();
  return res.status(200).json({
    success: true,
    message: "User created successfully",
  });
});

// Public registration creates a regular account. Staff roles can only be
// assigned through the protected user-management endpoint.
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "Please provide name, email and password" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(422).json({ success: false, message: "Invalid email format" });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" });
  }
  if (await userModel.findOne({ email: email.toLowerCase() })) {
    return res.status(409).json({ success: false, message: "An account with this email already exists" });
  }

  const user = await userModel.create({
    name: name.trim(),
    email: email.toLowerCase(),
    password: await bcrypt.hash(password, 10),
    role: "user",
  });

  return res.status(201).json({
    success: true,
    message: "Account created successfully. Please log in to comment.",
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

//login controller

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Please fill all the fields" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid email format" });
  }

  const matchedUser = await userModel.findOne({ email }).select("+password");
  if (!matchedUser) {
    return res.status(400).json({ success: false, message: "Invalid email" });
  }
  if (!matchedUser.isActive) {
    return res.status(403).json({ success: false, message: "This account has been deactivated" });
  }
  const isPasswordCorrect = await bcrypt.compare(
    password,
    matchedUser.password
  );
  if (!isPasswordCorrect) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid password" });
  }

  const token = jwt.sign(
    {
      id: matchedUser._id,
      role: matchedUser.role,
      email: matchedUser.email,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );

  res.cookie("token", token, {
    ...getCookieOptions(),
    maxAge: 24 * 60 * 60 * 1000, // 1 hour in milliseconds
  })
  res.status(200)
    .json({
      success: true,
      message: "User logged in successfully",
      token,
      user: {
        name: matchedUser.name,
        email: matchedUser.email,
        role: matchedUser.role,
        id: matchedUser._id,
      },
    });
});
export const getCurrentUser = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  return res.status(200).json({
    success: true,
    user: req.user,
  });
});
//logout controller

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token", getCookieOptions());
  res
    .status(200)
    .json({ success: true, message: "User logged out sucessfully" });
});
