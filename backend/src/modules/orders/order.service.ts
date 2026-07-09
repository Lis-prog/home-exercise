import { Prisma } from "@prisma/client";
import { InsufficientStockError, NotFoundError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { orderRepository } from "./order.repository";
import { CreateOrderInput } from "./order.schema";

export const orderService = {
  async create(input: CreateOrderInput) {
    const quantities = new Map<string, number>();
    for (const item of input.items) {
      quantities.set(
        item.productId,
        (quantities.get(item.productId) ?? 0) + item.quantity
      );
    }

    const productIds = [...quantities.keys()].sort();

    return prisma.$transaction(async (tx) => {
      const products = await orderRepository.findProductsByIds(productIds, tx);
      const productsById = new Map(products.map((p) => [p.id, p]));

      const lineItems: {
        productId: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
      }[] = [];
      let total = new Prisma.Decimal(0);

      for (const productId of productIds) {
        const product = productsById.get(productId);
        if (!product) {
          throw new NotFoundError(`Product '${productId}' not found`);
        }

        const quantity = quantities.get(productId)!;

        const result = await orderRepository.decrementStock(
          productId,
          quantity,
          tx
        );

        if (result.count === 0) {
          throw new InsufficientStockError(
            `Insufficient stock for '${product.name}' (requested ${quantity}, available ${product.stockQuantity})`
          );
        }

        lineItems.push({ productId, quantity, unitPrice: product.price });
        total = total.plus(product.price.times(quantity));
      }

      return orderRepository.createOrder({ total, items: lineItems }, tx);
    });
  },

  async list() {
    return orderRepository.list();
  },

  async getById(id: string) {
    const order = await orderRepository.findById(id);
    if (!order) throw new NotFoundError(`Order '${id}' not found`);
    return order;
  },
};
