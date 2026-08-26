import { Schema } from "mongoose";

export type MediaType = "image" | "video";

export type VideoProvider = "s3" | "youtube" | "vimeo" | "other";

export interface IMediaImage {
    url: string;
    key: string;
}

export interface IMedia {
    type: MediaType;

    images?: IMediaImage[];

    video?: {
        url?: string;
        provider?: VideoProvider;
        duration?: number;
        thumbnail?: string;
    };
}

//image schema 
const mediaImageSchema = new Schema<IMediaImage>(
    {
        url: {
            type: String,
            required: true
        },
        key: {
            type: String,
            required: true
        },
    },
    { _id: false }
)

const mediaSchema = new Schema<IMedia>(
    {
        type: {
            type: String,
            enum: ["image", "video"],
            required: true
        },
        images: {
            type: [mediaImageSchema],
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