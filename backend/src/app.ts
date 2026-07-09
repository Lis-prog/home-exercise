import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/error-handler";
import { productRoutes } from "./modules/products/product.routes";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/products", productRoutes);

  app.use(errorHandler);

  return app;
}
