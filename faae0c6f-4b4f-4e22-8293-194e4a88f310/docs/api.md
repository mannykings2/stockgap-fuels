# API reference

Base path: `/api`. All responses are `{ "data": ... }` on success and
`{ "error": { code, message, details } }` on failure.

Authentication uses an httpOnly cookie set by `/auth/login`. Send it back with
`credentials: "same-origin"` (the web client does this already).

List endpoints accept `page` and `pageSize` where marked *paged*, and return:

```json
{ "items": [], "meta": { "total": 0, "page": 1, "pageSize": 20, "totalPages": 0 } }
```

## Public

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/public/enquiries` | Website contact form (rate limited, no session) |

## Auth

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/login` | `{ email, password }` → profile + permissions |
| POST | `/auth/logout` | Clears the session |
| GET | `/auth/me` | Current profile and permissions |
| POST | `/auth/forgot-password` | `{ email }`; returns a reset token in development only |
| POST | `/auth/reset-password` | `{ token, password }` |
| POST | `/auth/change-password` | `{ currentPassword, newPassword }` |
| GET | `/auth/demo-accounts` | Only when `DEMO_ACCOUNTS` is enabled (default outside production, opt-in with `DEMO_ACCOUNTS=true` when deployed) |

## Reference data

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/reference/options` | Locations, products, suppliers, customers, transporters, own party |

## Sales orders

| Method | Path | Permission |
| --- | --- | --- |
| GET *paged* | `/orders?status=&search=` | `orders:read` |
| GET | `/orders/:id` | `orders:read` |
| POST | `/orders` | `orders:create` |
| POST | `/orders/:id/submit` | `orders:create` |
| POST | `/orders/:id/approve` | `orders:approve` |
| POST | `/orders/:id/allocate` | `orders:approve` |
| POST | `/orders/:id/dispatch` | `orders:dispatch` |
| POST | `/orders/:id/cancel` | `orders:create` |

Create body:

```json
{
  "customerId": "optional for party-scoped users",
  "locationId": "...",
  "requestedDeliveryDate": null,
  "deliveryAddress": null,
  "contactPhone": null,
  "notes": null,
  "lines": [{ "productId": "...", "quantity": 100, "unitPriceKobo": 1850000 }]
}
```

Dispatch body (all optional): `transporterId`, `vehiclePlate`, `driverName`,
`driverPhone`, `destination`.

## Procurement

| Method | Path | Permission |
| --- | --- | --- |
| GET *paged* | `/purchase-orders?status=&search=` | `procurement:read` |
| GET | `/purchase-orders/:id` | `procurement:read` |
| POST | `/purchase-orders` | `procurement:create` |
| POST | `/purchase-orders/:id/submit` | `procurement:create` |
| POST | `/purchase-orders/:id/approve` | `procurement:approve` |
| POST | `/purchase-orders/:id/receipts` | `procurement:receive` |
| POST | `/purchase-orders/:id/cancel` | `procurement:create` |

Receipt body: `{ "notes": null, "lines": [{ "lineId": "...", "quantity": 100 }] }`.

## Inventory

| Method | Path | Permission |
| --- | --- | --- |
| GET *paged* | `/inventory/stock?locationId=&productId=&category=&search=&lowStock=true` | `inventory:read` |
| GET *paged* | `/inventory/movements?productId=&locationId=&reason=` | `inventory:read` |
| POST | `/inventory/adjustments` | `inventory:adjust` |

Adjustment body: `{ "locationId", "productId", "countedQuantity", "note" }`.

## Manufacturing and quality

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/production-orders?status=&type=` | `manufacturing:read` |
| GET | `/production-orders/:id` | `manufacturing:read` |
| GET | `/bill-of-materials` | `manufacturing:read` |
| POST | `/production-orders` | `manufacturing:create` |
| POST | `/production-orders/:id/start` | `manufacturing:operate` |
| POST | `/production-orders/:id/submit-for-quality` | `manufacturing:operate` |
| POST | `/production-orders/:id/cancel` | `manufacturing:operate` |
| GET *paged* | `/inspections?result=&inspectionType=` | `quality:read` |
| POST | `/inspections` | `quality:inspect` |

Inspection body:

```json
{
  "productionOrderId": "...",
  "inspectionType": "finished_goods",
  "checkedQuantity": 100,
  "passedQuantity": 98,
  "failedQuantity": 2,
  "result": "conditional",
  "notes": null
}
```

## Logistics

| Method | Path | Permission |
| --- | --- | --- |
| GET *paged* | `/shipments?status=&search=` | `logistics:read` |
| GET | `/shipments/:id` | `logistics:read` |
| PATCH | `/shipments/:id` | `logistics:manage` |
| POST | `/shipments/:id/fail` | `logistics:manage` |
| POST | `/shipments/:id/confirm-delivery` | `deliveries:confirm` |

## Finance

| Method | Path | Permission |
| --- | --- | --- |
| GET *paged* | `/invoices?status=&search=` | `finance:read` |
| GET | `/invoices/summary` | `finance:read` |
| GET | `/invoices/:id` | `finance:read` |
| POST | `/invoices/:id/payments` | `finance:manage` |

Payment body: `{ "amountKobo": 50000000, "method": "bank_transfer", "notes": null }`.

## Parties

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/parties?type=&search=&status=` | `customers:read` or `suppliers:read` |
| GET | `/parties/:id` | as above |
| POST | `/parties` | `customers:manage` or `suppliers:manage` |
| PUT | `/parties/:id` | as above |

## Assurance and reporting

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/incidents?status=&severity=` | `hse:read` |
| POST | `/incidents` | `hse:report` |
| PATCH | `/incidents/:id` | `hse:manage` |
| GET | `/dashboard` | any session; cards depend on permissions |
| GET | `/reports/operational` | `reports:read` |
| GET | `/reports/financial` | `reports:read` |
| GET *paged* | `/audit-logs?entityType=&search=` | `audit:read` |

## Administration

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/users` | `users:read` |
| POST | `/users` | `users:manage` |
| PATCH | `/users/:id` | `users:manage` |
| GET | `/roles` | `users:read` |
| GET | `/permissions` | `users:read` |
| PUT | `/roles/:id/permissions` | `roles:manage` |
| GET | `/notifications` | session |
| POST | `/notifications/:id/read` | session |
| POST | `/notifications/read-all` | session |
| GET | `/enquiries?status=&type=` | `enquiries:manage` |
| PATCH | `/enquiries/:id` | `enquiries:manage` |
| GET | `/health` | none |

## Error codes

`unauthorized` (401), `forbidden` (403), `not_found` (404), `conflict` (409),
`unprocessable` (422), `rate_limited` (429), `validation_failed` (400),
`internal_error` (500).
