// CLI for the ad `placements` migration:
//   npm run migrate:ads               copy `placement` into `placements` where missing
//   npm run migrate:ads -- --dry-run  report what would change, write nothing
import dotenv from "dotenv";
import mongoose from "mongoose";

import Advertisement from "../models/advertisement.model.js";
import { applyAdMigration, type AdMigrationModel } from "./applyAdMigration.js";

dotenv.config();

const dryRun = process.argv.includes("--dry-run");
const uri = process.env.MONGODB_URI_PROD;

if (!uri) {
  console.error("MONGODB_URI_PROD is not set — nothing to migrate.");
  process.exit(1);
}

try {
  // Skip index/collection creation on connect so a dry run writes nothing.
  await mongoose.connect(uri, dryRun ? { autoIndex: false, autoCreate: false } : {});

  // Dev and prod share MONGODB_URI_PROD in this project (see src/config/db.ts),
  // so always show which database is about to be touched.
  console.log(
    `Database: "${mongoose.connection.name}" on ${mongoose.connection.host}` +
      (dryRun ? "  [dry run: nothing will be written]" : ""),
  );

  const results = await applyAdMigration(
    Advertisement as unknown as AdMigrationModel,
    { dryRun },
  );

  for (const { id, placement, action } of results) {
    console.log(`  ${action.padEnd(12)} advertisement ${id}  placement=${placement}`);
  }

  console.log(
    dryRun
      ? `\nWould update ${results.length} advertisement(s).`
      : `\nUpdated ${results.length} advertisement(s).`,
  );
} catch (error) {
  console.error("Migration failed:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
