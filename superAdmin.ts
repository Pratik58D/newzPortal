import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import userModel from "./src/models/user.model.js";
import dotenv from "dotenv";

dotenv.config();

console.log(process.env.MONGODB_URI_PROD);

await mongoose.connect(process.env.MONGODB_URI_PROD!);

const superadminExists = await userModel.findOne({ role: "superadmin" });
if (!superadminExists) {
  const hashedPassword = await bcrypt.hash(process.env.SuperAdminPassword!, 10);
  await userModel.create({
    name: "Super Admin",
    email: process.env.SuperAdminEmail,
    password: hashedPassword,
    role: "superadmin",
  });
  console.log(" Superadmin created");
} else {
  console.log("Superadmin already exists");
}
process.exit();
