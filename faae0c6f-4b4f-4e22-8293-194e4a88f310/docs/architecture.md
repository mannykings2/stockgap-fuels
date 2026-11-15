# Architecture

## Shape

```
browser
  ├── public website  (marketing pages, enquiry form)
  └── portal          (authenticated SPA)
            │  fetch /api/*  (same origin, httpOnly session cookie)
            ▼
        Express 5 app
            ├── security headers, request id, structured logging
            ├── CORS for the dev origin + CSRF guard on unsafe methods
            ├── attachSession  → loads the session cookie into req.auth
            ├── /api/public/*  → unauthenticated (website enquiries)
            ├── /api/auth/*    → login, logout, profile, password reset
            ├── /api/*         → module routers, each route guarded by a permission
            ├── static /web/dist + SPA fallback (production build)
            └── error handler  → consistent JSON error envelope
            ▼
        SQLite (node:sqlite, WAL, foreign keys on)
```

Two workspaces (`server`, `web`) in one npm workspace root. The web app talks to
`/api`, so in development Vite proxies to the API and in production the same Express
process serves both.

## Layers on the server

| Layer | Responsibility |
| --- | --- |
| `routes/` | Mounts module routers. Order of mounting is the route table. |
| `modules/<name>/routes.ts` | HTTP concerns only: Zod parsing, permission guard, status code. |
| `modules/<name>/service.ts` | Business rules and transactions. This is where invariants live. |
| `modules/<name>/repository.ts` *(where present)* | Row mapping for read-heavy modules. |
| `platform/` | Shared concerns: errors (`AppError`), pagination, audit + notifications, reference numbers, rate limiting, password hashing. |
| `db/` | Connection pragmas, migration runner, seed, CLI. |

Every meaningful state change writes both an audit entry and, where a role needs to act,
a notification. That side effect lives in the service, inside the same transaction as
the change, so a rolled-back action leaves no notification behind.

## Invariants the services enforce

- A purchase order cannot be approved by the person who raised it.
- Receipts cannot exceed the outstanding quantity on a line.
- Stock cannot be allocated from a location that does not hold it.
- Allocation reserves stock; cancellation releases it. On-hand only moves on dispatch,
  receipt, production and adjustments.
- Dispatch requires an allocated order; delivery confirmation is what raises the invoice.
- A production batch consumes its bill of materials when it starts, and only passed units
  are released into finished goods after inspection.
- HSE incidents stay open until a corrective action is recorded.

These are covered by `server/tests/workflow.test.ts`, which runs the services against an
in-memory database.

## Frontend structure

- **Routing** (`src/app/App.tsx`): marketing routes inside `MarketingLayout`, auth pages
  standalone, portal routes inside `PortalLayout` wrapped by `ProtectedRoute`.
- **Session** (`features/auth/AuthProvider`): one TanStack Query entry (`["session"]`)
  holds the profile and permissions; `has()` / `hasAny()` drive conditional UI.
- **Data**: `useApi(key, path)` wraps TanStack Query; mutations invalidate the affected
  query keys (for example a receipt invalidates `purchase-orders`, `inventory`,
  `dashboard` and `notifications`).
- **Design system**: CSS custom-property tokens in `styles/theme.css` exposed to Tailwind 4
  through `@theme inline`. Dark mode is a `.dark` class on `<html>`, persisted per browser.
- **Server truth**: the client hides what a role cannot use, but every route and every
  mutation is authorised again on the server.

## Authentication

1. `POST /api/auth/login` verifies a scrypt password hash, creates a session row with a
   hashed token, and sets an httpOnly, same-site cookie.
2. `attachSession` hashes the cookie value and loads the user, role, party and permission
   set on each request.
3. `requireAuth` / `requirePermission` / `requireAnyPermission` guard the routes.
4. Party-scoped roles have `scopedToParty = true`; services filter by `auth.user.partyId`
   instead of trusting any customer id in the payload.

## Failure handling

`AppError(status, code, message, details)` is the only error type services raise.
`errorHandler` converts it (and Zod errors) into:

```json
{ "error": { "code": "conflict", "message": "Only approved orders can be allocated", "details": null } }
```

Unknown errors become a generic 500 with the request id logged.

## What would change for production

- PostgreSQL instead of SQLite (SQL is standard; only `db/` and a few pragmas differ).
- A separate web host or CDN rather than static serving from Express.
- Email/SMS for notifications and password resets; a payment gateway for settlement.
- Background jobs for rate-limit cleanup, report generation and integrations.
