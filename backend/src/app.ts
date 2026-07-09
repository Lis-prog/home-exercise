import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/error-handler";
import { orderRoutes } from "./modules/orders/order.routes";
import { productRoutes } from "./modules/products/product.routes";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/products", productRoutes);
  app.use("/api/orders", orderRoutes);

  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: `Route ${req.method} ${req.path} does not exist`,
      },
    });
  });

  app.use(errorHandler);

  return app;
}
