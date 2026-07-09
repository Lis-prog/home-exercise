import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(64),
  price: z.number().positive(),
  stockQuantity: z.number().int().min(0),
  category: z.string().min(1).max(100),
});

export const updateProductSchema = createProductSchema.partial();

export const productListQuerySchema = z.object({
  category: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
