import { Request, Response } from "express";
import { createOrderSchema } from "./order.schema";
import { orderService } from "./order.service";

export const orderController = {
  async create(req: Request, res: Response) {
    const input = createOrderSchema.parse(req.body);
    const order = await orderService.create(input);
    res.status(201).json(order);
  },

  async list(_req: Request, res: Response) {
    const orders = await orderService.list();
    res.json(orders);
  },

  async getById(req: Request, res: Response) {
    const order = await orderService.getById(req.params.id);
    res.json(order);
  },
};
