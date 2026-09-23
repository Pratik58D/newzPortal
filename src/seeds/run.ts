// CLI entry for the Phase 0 content seed:
//   npm run seed:site               create whatever is missing
//   npm run seed:site -- --dry-run  report what would be created, write nothing
import dotenv from "dotenv";
import mongoose from "mongoose";
import { applySiteSeed } from "./applySiteSeed.js";

dotenv.config();

const dryRun = process.argv.includes("--dry-run");
const uri = process.env.MONGODB_URI_PROD;

if (!uri) {
  console.error("MONGODB_URI_PROD is not set — nothing to seed.");
  process.exit(1);
}

try {
  // Mongoose would otherwise create the collections and unique indexes for
  // every registered model on connect, which is a write — not acceptable for
  // a dry run.
  await mongoose.connect(
    uri,
    dryRun ? { autoIndex: false, autoCreate: false } : {},
  );

  // Dev and prod share MONGODB_URI_PROD in this project (see src/config/db.ts),
  // so always show which database is about to be touched.
  console.log(
    `Database: "${mongoose.connection.name}" on ${mongoose.connection.host}` +
      (dryRun ? "  [dry run: nothing will be written]" : ""),
  );

  const results = await applySiteSeed({ dryRun });

  for (const { collection, key, action } of results) {
    console.log(`  ${action.padEnd(12)} ${collection} / ${key}`);
  }

  const count = (action: string) =>
    results.filter((result) => result.action === action).length;

  console.log(
    dryRun
      ? `\nWould create ${count("would-create")}, already present ${count("skipped")}.`
      : `\nCreated ${count("created")}, already present ${count("skipped")}.`,
  );
} catch (error) {
  console.error("Seed failed:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
