import { Router } from "express";
import {
  analyzeShopifyProduct,
  getShopifyProducts,
  putShopifyProductImprovements,
} from "../../controllers/shopifyController";

export const shopifyRouter = Router();

shopifyRouter.get("/products", getShopifyProducts);
shopifyRouter.post("/analyze/:id", analyzeShopifyProduct);
shopifyRouter.put("/products/:id", putShopifyProductImprovements);
