import mongoose, { Document, Schema, Types } from "mongoose";

export interface IReporter extends Document {
    _id: Types.ObjectId;
    name: string;
    email?: string;
    phone?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}


const reporterSchema = new Schema<IReporter>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
            unique: true,
        },

        phone: {
            type: String,
            trim: true,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

const Reporter = mongoose.model<IReporter>("Reporter", reporterSchema);

export default  Reporter;