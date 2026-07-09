export interface Product {
  id: string;
  name: string;
  sku: string;
  price: string;
  stockQuantity: number;
  category: string;
}

export interface ProductListResponse {
  items: Product[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
}

export interface Order {
  id: string;
  total: string;
  status: string;
  createdAt: string;
  items: OrderItem[];
}

interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
  }

  return res.json() as Promise<T>;
}

export function fetchProducts() {
  return request<ProductListResponse>("/products?pageSize=100");
}

export function createOrder(items: { productId: string; quantity: number }[]) {
  return request<Order>("/orders", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}
