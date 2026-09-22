import type { Request, Response } from "express";
import advertisementModel from "../models/advertisement.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {
    uploadAdvertisementImages,
    deleteAdvertisementImages,
} from "../services/media.service.js";
import { paginate } from "../utils/paginate.js";
import { buildSlotMap, buildSlotPools, type AdLike } from "../utils/adSelection.js";
import { revalidateFrontend, REVALIDATE_TAGS } from "../utils/revalidate.js";

// Fields Multer puts in req.files (see the route's upload.fields()).
type AdFiles = {
    image?: Express.Multer.File[];
    mobileImage?: Express.Multer.File[];
};

const adFiles = (req: Request): AdFiles =>
    (req.files as AdFiles | undefined) ?? {};

// Ads that are switched on and inside their date window right now.
const liveNow = () => {
    const now = new Date();
    return {
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
    };
};

// Matches an ad by slot: the `placements` list, or the legacy single
// `placement` on ads saved before `placements` existed.
const inSlot = (slot: string) => ({
    $or: [{ placements: slot }, { placement: slot }],
});

export const createAdvertisement = asyncHandler(
    async (req: Request, res: Response) => {

        const {
            title,
            redirectUrl,
            placement,
            placements,
            startDate,
            endDate,
            isActive,
            priority,
            weight,
            altText,
            sponsorLabel,
            devices,
        } = req.body;

        const { image: imageFiles, mobileImage: mobileFiles } = adFiles(req);

        if (!title || !redirectUrl || !placement || !placements?.length || !startDate || !endDate) {
            throw new ApiError(400, "Required advertisement fields are missing");
        }

        if (!imageFiles?.length) {
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


        const images = await uploadAdvertisementImages(imageFiles);

        if (!images.length) {
            throw new ApiError(
                500,
                "Advertisement image upload failed"
            );
        }

        let mobileImage: (typeof images)[number] | undefined;

        if (mobileFiles?.length) {
            try {
                [mobileImage] = await uploadAdvertisementImages(mobileFiles);
            } catch (error) {
                // Don't leave the already-uploaded desktop image orphaned.
                await deleteAdvertisementImages([images[0]]).catch(() => undefined);
                throw error;
            }
        }

        const advertisement = await advertisementModel.create({
            title,
            redirectUrl,
            placement,
            placements,
            startDate: start,
            endDate: end,
            isActive: isActive !== undefined
                ? isActive === "true" || isActive === true
                : true,
            image: images[0],
            ...(mobileImage ? { mobileImage } : {}),
            ...(priority !== undefined ? { priority } : {}),
            ...(weight !== undefined ? { weight } : {}),
            ...(altText !== undefined ? { altText } : {}),
            ...(sponsorLabel !== undefined ? { sponsorLabel } : {}),
            ...(devices !== undefined ? { devices } : {}),
        });

        revalidateFrontend([REVALIDATE_TAGS.ads]);

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

    const and: Record<string, unknown>[] = [];

    if (search && typeof search === "string") {
      and.push({
        $or: [
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
        ],
      });
    }

    if (placement && typeof placement === "string") {
      and.push(inSlot(placement));
    }

    const query: Record<string, unknown> = and.length ? { $and: and } : {};

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

//Get one advertisement
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
      placements,
      startDate,
      endDate,
      isActive,
      priority,
      weight,
      altText,
      sponsorLabel,
      devices,
      removeMobileImage,
    } = req.body;

    const { image: imageFiles, mobileImage: mobileFiles } = adFiles(req);

    if (title !== undefined) {
      advertisement.title = title;
    }

    if (redirectUrl !== undefined) {
      advertisement.redirectUrl = redirectUrl;
    }

    if (placements !== undefined) {
      advertisement.placements = placements;
      advertisement.placement = placements[0];
    } else if (placement !== undefined) {
      advertisement.placement = placement;
      advertisement.placements = [placement];
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

    if (priority !== undefined) advertisement.priority = priority;
    if (weight !== undefined) advertisement.weight = weight;
    if (altText !== undefined) advertisement.altText = altText;
    if (sponsorLabel !== undefined) advertisement.sponsorLabel = sponsorLabel;
    if (devices !== undefined) advertisement.devices = devices;

    if (advertisement.endDate <= advertisement.startDate) {
      throw new ApiError(
        400,
        "End date must be after start date"
      );
    }

    // Images are replaced only after the request has passed every check, so a
    // rejected update never swaps (or deletes) a file.
    const oldImages: { url: string; key: string }[] = [];

    // Replace image if a new one was uploaded
    if (imageFiles?.length) {
      const newImages =
        await uploadAdvertisementImages(imageFiles);

      if (!newImages.length) {
        throw new ApiError(
          500,
          "Advertisement image upload failed"
        );
      }

      // Snapshot the values: `advertisement.image` is a live view of the
      // document, so pushing it as-is would read the NEW image after the
      // assignment below and delete the file we just uploaded.
      oldImages.push({
        url: advertisement.image.url,
        key: advertisement.image.key,
      });
      advertisement.image = newImages[0];
    }

    if (mobileFiles?.length) {
      const [newMobile] = await uploadAdvertisementImages(mobileFiles);

      if (!newMobile) {
        throw new ApiError(
          500,
          "Advertisement image upload failed"
        );
      }

      if (advertisement.mobileImage) {
        oldImages.push({
          url: advertisement.mobileImage.url,
          key: advertisement.mobileImage.key,
        });
      }
      advertisement.mobileImage = newMobile;
    } else if (removeMobileImage === "true" && advertisement.mobileImage) {
      oldImages.push({
        url: advertisement.mobileImage.url,
        key: advertisement.mobileImage.key,
      });
      advertisement.set("mobileImage", undefined);
    }

    await advertisement.save();

    if (oldImages.length) {
      await deleteAdvertisementImages(oldImages).catch(() => undefined);
    }

    revalidateFrontend([REVALIDATE_TAGS.ads]);

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
      ...(advertisement.mobileImage ? [advertisement.mobileImage] : []),
    ]);

    await advertisement.deleteOne();

    revalidateFrontend([REVALIDATE_TAGS.ads]);

    res.json({
      success: true,
      message: "Advertisement deleted successfully",
    });
  }
);


// Public API (older, one slot at a time; the site now uses /slots)
export const getActiveAdvertisements = asyncHandler(
  async (req, res) => {
    const { placement } = req.query;

    const query: Record<string, unknown> = { ...liveNow() };

    if (placement && typeof placement === "string") {
      Object.assign(query, inSlot(placement));
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

// Public API: everything the site needs to render its ads in one request.
// `{ data: { slots: { <slotKey>: [ad,...] }, pools: { <slotKey>: [ad,...] } } }`
// for every registered slot. `slots` is the server-rendered pick (no JS
// needed): at most `maxAds` per slot, chosen by priority then weighted
// random (see utils/adSelection.ts). `pools` is every live, eligible ad tied
// for that slot's top priority, for the client AdRotator to re-draw from
// after mount (per-visitor rotation) - never anything `slots` wouldn't also
// have been allowed to pick. Public fields only.
export const getAdvertisementSlots = asyncHandler(
  async (_req, res) => {
    const liveAds = (await advertisementModel
      .find(liveNow())
      .lean()) as unknown as AdLike[];

    res.json({
      success: true,
      data: {
        slots: buildSlotMap(liveAds),
        pools: buildSlotPools(liveAds),
      },
    });
  }
);
