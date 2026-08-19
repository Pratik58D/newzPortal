import express from "express";
import { getDistricts, getProvinces } from "../controllers/district.controller.js";

const districtRouter = express.Router();

districtRouter.get("/provinces", getProvinces);
districtRouter.get("/", getDistricts);

export default districtRouter;
