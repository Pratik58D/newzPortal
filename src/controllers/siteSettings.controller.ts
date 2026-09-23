import type { Request } from "express";
import { revalidateFrontend, REVALIDATE_TAGS } from "../utils/revalidate.js";
import SiteSettings from "../models/siteSettings.model.js";
import AuditLog from "../models/auditLog.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { changedTopLevelKeys } from "../utils/settingsDiff.js";
import {
  MEDIA_FOLDERS,
  deleteMediaImages,
  uploadMediaImages,
} from "../services/media.service.js";
// Same content the Phase 0 seed inserts; used as the answer when no settings
// document exists yet so the public site never sees an empty response.
import { siteSettingsSeed } from "../seeds/siteContent.data.js";
import { logger } from "../config/logger.js";

async function getOrCreateSettings() {
  const existing = await SiteSettings.findOne({ key: "site" });
  if (existing) return existing;

  return SiteSettings.create({ key: "site", ...siteSettingsSeed });
}

// An audit failure must never fail (or roll back) a settings change that has
// already been saved.
async function recordAudit(
  req: Request,
  targetId: unknown,
  action: string,
  metadata: Record<string, unknown>,
) {
  try {
    await AuditLog.create({
      actor: req.user!.id,
      action,
      targetType: "SiteSettings",
      targetId,
      metadata,
    });
  } catch (error) {
    logger.warn({ err: error, action }, "failed to write settings audit log");
  }
}

// Public
export const getSiteSettings = asyncHandler(async (_req, res) => {
  const settings = await SiteSettings.findOne({ key: "site" }).lean();

  res.json({
    success: true,
    data: settings ?? { key: "site", ...siteSettingsSeed },
  });
});

// Superadmin
export const updateSiteSettings = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();
  const before = settings.toObject() as unknown as Record<string, unknown>;

  settings.set(req.body);
  await settings.save();

  const after = settings.toObject() as unknown as Record<string, unknown>;

  await recordAudit(req, settings._id, "settings.update", {
    changed: changedTopLevelKeys(before, after, Object.keys(req.body)),
  });

  revalidateFrontend([REVALIDATE_TAGS.settings]);

  res.json({
    success: true,
    message: "Site settings updated",
    data: settings,
  });
});

export const uploadSiteLogo = asyncHandler(async (req, res) => {
  const file = req.file;

  if (!file) {
    throw new ApiError(400, "Logo image is required");
  }

  const settings = await getOrCreateSettings();
  const previousKey = settings.logo?.key;

  const [image] = await uploadMediaImages([file], MEDIA_FOLDERS.SITE);

  if (!image) {
    throw new ApiError(500, "Logo upload failed");
  }

  settings.logo = { url: image.url, key: image.key };
  await settings.save();

  // The new logo is already saved; a failed cleanup of the old file only
  // leaves an orphan in storage, so it is logged rather than surfaced.
  if (previousKey) {
    await deleteMediaImages([{ url: "", key: previousKey }]).catch((error) =>
      logger.warn({ err: error, previousKey }, "failed to delete old logo"),
    );
  }

  await recordAudit(req, settings._id, "settings.logo.update", {});
  revalidateFrontend([REVALIDATE_TAGS.settings]);

  res.json({
    success: true,
    message: "Logo updated",
    data: settings,
  });
});

export const deleteSiteLogo = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();
  const previousKey = settings.logo?.key;

  if (!previousKey) {
    return res.json({ success: true, message: "No logo to remove", data: settings });
  }

  settings.set("logo", undefined);
  await settings.save();

  await deleteMediaImages([{ url: "", key: previousKey }]).catch((error) =>
    logger.warn({ err: error, previousKey }, "failed to delete removed logo"),
  );

  await recordAudit(req, settings._id, "settings.logo.remove", {});
  revalidateFrontend([REVALIDATE_TAGS.settings]);

  res.json({
    success: true,
    message: "Logo removed",
    data: settings,
  });
});
