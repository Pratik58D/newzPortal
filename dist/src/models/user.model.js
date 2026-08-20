import mongoose, { Schema } from "mongoose";
const userSchema = new Schema({
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
        enum: ["editor", "admin", "superadmin"],
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });
export default mongoose.model("User", userSchema);
//# sourceMappingURL=user.model.js.map