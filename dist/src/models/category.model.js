import mongoose, { Schema } from "mongoose";
const categorySchema = new Schema({
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
}, { timestamps: true });
//unique per slug
categorySchema.index({ slug: 1 }, { unique: true });
const Category = mongoose.model("Category", categorySchema);
export default Category;
//# sourceMappingURL=category.model.js.map