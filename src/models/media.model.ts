import { Schema } from "mongoose";

export type MediaType = "image" | "video";

export type VideoProvider = "s3" | "youtube" | "vimeo" | "other";

export interface IMedia {
    type: MediaType;
    images?: string[];
    video?: {
        url?: string;
        provider?: VideoProvider;
        duration?: number;
        thumbnail?: string;
    };
}


const mediaSchema = new Schema<IMedia>(
    {
        type: {
            type: String,
            enum: ["image", "video"],
            required: true
        },
        images: {
            type: [String],
        },
        video: {
            url: String,
            provider: {
                type: String,
                enum: ["s3", "youtube", "vimeo", "other"]
            },
            duration: Number,
            thumbnail: String
        }
    }
)


export default mediaSchema;