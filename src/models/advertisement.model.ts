import mongoose, { Schema, Document } from 'mongoose';

export type AdvertiementPlacement =
|"top_banner"
| "home_banner"
| "sidebar"
| "news_detail_top"
| "news_detail_bottom"

export interface IAdvertisement extends Document {
    title : string;
    image:{
        url: string;
        key: string;
    }
    redirectUrl: string;

    placement: AdvertiementPlacement;

    startDate: Date;
    endDate: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}


const advertisementSchema = new Schema<IAdvertisement>({
     title: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      url: {
        type: String,
        required: true,
      },
      key: {
        type: String,
        required: true,
      },
    },
      redirectUrl: {
      type: String,
      required: true,
      trim: true,
    },
     placement: {
      type: String,
      enum: [
        "top_banner",
        "home_banner",
        "sidebar",
        "news_detail_top",
        "news_detail_bottom",
      ],
      required: true,
    },
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


const Advertisement = mongoose.model<IAdvertisement>('Advertisement', advertisementSchema);
export default Advertisement;
