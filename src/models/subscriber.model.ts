import mongoose, { Document, Schema, Types } from "mongoose";

export interface ISubscriber extends Document {
  _id: Types.ObjectId;
  email: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subscriberSchema = new Schema<ISubscriber>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },

    // Soft-unsubscribe flag rather than deleting the record, so re-signup
    // with the same email doesn't collide with the unique index.
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Subscriber = mongoose.model<ISubscriber>("Subscriber", subscriberSchema);

export default Subscriber;
