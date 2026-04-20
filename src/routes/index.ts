import { Router } from "express";
import { healthCheck } from "../controllers/healthController";
import { v1Router } from "./v1";

export const router = Router();

router.get("/", healthCheck);

router.use("/api/v1", v1Router);

