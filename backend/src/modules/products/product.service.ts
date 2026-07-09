import { Prisma } from "@prisma/client";
import { ConflictError, NotFoundError } from "../../lib/errors";
import { productRepository } from "./product.repository";
import {
  CreateProductInput,
  ProductListQuery,
  UpdateProductInput,
} from "./product.schema";

export const productService = {
  async create(input: CreateProductInput) {
    const existing = await productRepository.findBySku(input.sku);
    if (existing) {
      throw new ConflictError(`A product with SKU '${input.sku}' already exists`);
    }
    return productRepository.create(input);
  },

  async list(query: ProductListQuery) {
    const where = query.category ? { category: query.category } : undefined;
    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await Promise.all([
      productRepository.findMany({ where, skip, take: query.pageSize }),
      productRepository.count(where),
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  },

  async getById(id: string) {
    const product = await productRepository.findById(id);
    if (!product) throw new NotFoundError(`Product '${id}' not found`);
    return product;
  },

  async update(id: string, input: UpdateProductInput) {
    await this.getById(id);

    if (input.sku) {
      const existing = await productRepository.findBySku(input.sku);
      if (existing && existing.id !== id) {
        throw new ConflictError(
          `A product with SKU '${input.sku}' already exists`
        );
      }
    }

    return productRepository.update(id, input);
  },

  async remove(id: string) {
    await this.getById(id);

    try {
      await productRepository.delete(id);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2003"
      ) {
        throw new ConflictError(
          "Cannot delete a product that is referenced by existing orders"
        );
      }
      throw err;
    }
  },
};
