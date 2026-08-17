import userModel from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { paginate } from "../utilies/paginate.js";

// superadmin only: list all staff accounts
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    // password has select:false on the schema, so it's excluded by default
    const result = await paginate(userModel, {}, { page, limit, sort: { createdAt: -1 } });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("error in getAllUsers Controller", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// superadmin only: update another user's role, password and/or active status
// (all optional, at least one required). Staff accounts are never hard-deleted -
// deactivating (isActive: false) blocks login/access while keeping their name
// correctly attached to every article they've authored.
export const updateUser = async (req, res) => {
  try {
    const { role: newRole, newPassword, isActive } = req.body;
    const allowedRoles = ["editor", "admin", "superadmin"];

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
  } catch (error) {
    console.error("error in updateUser Controller", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const createUser = async (req, res) => {
  try {
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
    const allowedRoles = ["editor", "admin", "superadmin"];
    let userRole = "editor";
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
  } catch (error) {
    console.error("error in createUser Controller", error.message);
    return res.status(500).json({
      message: "server Error",
      success: false,
    });
  }
};

//login controller

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
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
    
    const matchedUser = await userModel.findOne({ email }).select('+password');
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
      process.env.JWT_SECRET ,
      { expiresIn: "1h" }
    );

    res
      .cookie("token", token, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
         maxAge: 24 * 60 * 60 * 1000 // 1 day
      })
      .status(200)
      .json({
        success: true,
        message: "User logged in successfully",
        token,
        user: {
          email: matchedUser.email,
          role: matchedUser.role,
          id: matchedUser._id,
        },
      });
  } catch (error) {
    console.log("error in login controller", error.message);
    res.status(500).json({ sucess: false, message: "Server error" });
  }
};


//logout controller

export const logout = async (req, res) => {
  try {
    res.clearCookie("token");
    res
      .status(200)
      .json({ success: true, message: "User logged out sucessfully" });
  } catch (error) {
    console.log("error in logout controller", error.message);
    res.status(500).json({ sucess: false, message: "Server error" });
  }
};
