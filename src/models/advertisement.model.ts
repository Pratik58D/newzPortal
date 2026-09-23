import mongoose, { Schema, Document } from 'mongoose';
import { AD_SLOT_KEYS, type AdSlotKey } from '../constants/adSlots.js';

// Kept under its original (misspelt) name so existing imports keep working.
export type AdvertiementPlacement = AdSlotKey;

// Which viewports an ad is shown on. "all" (default) means every ad saved
// before this field existed keeps showing everywhere.
export type AdDevices = "all" | "desktop" | "mobile";
export const AD_DEVICES: readonly AdDevices[] = ["all", "desktop", "mobile"];

export interface IAdvertisement extends Document {
    title : string;
    image:{
        url: string;
        key: string;
    }
    // Optional smaller-screen creative; the desktop `image` is the fallback.
    mobileImage?: {
        url: string;
        key: string;
    }
    redirectUrl: string;

    // The slot an ad was originally created for. Kept required and always
    // equal to `placements[0]` so older readers keep working; ads saved before
    // `placements` existed only have this field.
    placement: AdvertiementPlacement;
    // Every slot the ad appears in.
    placements?: AdvertiementPlacement[];

    // Higher priority always wins a slot; ads of equal priority rotate,
    // weighted by `weight`.
    priority: number;
    weight: number;
    altText: string;
    // Small disclosure label shown with the ad (e.g. "विज्ञापन").
    sponsorLabel: string;
    // Restrict where the ad is shown by viewport; "all" everywhere.
    devices: AdDevices;

    startDate: Date;
    endDate: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const storedImage = {
  url: { type: String, required: true },
  key: { type: String, required: true },
};

const advertisementSchema = new Schema<IAdvertisement>({
     title: {
      type: String,
      required: true,
      trim: true,
    },
    image: storedImage,
    mobileImage: {
      type: new Schema({ ...storedImage }, { _id: false }),
      required: false,
    },
      redirectUrl: {
      type: String,
      required: true,
      trim: true,
    },
     placement: {
      type: String,
      enum: [...AD_SLOT_KEYS],
      required: true,
    },
    placements: {
      type: [{ type: String, enum: [...AD_SLOT_KEYS] }],
      default: undefined,
    },
    priority: { type: Number, min: 0, max: 100, default: 50 },
    weight: { type: Number, min: 1, max: 10, default: 1 },
    altText: { type: String, trim: true, maxlength: 200, default: "" },
    sponsorLabel: { type: String, trim: true, maxlength: 30, default: "" },
    devices: { type: String, enum: AD_DEVICES, default: "all" },
        startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },
     isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Public slot lookups filter on liveness, then group by slot in memory.
advertisementSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

const Advertisement = mongoose.model<IAdvertisement>('Advertisement', advertisementSchema);
export default Advertisement;
