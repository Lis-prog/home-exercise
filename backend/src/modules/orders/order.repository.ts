import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export const orderRepository = {
  findProductsByIds(ids: string[], tx: Prisma.TransactionClient) {
    return tx.product.findMany({ where: { id: { in: ids } } });
  },

  decrementStock(
    productId: string,
    quantity: number,
    tx: Prisma.TransactionClient
  ) {
    return tx.product.updateMany({
      where: { id: productId, stockQuantity: { gte: quantity } },
      data: { stockQuantity: { decrement: quantity } },
    });
  },

  createOrder(
    data: {
      total: Prisma.Decimal;
      items: {
        productId: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
      }[];
    },
    tx: Prisma.TransactionClient
  ) {
    return tx.order.create({
      data: {
        total: data.total,
        items: { create: data.items },
      },
      include: { items: true },
    });
  },

  list() {
    return prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: { items: { include: { product: true } } },
    });
  },

  findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
  },
};
