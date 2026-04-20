import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { httpLogger } from "./utils/logger";
import { router } from "./routes";
import { notFound } from "./middlewares/notFound";
import { errorHandler } from "./middlewares/errorHandler";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(compression());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(httpLogger);

  app.use("/", router);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

