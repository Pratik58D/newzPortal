import userModel from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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

     // Only superadmin can set roles other than 'user'
    let userRole = "user";
    if (role && ["admin", "superadmin"].includes(role)) {
      if (req.user?.role !== "superadmin") {
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
