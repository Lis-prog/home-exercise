# Product Inventory & Order Management

A small shop backend for managing products and placing orders against live stock,
with a thin React UI on top. It's deliberately narrow in scope: the point isn't
how many features it has, it's how it's put together and how it behaves when two
people try to buy the last item at the same time.

## Stack

- **Backend:** Node.js, TypeScript, Express
- **Data:** PostgreSQL via Prisma
- **Validation:** Zod
- **Tests:** Vitest (run against a real Postgres, not mocks)
- **Frontend:** React + Vite
- **Infra:** Docker with multi-stage builds, orchestrated by docker-compose

## Getting it running

### With Docker (recommended)

```bash
docker compose up --build
```

That's it from a clean checkout. The backend waits for Postgres to be healthy,
applies migrations, seeds a few demo products, and starts serving.

- UI: http://localhost:8080
- API: http://localhost:4000
- Postgres: localhost:5432

### Locally, without full Docker

You still need a database, so the easiest path is to run just Postgres in a
container and everything else on your machine:

```bash
docker compose up -d db

cd backend
cp .env.example .env
npm install
npm run prisma:migrate
npm run db:seed        # optional, gives you some products to look at
npm run dev            # API on :4000

# in another terminal
cd frontend
npm install
npm run dev            # UI on :5173, proxies /api to the backend
```

## How the backend is organised

I split each feature into the usual layers so nothing important ends up buried
in a route handler:

```
route  ->  controller  ->  service  ->  repository  ->  Prisma / Postgres
```

- **Controllers** parse and validate the request (Zod) and pick the status code.
  No business logic lives here.
- **Services** hold the actual rules: stock checks, totals, SKU uniqueness.
- **Repositories** are the only thing that touches Prisma, so the data layer
  stays in one place and is easy to stub in tests.

Errors are thrown as typed classes and caught by one middleware that turns them
into a single response shape, so the frontend always gets the same thing back:

```json
{ "error": { "code": "INSUFFICIENT_STOCK", "message": "..." } }
```

Folder layout:

```
backend/src
├─ app.ts                 express wiring
├─ server.ts              entry point
├─ lib/                   prisma client, error types, async wrapper
├─ middleware/            the error handler
└─ modules/
   ├─ products/           routes, controller, service, repository, schema
   └─ orders/             same layers + the stock logic + its tests
```

## API

| Method | Path                | What it does                              |
| ------ | ------------------- | ----------------------------------------- |
| GET    | `/health`           | health check                              |
| GET    | `/api/products`     | list products (`category`, `page`, `pageSize`) |
| POST   | `/api/products`     | create a product                          |
| GET    | `/api/products/:id` | get one product                           |
| PATCH  | `/api/products/:id` | update a product                          |
| DELETE | `/api/products/:id` | delete a product (refused if it has orders) |
| POST   | `/api/orders`       | place an order                            |
| GET    | `/api/orders`       | list orders with their line items         |
| GET    | `/api/orders/:id`   | get one order                             |

Placing an order:

```bash
curl -X POST http://localhost:4000/api/orders \
  -H "Content-Type: application/json" \
  -d '{ "items": [ { "productId": "<id>", "quantity": 2 } ] }'
```

## Data model

Three tables: `Product`, `Order`, and `OrderItem` joining them.

A few decisions worth calling out:

- Prices and totals are stored as `Decimal`, never floats. Money and binary
  floating point don't mix.
- `OrderItem` keeps its own `unitPrice`, captured when the order is placed. If a
  product's price changes later, old orders still show what the customer actually
  paid.
- `sku` is unique at the database level, not just checked in code.
- You can't delete a product that's referenced by an order (`onDelete: Restrict`);
  deleting an order removes its line items (`onDelete: Cascade`).
- The migration adds two `CHECK` constraints: stock can't go negative and an
  ordered quantity has to be positive. Even a bad code path can't write nonsense
  into the table.
- Indexes on `category` and `OrderItem.productId` for the common lookups.

## Why a relational database

The shape of this problem is relational: an order points at products through
line items, and an order's total only makes sense in terms of the rows under it.
On top of that, placing an order has to be transactional (drop the stock and
write the order as one unit, or not at all), and the "don't oversell the last
item" requirement is really asking for row-level locking. Those are all things a
relational database gives you directly. A document store would mean rebuilding
transactions and integrity checks in application code for no real upside here, so
Postgres was the obvious pick.

## Handling concurrent stock updates

This is the part the exercise actually cares about, so it's where I spent the
time.

The naive version has a race in it. You read the stock, check it in your code,
then write the new value:

```
read stock (=1)  ->  looks fine  ->  write stock - 1 (=0)
```

Run that twice at once and both reads see `1`, both checks pass, and you've sold
two of one item. The gap between checking and writing is the whole problem.

I removed the gap by making the check and the decrement a single statement:

```sql
UPDATE "Product"
SET "stockQuantity" = "stockQuantity" - $qty
WHERE "id" = $id AND "stockQuantity" >= $qty;
```

In Prisma that's an `updateMany` with a `stockQuantity: { gte: qty }` filter and a
`decrement`. Postgres locks the row for that update, so the condition and the
write can't be split apart. If there isn't enough stock the `WHERE` matches
nothing, zero rows come back, and the service reads that as "out of stock",
throws, and the transaction rolls back.

The rest of the order creation lives in the same `prisma.$transaction`, so if any
single line fails, every decrement and the order itself are undone together —
no half-applied orders. When an order spans several products I lock them in a
sorted order, otherwise two multi-item orders could grab the same rows in
opposite order and deadlock.

I considered the alternatives:

- `SELECT ... FOR UPDATE` works too, but it's an extra query and holds the lock
  longer. The conditional update says the same thing in one round trip.
- Optimistic locking (a version column and retries) is nice when writes rarely
  collide, but "everyone wants the last one" is the opposite of that, so I'd just
  be paying for constant retries.

There's a test that proves it: fire 10 orders at a product with one unit in
stock, all at once, and check that exactly one succeeds, nine fail, and the stock
lands on zero.

## Tests

```bash
cd backend
npm test
```

The tests run against a real Postgres on purpose. The guarantee I care about
lives in the database, so mocking it would test nothing. They cover the order
logic:

- the total is computed from unit prices and saved correctly
- an order bigger than the available stock is rejected and stock is left alone
- concurrent orders for the last unit never oversell

## Trade-offs and what I'd do next

A few things I left out on purpose to keep this in scope, roughly in the order
I'd pick them up:

- A separate test database. Right now the tests reset the same database used for
  development, which is fine solo but not something I'd ship.
- A leaner production image. The runtime stage copies the whole `node_modules`
  for simplicity; I'd trim it to prod dependencies plus the generated client.
- Auth on the write endpoints (an API key or JWT) — the brief mentions it and
  it's the obvious next step for anything real.
- An order lifecycle (pending / paid / fulfilled) and cancelling an order to put
  stock back.
- Search, sorting and proper pagination in the UI, not just on the API.
- Structured logging and an OpenAPI spec generated from the Zod schemas.
