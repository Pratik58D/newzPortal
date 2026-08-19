import mongoose from "mongoose";

const districtSchema = new mongoose.Schema({
  name: {
    np: { type: String, required: true, trim: true },
    en: { type: String, trim: true, default: "" },
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  province: {
    type: String,
    required: true,
    enum: ["koshi", "madesh", "bagmati", "gandaki", "lumbini", "karnali", "sudurpashchim"],
  },
}, { timestamps: true });

const District = mongoose.model("District", districtSchema);
export default District;
