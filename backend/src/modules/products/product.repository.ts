import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export const productRepository = {
  create(data: Prisma.ProductCreateInput) {
    return prisma.product.create({ data });
  },

  findMany(params: {
    where?: Prisma.ProductWhereInput;
    skip?: number;
    take?: number;
  }) {
    return prisma.product.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: "desc" },
    });
  },

  count(where?: Prisma.ProductWhereInput) {
    return prisma.product.count({ where });
  },

  findById(id: string) {
    return prisma.product.findUnique({ where: { id } });
  },

  findBySku(sku: string) {
    return prisma.product.findUnique({ where: { sku } });
  },

  update(id: string, data: Prisma.ProductUpdateInput) {
    return prisma.product.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.product.delete({ where: { id } });
  },
};
