import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized user !" });
  }
  try {
    const decodeToken = jwt.verify(token, process.env.JWT_SECRET);
    if (!decodeToken) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized user!" });
    }
    req.user = decodeToken;
    next();
  } catch (error) {
    console.log("error in auth middleware", error.message);
    return res
      .status(401)
      .json({ success: false, message: "unauthorised user!" });
  }
};


// checking the super admin
export const isSuperAdmin = (req, res, next) => {
  if (req.user?.role === "superadmin") {
    return next();
  } else {
    return res
      .status(403)
      .json({ message: "Only superadmin can perform this action" });
  }
};


// both admin and superadmin allowed

export const role = async (req, res, next) => {

  if (req.user?.role === "admin" || req.user?.role === "superadmin") {
    next();
  } else {
    return res.status(401).json({ message: "unable to access this api" });
  }
};


// any logged-in staff account (editor, admin, superadmin)
export const staffOnly = (req, res, next) => {
  if (["editor", "admin", "superadmin"].includes(req.user?.role)) {
    return next();
  } else {
    return res.status(401).json({ message: "unable to access this api" });
  }
};
