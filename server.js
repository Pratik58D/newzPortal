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
import districtRouter from "./src/routes/district.routes.js";
import errorHandling from "./src/middleware/errorhandling.js";

dotenv.config();

const app = express();
const Port = process.env.port;

cloudinary;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json())
app.use(cookieParser());


app.get("/",(req,res)=>{
    res.send("Newsportal is live");
})


//Routing
app.use("/api",userRouter);
app.use("/api/news" , newsRouter);
app.use("/api/category",categoryRouter);
app.use("/api/comment",commentRouter)
app.use("/api/districts",districtRouter)


app.use(errorHandling);

app.listen(Port , ()=>{
    console.log(`server is running at ${Port}`);
    db_connect();
})