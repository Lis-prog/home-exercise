import { useEffect, useMemo, useState } from "react";
import { createOrder, fetchProducts, Order, Product } from "./api";

export function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Order | null>(null);

  async function loadProducts() {
    setLoading(true);
    try {
      const data = await fetchProducts();
      setProducts(data.items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const selected = useMemo(
    () =>
      products
        .map((product) => ({ product, quantity: quantities[product.id] ?? 0 }))
        .filter((line) => line.quantity > 0),
    [products, quantities]
  );

  const estimatedTotal = useMemo(
    () =>
      selected.reduce(
        (sum, line) => sum + Number(line.product.price) * line.quantity,
        0
      ),
    [selected]
  );

  function setQuantity(productId: string, value: number, max: number) {
    const quantity = Math.max(0, Math.min(value || 0, max));
    setQuantities((prev) => ({ ...prev, [productId]: quantity }));
  }

  async function submitOrder() {
    setSubmitting(true);
    setError(null);
    try {
      const order = await createOrder(
        selected.map((line) => ({
          productId: line.product.id,
          quantity: line.quantity,
        }))
      );
      setConfirmation(order);
      setQuantities({});
      await loadProducts();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmation) {
    return (
      <main className="container">
        <div className="card confirmation">
          <h1>Order confirmed</h1>
          <p className="muted">Order #{confirmation.id}</p>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Unit price</th>
              </tr>
            </thead>
            <tbody>
              {confirmation.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {products.find((p) => p.id === item.productId)?.name ??
                      item.productId}
                  </td>
                  <td>{item.quantity}</td>
                  <td>${Number(item.unitPrice).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="total">Total: ${Number(confirmation.total).toFixed(2)}</p>
          <button onClick={() => setConfirmation(null)}>Start a new order</button>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>Product inventory</h1>
      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="layout">
          <section className="card">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.sku}</td>
                    <td>{product.category}</td>
                    <td>${Number(product.price).toFixed(2)}</td>
                    <td className={product.stockQuantity === 0 ? "out" : ""}>
                      {product.stockQuantity}
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        max={product.stockQuantity}
                        value={quantities[product.id] ?? 0}
                        disabled={product.stockQuantity === 0}
                        onChange={(e) =>
                          setQuantity(
                            product.id,
                            Number(e.target.value),
                            product.stockQuantity
                          )
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <aside className="card summary">
            <h2>Your order</h2>
            {selected.length === 0 ? (
              <p className="muted">Select quantities to build an order.</p>
            ) : (
              <>
                <ul>
                  {selected.map((line) => (
                    <li key={line.product.id}>
                      <span>
                        {line.product.name} × {line.quantity}
                      </span>
                      <span>
                        ${(Number(line.product.price) * line.quantity).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="total">
                  Estimated total: ${estimatedTotal.toFixed(2)}
                </p>
              </>
            )}
            <button
              onClick={submitOrder}
              disabled={selected.length === 0 || submitting}
            >
              {submitting ? "Placing order…" : "Place order"}
            </button>
          </aside>
        </div>
      )}
    </main>
  );
}
