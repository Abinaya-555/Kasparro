import { Router } from "express";
import { productsRouter } from "./products";
import { shopifyRouter } from "./shopify";

export const v1Router = Router();

v1Router.use("/products", productsRouter);
v1Router.use("/shopify", shopifyRouter);

