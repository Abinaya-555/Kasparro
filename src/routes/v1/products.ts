import { Router } from "express";
import { analyzeProductController } from "../../controllers/productAnalysisController";

export const productsRouter = Router();

productsRouter.post("/analyze", analyzeProductController);

