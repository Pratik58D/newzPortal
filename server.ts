import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import db_connect from "./src/config/db.js";
import userRouter from "./src/routes/user.routes.js";
import cookieParser from "cookie-parser";
import cloudinary from "./src/config/cloudinary.js";
import newsRouter from "./src/routes/news.routes.js";
import categoryRouter from "./src/routes/category.routes.js";
import commentRouter from "./src/routes/comment.route.js";
import provinceRouter from "./src/routes/province.routes.js";
import errorHandling from "./src/middleware/errorhandling.js";
import reporterRouter from "./src/routes/reporter.routes.js";

dotenv.config();

const app = express();
const Port = process.env.port || 5000;
const isProd = process.env.NODE_ENV === "production";

cloudinary;

// Origins explicitly configured via env (works in both dev and prod)
const envOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || "")
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""))
  .filter(Boolean);

// Only allow localhost when NOT in production
const localOrigins = isProd
  ? []
  : ["http://localhost:3000", "http://127.0.0.1:3000"];

const allowedOrigins = [...new Set([...envOrigins, ...localOrigins])];

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

app.get("/", (req, res) => {
  res.send("Newsportal is live");
});

//Routing
app.use("/api", userRouter);
app.use("/api/reporters", reporterRouter);
app.use("/api/news", newsRouter);
app.use("/api/category", categoryRouter);
app.use("/api/comments", commentRouter);
app.use("/api/provinces", provinceRouter);

app.use(errorHandling);

app.listen(Port, () => {
  console.log(`server is running at ${Port}`);
  db_connect();
});
