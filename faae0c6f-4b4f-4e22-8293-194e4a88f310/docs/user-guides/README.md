# Portal user guide

Sign in at `/login`. Demonstration accounts are listed on that screen (one click signs you
in while `NODE_ENV=development`). Every account uses the password `Stockgap#2026`.

The portal only shows modules your role can use; the API rejects anything else regardless
of what the interface displays.

## Sales and commercial roles

**Distributor / retailer / customer**

1. Open **Sales orders** → **New order**. Your organisation is fixed by the session.
2. Choose the supply location, requested date and delivery address; add lines.
3. **Create & submit** sends it for approval. Track the status on the order page.
4. Once approved and allocated you will see the shipment; the invoice appears after the
   delivery is confirmed.
5. **Finance** shows your invoices and outstanding balance.

**Operations manager**

1. **Sales orders** → open a pending order → **Approve**.
2. **Allocate stock** reserves product at the supply location. If stock is short, the
   allocation is refused — record a receipt or adjust the plan instead.
3. Watch the dashboard for orders awaiting approval and stock below reorder level.

## Supply chain roles

**Procurement officer**

1. **Procurement** → **New purchase order**, choose supplier and receiving location.
2. **Save draft**, then open the order and **Submit**.
3. Approval is by someone else (an operations manager or administrator).
4. **Record receipt** enters the quantities that actually arrived; stock and the movement
   ledger update immediately. Partial receipts keep the order open.

**Warehouse manager**

- **Inventory** → stock by location; switch to **Movements** for the ledger.
- **Record stock count** posts a physical-count adjustment with a mandatory reason.
- Allocate stock for approved orders and monitor the low-stock queue.

**Production supervisor**

1. **Manufacturing** → **New production order** (cylinder manufacture or LPG filling).
2. **Start batch** consumes components per the bill of materials.
3. **Submit for quality** hands the batch to the inspector. Nothing is sellable until the
   inspection result releases it.

**Quality inspector**

1. **Quality assurance** lists batches awaiting inspection.
2. **Inspect** records checked/passed/failed quantities and the result. Only the passed
   quantity enters finished goods stock; a failed batch releases nothing.

**Logistics officer**

1. **Logistics** lists shipments. **Assign** a transporter, vehicle and driver while in
   transit.
2. **Delivered** confirms receipt at destination — this is what raises the invoice.
3. **Fail** records a failed delivery with a reason; the order returns to allocated so it
   can be re-dispatched.

**Finance officer**

- **Finance** shows invoiced, collected, outstanding and overdue totals.
- Open an invoice → **Record payment** for bank transfer, cheque, POS or cash.
- **Reports → Financial** covers ageing and top customers.

**HSE officer**

- **HSE** shows open incidents by severity. **Report incident** captures location,
  category, severity and description.
- **Update** moves an incident to investigating or closed; record the corrective action.

## Administration

**System administrator**

- **Users & roles**: create accounts, assign roles and organisations, and edit a role's
  permissions. Permission changes take effect on the holder's next request.
- **Audit trail**: search every recorded state change by actor, action or entity.
- **Website enquiries**: triage messages from the public contact form.
- **Settings**: your account, password and current permission set.

## Tips

- The dashboard is role-aware; the same login shows different cards to different people.
- Notifications in the bell deep-link to the record that needs attention.
- Use **Theme** (top-right) for light or dark mode; the choice is remembered per browser.
