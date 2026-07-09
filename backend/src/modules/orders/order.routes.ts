import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { orderController } from "./order.controller";

export const orderRoutes = Router();

orderRoutes.post("/", asyncHandler(orderController.create));
orderRoutes.get("/", asyncHandler(orderController.list));
orderRoutes.get("/:id", asyncHandler(orderController.getById));
