import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import db_connect from "./src/config/db.js";
import { validateEnv } from "./src/config/env.js";
import { logger } from "./src/config/logger.js";
import userRouter from "./src/routes/user.routes.js";
import cookieParser from "cookie-parser";
// Imported for its side effect (calls cloudinary.config() at module load) —
// nothing here uses the exported client directly.
import "./src/config/cloudinary.js";
import newsRouter from "./src/routes/news.routes.js";
import categoryRouter from "./src/routes/category.routes.js";
import commentRouter from "./src/routes/comment.route.js";
import provinceRouter from "./src/routes/province.routes.js";
import errorHandling from "./src/middleware/errorhandling.js";
import reporterRouter from "./src/routes/reporter.routes.js";
import advertisementRoutes from "./src/routes/advertisement.route.js";
import searchRouter from "./src/routes/search.routes.js";
import subscriberRouter from "./src/routes/subscriber.routes.js";
import siteSettingsRouter from "./src/routes/siteSettings.routes.js";
import { apiLimiter } from "./src/middleware/rateLimit.middleware.js";
import { sanitizeInput } from "./src/middleware/sanitize.middleware.js";

dotenv.config();
validateEnv();

const app = express();
const Port = process.env.PORT || 5000;

// Allowed frontend origins
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.CLIENT_URL,
].filter(Boolean);



app.use(
  helmet({
    // This is a JSON API, not an HTML-serving app, and images are hosted on
    // Cloudinary rather than this origin — the default Cross-Origin-Resource-Policy
    // ("same-origin") has no benefit here and could interfere with cross-origin
    // fetches from the frontend, so it's relaxed explicitly.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // allow non-browser requests (curl, server-to-server, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(sanitizeInput);
app.use("/api", apiLimiter);
app.use(pinoHttp({ logger }));

app.get("/", (req, res) => {
  res.send("Newsportal is live");
});

//Routing
app.use("/api", userRouter);
app.use("/api/search", searchRouter);
app.use("/api/reporters", reporterRouter);
app.use("/api/news", newsRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/comments", commentRouter);
app.use("/api/provinces", provinceRouter);
app.use( "/api/advertisements",advertisementRoutes);
app.use("/api/subscribers", subscriberRouter);
app.use("/api/settings", siteSettingsRouter);

app.use(errorHandling);

app.listen(Port, () => {
  logger.info(`Server is running at ${Port}`);
  db_connect();
});
