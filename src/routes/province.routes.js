import express from "express";
import { getProvinces } from "../controllers/province.controller.js";

const provinceRouter = express.Router();

provinceRouter.get("/", getProvinces);

export default provinceRouter;
