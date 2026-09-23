import mongoose from "mongoose";
import { logger } from "./logger.js";

const db_connect = async (): Promise<void> => {
  try {
    if (process.env.mode === "production") {
      const conn = await mongoose.connect(process.env.MONGODB_URI_PROD!);
      logger.info(`Database connected: ${conn.connection.host}`);
    } else {
      // await mongoose.connect(process.env.db_local_url)
      const conn = await mongoose.connect(process.env.MONGODB_URI_PROD!);
      logger.info(`Database connected: ${conn.connection.host}`);
    }
  } catch (error) {
    // Note: a connection failure is only logged here, not rethrown — the
    // server keeps running without a DB connection rather than exiting.
    // Left as-is (out of scope for the logging swap); worth revisiting
    // alongside validateEnv() (src/config/env.ts) as a startup-safety item.
    logger.error({ err: error }, "Database connection failed");
  }
};

export default db_connect;
