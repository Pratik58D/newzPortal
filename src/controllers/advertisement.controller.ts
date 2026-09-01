import type { Request, Response } from "express";
import advertisementModel from "../models/advertisement.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {
    uploadAdvertisementImages,
    deleteAdvertisementImages,
} from "../services/media.service.js";
import { paginate } from "../utils/paginate.js";


export const createAdvertisement = asyncHandler(
    async (req: Request, res: Response) => {

        const {
            title,
            redirectUrl,
            placement,
            startDate,
            endDate,
            isActive,
        } = req.body;

        const files = req.files as Express.Multer.File[] | undefined;

        if (!title || !redirectUrl || !placement || !startDate || !endDate) {
            throw new ApiError(400, "Required advertisement fields are missing");
        }

        if (!files?.length) {
            throw new ApiError(400, "Advertisement image is required");
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new ApiError(400, "Invalid advertisement dates");
        }

        if (end <= start) {
            throw new ApiError(
                400,
                "End date must be after start date"
            );
        }


        const images = await uploadAdvertisementImages(files);

        if (!images.length) {
            throw new ApiError(
                500,
                "Advertisement image upload failed"
            );
        }

        const advertisement = await advertisementModel.create({
            title,
            redirectUrl,
            placement,
            startDate: start,
            endDate: end,
            isActive: isActive !== undefined
                ? isActive === "true" || isActive === true
                : true,
            image: images[0],
        });


        res.status(201).json({
            success: true,
            message: "Advertisement created successfully",
            data: advertisement,
        });

    }
)

//Get advertisements for admin
export const getAdvertisements = asyncHandler(
  async (req, res) => {
    const {
      page = 1,
      limit = 10,
      search,
      placement,
      isActive,
    } = req.query;

    const query: Record<string, unknown> = {};

    if (search && typeof search === "string") {
      query.$or = [
        {
          title: {
            $regex: search,
            $options: "i",
          },
        },
        {
          redirectUrl: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    if (placement && typeof placement === "string") {
      query.placement = placement;
    }

    if (isActive !== undefined) {
      query.isActive = String(isActive) === "true";
    }

    const result = await paginate(
      advertisementModel,
      query,
      {
        page: page as string,
        limit: limit as string,
        sort: {
          createdAt: -1,
        },
      }
    );

    res.json({
      success: true,
      ...result,
    });
  }
);


//  Get one advertisement

export const getAdvertisement = asyncHandler(
  async (req, res) => {
    const advertisement =
      await advertisementModel.findById(req.params.id);

    if (!advertisement) {
      throw new ApiError(
        404,
        "Advertisement not found"
      );
    }

    res.json({
      success: true,
      data: advertisement,
    });
  }
);


//Update advertisement


export const updateAdvertisement = asyncHandler(
  async (req, res) => {
    const advertisement =
      await advertisementModel.findById(req.params.id);

    if (!advertisement) {
      throw new ApiError(
        404,
        "Advertisement not found"
      );
    }

    const {
      title,
      redirectUrl,
      placement,
      startDate,
      endDate,
      isActive,
    } = req.body;

    const files = req.files as Express.Multer.File[] | undefined;

    if (title !== undefined) {
      advertisement.title = title;
    }

    if (redirectUrl !== undefined) {
      advertisement.redirectUrl = redirectUrl;
    }

    if (placement !== undefined) {
      advertisement.placement = placement;
    }

    if (startDate !== undefined) {
      advertisement.startDate = new Date(startDate);
    }

    if (endDate !== undefined) {
      advertisement.endDate = new Date(endDate);
    }

    if (isActive !== undefined) {
      advertisement.isActive =
        isActive === true || isActive === "true";
    }

    // Replace image if a new one was uploaded
    if (files?.length) {
      const oldImage = advertisement.image;

      const newImages =
        await uploadAdvertisementImages(files);

      if (!newImages.length) {
        throw new ApiError(
          500,
          "Advertisement image upload failed"
        );
      }

      advertisement.image = newImages[0];

      await deleteAdvertisementImages([oldImage]);
    }

    if (advertisement.endDate <= advertisement.startDate) {
      throw new ApiError(
        400,
        "End date must be after start date"
      );
    }

    await advertisement.save();

    res.json({
      success: true,
      message: "Advertisement updated successfully",
      data: advertisement,
    });
  }
);



//Delete advertisement

export const deleteAdvertisement = asyncHandler(
  async (req, res) => {
    const advertisement =
      await advertisementModel.findById(req.params.id);

    if (!advertisement) {
      throw new ApiError(
        404,
        "Advertisement not found"
      );
    }

    await deleteAdvertisementImages([
      advertisement.image,
    ]);

    await advertisement.deleteOne();

    res.json({
      success: true,
      message: "Advertisement deleted successfully",
    });
  }
);


// Public API


export const getActiveAdvertisements = asyncHandler(
  async (req, res) => {
    const { placement } = req.query;

    const now = new Date();

    const query: Record<string, unknown> = {
      isActive: true,
      startDate: {
        $lte: now,
      },
      endDate: {
        $gte: now,
      },
    };

    if (placement && typeof placement === "string") {
      query.placement = placement;
    }

    const advertisements =
      await advertisementModel
        .find(query)
        .sort({ createdAt: -1 })
        .lean();

    res.json({
      success: true,
      data: advertisements,
    });
  }
);