import express from "express";
import { loginUser, logout, createUser } from "../controllers/user.controller.js";
import { authMiddleware, isSuperAdmin } from "../middleware/auth.middleware.js";


const userRouter = express.Router()

userRouter.post("/create-user",authMiddleware , isSuperAdmin,createUser);


userRouter.post("/login",loginUser);
userRouter.post("/logout",logout);


export default userRouter;