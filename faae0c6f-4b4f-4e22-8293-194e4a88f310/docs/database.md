# Database

SQLite through Node's built-in `node:sqlite` driver (`DatabaseSync`). The connection
enables foreign keys, a busy timeout and WAL mode. SQL is standard relational SQL, so the
schema maps directly onto PostgreSQL; only `server/src/db/` changes in a migration.

- File: `server/data/stockgap.db` (configurable with `DATABASE_FILE`, default `./data/stockgap.db`).
- Migrations: `server/src/db/migrations/*.sql`, applied in filename order by `migrate()`.
- Applied migrations are recorded in `_migrations`.
- Money is stored as **integer kobo** in every table; quantities are `REAL` with three
  decimal places where fractional units matter.

## Tables

### Identity and access

| Table | Notes |
| --- | --- |
| `roles` | role id, label, description, `is_system` |
| `permissions` | permission code, module, description |
| `role_permissions` | role ↔ permission join (composite key) |
| `users` | email (unique), scrypt password hash, role, optional party, status, last login |
| `sessions` | hashed token, user, expiry, ip, user agent |
| `password_resets` | hashed token, expiry, `used_at` |

### Reference data

| Table | Notes |
| --- | --- |
| `parties` | suppliers, distributors, retailers, customers, transporters and partners; credit limit, status |
| `locations` | terminal, plant, depot, warehouse, retail outlet |
| `products` | SKU, category (`lpg`, `petroleum`, `cylinder`, `component`), unit, pack size, reorder level, price |
| `bill_of_materials` | product → component, `quantity_per_unit` |
| `inventory` | one row per product + location: `quantity`, `reserved` |
| `inventory_movements` | append-only ledger: direction, quantity, `balance_after`, reason, reference to the document |
| `settings` | key/value store (company details, demo flags) |
| `sequences` | reference number counters (`PO`, `SO`, `PRD`, `INV`, …) |

### Procurement

`purchase_orders` → `purchase_order_lines` → `goods_receipts` → `goods_receipt_lines`.
A line tracks `quantity` and `received_quantity`, so partial receipts are explicit.

### Manufacturing and quality

`production_orders` records planned vs produced quantity and the lifecycle
(`planned` → `in_progress` → `awaiting_quality` → `completed`/`cancelled`).
`production_consumptions` records what the batch took from stock.
`quality_inspections` links to a production order and records checked, passed and failed
quantities plus the result that gates release.

### Sales and distribution

`customer_orders` → `customer_order_lines` (with `allocated_quantity`),
`shipments` (order, transporter, vehicle, driver, destination, status),
`invoices` and `payments`.

### Assurance and system

`hse_incidents`, `notifications` + `notification_reads` (per-user read state),
`audit_logs` (actor, action, entity, summary, metadata, ip) and `enquiries` for the
public contact form.

## Conventions

- **No deletes.** Documents move through statuses; the audit trail is append-only.
- **No derived columns for money.** Line totals are stored at write time so historical
  documents do not change when a price changes.
- **Transactions.** Anything that touches stock, money or more than one table runs inside
  `transaction(db, fn)`; the service is the transaction boundary.
- **Reservations.** `inventory.quantity` is physical stock; `inventory.reserved` is
  committed to allocated orders. Available = quantity − reserved.

## Reset and inspect

```bash
npm run db:reset          # delete, migrate, reseed
npm run db:migrate        # apply migrations only
npm run db:seed           # seed only when the database has no users
```

Quick inspection without a SQL client:

```bash
node -e "const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync('server/data/stockgap.db');console.log(d.prepare('SELECT COUNT(*) c FROM customer_orders').get())"
```
