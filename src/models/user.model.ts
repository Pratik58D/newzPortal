import mongoose, { Document, Schema, Types } from "mongoose";

export type UserRole = "user" | "editor" | "admin" | "superadmin";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  refreshTokenHash: string | null;
  refreshTokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  role: {
    type: String,
    default: "editor",
    required: false,
    enum: ["user", "editor", "admin", "superadmin"],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  refreshTokenHash: {
    type: String,
    default: null,
    select: false,
  },

  refreshTokenExpiresAt: {
    type: Date,
    default: null,
    select: false,
  },
}, { timestamps: true });

export default mongoose.model<IUser>("User", userSchema);
