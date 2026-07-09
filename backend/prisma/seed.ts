import { prisma } from "../src/lib/prisma";

const products = [
  { name: "Wireless Mouse", sku: "MSE-001", price: 24.99, stockQuantity: 25, category: "Accessories" },
  { name: "Mechanical Keyboard", sku: "KBD-001", price: 89.5, stockQuantity: 12, category: "Accessories" },
  { name: '27" 4K Monitor', sku: "MON-4K-27", price: 329.0, stockQuantity: 6, category: "Displays" },
  { name: "USB-C Hub", sku: "HUB-001", price: 39.95, stockQuantity: 40, category: "Accessories" },
  { name: "Laptop Stand", sku: "STD-001", price: 45.0, stockQuantity: 1, category: "Accessories" },
];

async function main() {
  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    });
  }
  console.log(`Seeded ${products.length} products`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
