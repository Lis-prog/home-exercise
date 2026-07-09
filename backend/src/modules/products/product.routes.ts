import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { productController } from "./product.controller";

export const productRoutes = Router();

productRoutes.post("/", asyncHandler(productController.create));
productRoutes.get("/", asyncHandler(productController.list));
productRoutes.get("/:id", asyncHandler(productController.getById));
productRoutes.patch("/:id", asyncHandler(productController.update));
productRoutes.delete("/:id", asyncHandler(productController.remove));
