# Workflows

Each workflow below is enforced by the service layer, not only by the interface. The
guards listed are the ones covered by `server/tests/workflow.test.ts`.

## Sales order to cash

```
draft ──submit──▶ pending_approval ──approve──▶ approved ──allocate──▶ allocated
                                                                          │
                                                            dispatch ◀────┘
                                                                │
                                                       dispatched ──confirm delivery──▶ delivered
                                                                                         │
                                                                              invoice raised
```

| Step | Who | What happens |
| --- | --- | --- |
| Create | `orders:create` (a distributor creates for its own party) | Order + lines saved as `draft`; prices default to the catalogue |
| Submit | `orders:create` | `draft` → `pending_approval`; approvers are notified |
| Approve | `orders:approve` | `pending_approval` → `approved` |
| Allocate | `orders:approve` | Checks available stock at the supply location, increments `reserved`, sets line `allocated_quantity`. **On-hand does not change.** |
| Dispatch | `orders:dispatch` | Requires `allocated`; creates a shipment, decrements on-hand stock and clears the reservation |
| Confirm delivery | `deliveries:confirm` | Shipment `delivered`, order `delivered`, invoice raised for the order total |
| Payment | `finance:manage` | Payment recorded against the invoice; status becomes `partially_paid` or `paid` |
| Cancel | `orders:create` | Allowed while `draft`/`pending_approval`/`approved`; releases any reservation |

Guards: allocation before approval is rejected; dispatch requires allocation; the invoice
is created by delivery confirmation, not by dispatch; a party-scoped user can only see
and act on their own organisation's orders.

## Procurement

```
draft ──submit──▶ pending_approval ──approve──▶ approved ──receipt──▶ partially_received ──▶ received
```

- The requester cannot approve their own purchase order (checked in the service).
- Receipts are per line and cannot exceed the outstanding quantity.
- A receipt writes a stock movement into the receiving location and updates
  `received_quantity`.
- When every line is fully received the order becomes `received`.

## Production and quality

```
planned ──start──▶ in_progress ──submit for quality──▶ awaiting_quality ──inspection──▶ completed
```

1. **Start** consumes the bill of materials from the plant, writes outbound stock
   movements and stores `production_consumptions`.
2. **Submit for quality** puts the batch in the inspector's queue.
3. **Inspection** records checked/passed/failed quantities and a result:
   - `pass` — every unit is released,
   - `conditional` — only the passed quantity is released,
   - `fail` — nothing is released and the batch is rejected.
4. Released units become a stock movement for the output product; the order records
   `produced_quantity` and `completed`.

## Inventory

- Stock rows exist per product and location; listings expose on-hand, reserved and
  available, and flag anything at or below the product reorder level.
- Every change writes an `inventory_movements` row with the resulting balance.
- A physical count posts the difference between the counted quantity and the system
  balance, with a mandatory reason and an audit entry.

## HSE

```
open ──▶ investigating ──▶ closed   (with a corrective action recorded)
```

Open incidents, and especially high/critical ones, surface on dashboards and in the
notification bell until they are closed.

## Website enquiry

`POST /api/public/enquiries` (rate limited) → stored as `new` → visible to roles with
`enquiries:manage` → moved through `in_review`, `responded`, `closed`.

## Notifications

Services raise notifications for the role that has to act next: approvers, the quality
queue, warehouse allocation, HSE and delivery failures. Notifications are tied to a role
and carry a deep link into the portal; read state is per user.
