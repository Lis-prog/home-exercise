import { Request, Response } from "express";
import {
  createProductSchema,
  productListQuerySchema,
  updateProductSchema,
} from "./product.schema";
import { productService } from "./product.service";

export const productController = {
  async create(req: Request, res: Response) {
    const input = createProductSchema.parse(req.body);
    const product = await productService.create(input);
    res.status(201).json(product);
  },

  async list(req: Request, res: Response) {
    const query = productListQuerySchema.parse(req.query);
    const result = await productService.list(query);
    res.json(result);
  },

  async getById(req: Request, res: Response) {
    const product = await productService.getById(req.params.id);
    res.json(product);
  },

  async update(req: Request, res: Response) {
    const input = updateProductSchema.parse(req.body);
    const product = await productService.update(req.params.id, input);
    res.json(product);
  },

  async remove(req: Request, res: Response) {
    await productService.remove(req.params.id);
    res.status(204).send();
  },
};
