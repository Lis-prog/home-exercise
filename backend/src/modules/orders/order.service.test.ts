import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { InsufficientStockError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { orderService } from "./order.service";

async function resetDb() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
}

function createProduct(
  overrides: Partial<{ stockQuantity: number; price: number; sku: string }> = {}
) {
  return prisma.product.create({
    data: {
      name: "Test Widget",
      sku: overrides.sku ?? `SKU-${Math.random().toString(36).slice(2, 10)}`,
      price: overrides.price ?? 10,
      stockQuantity: overrides.stockQuantity ?? 1,
      category: "Test",
    },
  });
}

describe("orderService.create", () => {
  beforeEach(resetDb);

  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
  });

  it("computes and persists the order total from unit prices", async () => {
    const product = await createProduct({ price: 12.5, stockQuantity: 10 });

    const order = await orderService.create({
      items: [{ productId: product.id, quantity: 2 }],
    });

    expect(Number(order.total)).toBe(25);
    expect(order.items).toHaveLength(1);
    expect(Number(order.items[0].unitPrice)).toBe(12.5);

    const after = await prisma.product.findUnique({ where: { id: product.id } });
    expect(after?.stockQuantity).toBe(8);
  });

  it("rejects an order that exceeds available stock and leaves stock untouched", async () => {
    const product = await createProduct({ stockQuantity: 3 });

    await expect(
      orderService.create({ items: [{ productId: product.id, quantity: 4 }] })
    ).rejects.toBeInstanceOf(InsufficientStockError);

    const after = await prisma.product.findUnique({ where: { id: product.id } });
    expect(after?.stockQuantity).toBe(3);
    expect(await prisma.order.count()).toBe(0);
  });

  it("does not oversell the last item under concurrent orders", async () => {
    const product = await createProduct({ stockQuantity: 1 });
    const attempts = 10;

    const results = await Promise.allSettled(
      Array.from({ length: attempts }, () =>
        orderService.create({ items: [{ productId: product.id, quantity: 1 }] })
      )
    );

    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(attempts - 1);

    const after = await prisma.product.findUnique({ where: { id: product.id } });
    expect(after?.stockQuantity).toBe(0);
    expect(await prisma.order.count()).toBe(1);
  });
});
