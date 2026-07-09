import { z } from "zod";

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, "An order must contain at least one item"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
