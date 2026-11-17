# Stockgap Fuels — corporate website and supply chain platform

A working prototype of a downstream energy business: a public corporate website with a
contact channel, and an internal portal that runs LPG and petroleum product supply from
order to cash.

Everything in the portal is **demonstration data**. Company facts on the website are
reproduced from public sources and labelled as reported. See
[`docs/research/sources.md`](docs/research/sources.md).

---

## What the platform does

| Area | What it covers |
| --- | --- |
| Sales orders | Draft → submit → approve → allocate → dispatch → delivered, with automatic invoicing on delivery |
| Procurement | Purchase orders with maker/checker approval, partial goods receipts, stock updated at receipt |
| Inventory | Stock by product and location, reservations, movement ledger, physical count adjustments |
| Manufacturing | Cylinder manufacture and LPG filling batches, bill of materials consumption, quality gate |
| Quality | Inspections against batches; only passed units are released into stock |
| Logistics | Shipments, vehicle/driver assignment, delivery confirmation, failure reporting |
| Finance | Invoices raised from delivered orders, payments, receivables and ageing |
| HSE | Incident reporting, corrective action and closure |
| Administration | Users, roles, permission sets, audit trail, website enquiry queue |
| Website | Home, company, products, services, operations, contact (enquiry form → admin queue) |

Role-aware dashboards mean a warehouse manager and a distributor see different cards,
different alerts and different records from the same endpoints.

## Stack

- **API**: Node 22+, Express 5, Zod validation, SQLite via the built-in `node:sqlite` driver.
- **Web**: React 19, Vite 6, React Router 7, TanStack Query 5, Tailwind CSS 4, Recharts, Lucide icons.
- **Auth**: httpOnly session cookie, hashed tokens, permission checks in middleware and services.
- **No external services**: the prototype runs entirely locally.

## Quick start

```bash
npm install                        # install both workspaces
cp .env.example .env               # then set SESSION_SECRET
npm run db:reset                   # create the database and load the demo data
npm run dev                        # API on :4000, web on :5173
```

Open <http://localhost:5173>. The website is public; the portal is at `/portal` and
requires sign-in. Sign in at `/login` (the login screen lists the demo accounts and can
sign in with one click while `NODE_ENV=development`).

### Requirements

- Node.js **22.13 or newer** with `node:sqlite` (used by the server and the test suite).
- The database file lives at `server/data/stockgap.db` by default.

### Production-style run

```bash
npm run build       # builds the web app, then compiles the server to server/dist
npm start           # serves the API and the built frontend from one Express app
```

When `web/dist` exists the server serves it and falls back to `index.html` for
non-`/api` routes.

## Demo accounts

Password for every account: **`Stockgap#2026`**

| Account | Role | Notable access |
| --- | --- | --- |
| `admin@stockgap.demo` | System administrator | Everything, roles, audit |
| `executive@stockgap.demo` | Executive management | Read across operations and reports |
| `operations@stockgap.demo` | Operations manager | Approve orders and POs, allocate stock |
| `procurement@stockgap.demo` | Procurement officer | Raise POs, receive goods |
| `warehouse@stockgap.demo` | Warehouse manager | Stock, allocation, counts |
| `depot@stockgap.demo` | Depot / terminal operator | Terminal stock, loading |
| `production@stockgap.demo` | Production supervisor | Production batches |
| `quality@stockgap.demo` | Quality inspector | Release inspected output |
| `logistics@stockgap.demo` | Logistics officer | Dispatch, delivery confirmation |
| `finance@stockgap.demo` | Finance officer | Invoices, payments |
| `hse@stockgap.demo` | HSE officer | Incidents |
| `distributor@stockgap.demo` | Distributor (Bonny Basin Gas) | Own orders only |
| `retailer@stockgap.demo` | Retailer | Own orders only |
| `supplier@stockgap.demo` | Supplier | Own purchase orders |
| `transporter@stockgap.demo` | Haulage | Own shipments |
| `customer@stockgap.demo` | Customer | Own orders and invoices |

Demo accounts are returned by `/api/auth/demo-accounts` when demo accounts are enabled: by
default outside production, and in a deployed environment only when
`DEMO_ACCOUNTS=true` is set in the server's environment. Hosted deployments normally run with
`NODE_ENV=production`, so without that flag the login screen hides the demo switcher.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | API (watch mode) and Vite dev server together |
| `npm run dev:api` / `npm run dev:web` | Run one side only |
| `npm run build` | Build the frontend and compile the server |
| `npm start` | Run the compiled server |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Seed only if the database has no users |
| `npm run db:reset` | Delete the database, migrate and reseed |
| `npm test` | Service-level test suite (in-memory database) |
| `npm run typecheck` | TypeScript checks for both workspaces |

## Project layout

```
server/
  src/
    app.ts                 Express app factory (CORS, CSRF guard, static hosting)
    routes/                Route table
    modules/               auth, orders, procurement, inventory, manufacturing,
                           quality, logistics, finance, parties, hse, reports,
                           notifications, users, catalogue, audit, reference,
                           marketing (enquiries)
    middleware/            session loading, permission guards, error handling
    platform/              http helpers, errors, audit/notifications, rate limits
    db/                    connection, migration runner, seed, CLI
    config/                environment, RBAC catalogue, demo accounts
  tests/                   node:test service-level suites
web/
  src/
    app/                   router
    components/            UI primitives, layout, charts, marketing sections
    features/              auth and theme providers, marketing content
    pages/                 marketing, auth and portal pages
    lib/                   API client, formatting, hooks, navigation
docs/                      architecture, API, database, workflows, user guide, sources
```

## Data

The seed builds one connected scenario: five locations, seven counterparties, twelve
products, opening stock, three purchase orders (one received), three production batches
(completed, awaiting quality, planned), four sales orders across the lifecycle, an issued
invoice with a part payment, three HSE incidents, two website enquiries and a populated
audit trail.

Historical documents are seeded with consistent statuses and their stock effects are
consolidated into opening-balance movements, so the ledger starts balanced. The seed file
says so at the top.

`npm run db:reset` is the way back to a clean demonstration.

## Security notes

- Role permissions are enforced by the API, not just hidden in the interface.
- Party-scoped roles (distributor, retailer, supplier, transporter, customer) only see
  their own records; the server derives the party from the session, never from the request.
- State-changing requests with a foreign `Origin` are rejected.
- Sign-in and the public enquiry form are rate limited.
- Password resets are single use, hashed at rest and expire after one hour. Tokens are
  returned in API responses **only** in development so the flow can be exercised without
  an email provider.

## Limitations

- SQLite and a single Node process: this is a prototype, not a deployment architecture.
- No email, SMS or payment gateway integration; those edges are recorded in the database.
- The online document set (`docs/`) describes the prototype, not company policy.
