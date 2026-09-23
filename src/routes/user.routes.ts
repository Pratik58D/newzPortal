import express from "express";
import { loginUser, logout, createUser, registerUser, getAllUsers, updateUser,getCurrentUser,refreshToken } from "../controllers/user.controller.js";
import { authMiddleware, isSuperAdmin } from "../middleware/auth.middleware.js";
import { loginLimiter } from "../middleware/rateLimit.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createUserSchema, registerUserSchema, loginSchema, updateUserSchema } from "../validation/user.validation.js";

const userRouter = express.Router();

userRouter.post("/create-user", authMiddleware, isSuperAdmin, validate(createUserSchema), createUser);
userRouter.get("/users", authMiddleware, isSuperAdmin, getAllUsers);
userRouter.patch("/users/:id", authMiddleware, isSuperAdmin, validate(updateUserSchema), updateUser);
userRouter.get("/me", authMiddleware, getCurrentUser);

userRouter.post("/login", loginLimiter, validate(loginSchema), loginUser);
userRouter.post("/register", validate(registerUserSchema), registerUser);
userRouter.post("/refresh", refreshToken);
userRouter.post("/logout", logout);

export default userRouter;
