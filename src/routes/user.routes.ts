import express from "express";
import { loginUser, logout, createUser, getAllUsers, updateUser } from "../controllers/user.controller.js";
import { authMiddleware, isSuperAdmin } from "../middleware/auth.middleware.js";

const userRouter = express.Router();

userRouter.post("/create-user", authMiddleware, isSuperAdmin, createUser);
userRouter.get("/users", authMiddleware, isSuperAdmin, getAllUsers);
userRouter.patch("/users/:id", authMiddleware, isSuperAdmin, updateUser);

userRouter.post("/login", loginUser);
userRouter.post("/logout", logout);

export default userRouter;
