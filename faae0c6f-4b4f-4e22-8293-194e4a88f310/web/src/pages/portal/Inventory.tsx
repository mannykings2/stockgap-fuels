import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, ClipboardCheck } from "lucide-react";
import { api, ApiError, qs } from "@/lib/api";
import { useApi, useReference } from "@/lib/hooks";
import { useAuth } from "@/features/auth/AuthProvider";
import { Badge, Button, Card, PageHeader, Tabs } from "@/components/ui/primitives";
import { DataTable, Pagination, TableToolbar } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Field, FormError, Input, Select, Textarea, useFieldId } from "@/components/ui/form";
import { dateTime, money, quantity, titleCase } from "@/lib/format";
import type { Movement, Page, StockLine } from "@/types";

export function Inventory({
  category,
  title = "Inventory",
  description = "Stock positions by location, with the movement ledger behind every balance.",
}: {
  category?: string;
  title?: string;
  description?: string;
}) {
  const { has } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"stock" | "movements">("stock");
  const [locationId, setLocationId] = useState("");
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const reference = useReference();
  const stock = useApi<Page<StockLine>>(
    ["inventory", "stock", category, locationId, search, lowOnly, page],
    `/inventory/stock${qs({ category, locationId, search, lowStock: lowOnly, page, pageSize: 50 })}`,
  );
  const movements = useApi<Page<Movement>>(
    ["inventory", "movements", category, locationId, page],
    `/inventory/movements${qs({ locationId, page, pageSize: 30 })}`,
  );

  const products = useMemo(
    () => (reference.data?.products ?? []).filter((product) => !category || product.category === category),
    [reference.data, category],
  );

  const [adjustLocation, setAdjustLocation] = useState("");
  const [adjustProduct, setAdjustProduct] = useState("");
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const locationField = useFieldId("adjust-location");
  const productField = useFieldId("adjust-product");
  const countedField = useFieldId("counted");
  const noteField = useFieldId("note");

  const adjust = useMutation({
    mutationFn: () =>
      api.post("/inventory/adjustments", {
        locationId: adjustLocation,
        productId: adjustProduct,
        countedQuantity: Number.parseFloat(counted),
        note,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setAdjustOpen(false);
      setCounted("");
      setNote("");
      setError(null);
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "Could not post the adjustment."),
  });

  const stockRows = stock.data?.items ?? [];
  const totalValue = stockRows.reduce((sum, line) => sum + line.quantity * line.product.unitPriceKobo, 0);
  const lowCount = stockRows.filter((line) => line.lowStock).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          has("inventory:adjust") ? (
            <Button
              icon={<ClipboardCheck className="size-4" />}
              onClick={() => {
                setAdjustLocation(reference.data?.locations[0]?.id ?? "");
                setAdjustProduct(products[0]?.id ?? "");
                setAdjustOpen(true);
              }}
            >
              Record stock count
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[11px] tracking-wide text-muted uppercase">Positions shown</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-ink">{stock.data?.meta.total ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] tracking-wide text-muted uppercase">Value at catalogue price</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-ink">{money(totalValue, { compact: true })}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] tracking-wide text-muted uppercase">Below reorder level</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-warn">{lowCount}</p>
        </Card>
      </div>

      <Card>
        <div className="border-b border-line px-4 py-3">
          <Tabs
            tabs={[
              { value: "stock", label: "Stock on hand" },
              { value: "movements", label: "Movements" },
            ]}
            value={tab}
            onChange={(value) => {
              setTab(value as "stock" | "movements");
              setPage(1);
            }}
          />
        </div>

        <TableToolbar
          search={tab === "stock" ? search : undefined}
          onSearch={tab === "stock" ? (value) => { setSearch(value); setPage(1); } : undefined}
          placeholder="Search product or SKU"
        >
          <Select
            value={locationId}
            onChange={(event) => {
              setLocationId(event.target.value);
              setPage(1);
            }}
            className="h-9 w-auto min-w-[180px] text-[13px]"
            aria-label="Filter by location"
          >
            <option value="">All locations</option>
            {(reference.data?.locations ?? []).map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
          {!category ? (
            <span className="rounded-full border border-line px-2.5 py-1 text-[11px] text-muted">All categories</span>
          ) : (
            <span className="rounded-full border border-line px-2.5 py-1 text-[11px] text-muted">{titleCase(category)}</span>
          )}
          {tab === "stock" ? (
            <label className="flex items-center gap-1.5 text-[12px] text-ink-soft">
              <input
                type="checkbox"
                checked={lowOnly}
                onChange={(event) => {
                  setLowOnly(event.target.checked);
                  setPage(1);
                }}
                className="size-3.5 accent-[var(--brand)]"
              />
              Low stock only
            </label>
          ) : null}
        </TableToolbar>

        {tab === "stock" ? (
          <>
            <DataTable
              rows={stockRows}
              keyFor={(row) => row.id}
              loading={stock.isLoading}
              emptyTitle="No stock positions"
              emptyDescription="Adjust the filters, or record a goods receipt to add stock."
              columns={[
                {
                  key: "product",
                  header: "Product",
                  render: (row) => (
                    <div>
                      <p className="text-ink">{row.product.name}</p>
                      <p className="text-[11px] text-muted">{row.product.sku}</p>
                    </div>
                  ),
                },
                {
                  key: "location",
                  header: "Location",
                  render: (row) => (
                    <span>
                      {row.location.name}
                      <span className="ml-1.5 text-[10px] text-muted">{titleCase(row.location.type)}</span>
                    </span>
                  ),
                },
                {
                  key: "onhand",
                  header: "On hand",
                  align: "right",
                  render: (row) => <span className="tabular-nums">{quantity(row.quantity, row.product.unit)}</span>,
                },
                {
                  key: "reserved",
                  header: "Reserved",
                  align: "right",
                  render: (row) => <span className="tabular-nums text-muted">{quantity(row.reserved, row.product.unit)}</span>,
                },
                {
                  key: "available",
                  header: "Available",
                  align: "right",
                  render: (row) => (
                    <span className={`tabular-nums font-medium ${row.lowStock ? "text-warn" : "text-ink"}`}>
                      {quantity(row.available, row.product.unit)}
                    </span>
                  ),
                },
                {
                  key: "status",
                  header: "",
                  render: (row) =>
                    row.lowStock ? <Badge tone="warning">Reorder</Badge> : <Badge tone="success">OK</Badge>,
                },
              ]}
            />
            {stock.data ? <Pagination meta={stock.data.meta} onPage={setPage} /> : null}
          </>
        ) : (
          <>
            <DataTable
              rows={movements.data?.items ?? []}
              keyFor={(row) => row.id}
              loading={movements.isLoading}
              emptyTitle="No movements recorded"
              columns={[
                {
                  key: "direction",
                  header: "",
                  render: (row) =>
                    row.direction === "in" ? (
                      <span className="inline-flex size-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--ok)_12%,transparent)] text-ok">
                        <ArrowDownLeft className="size-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex size-7 items-center justify-center rounded-full bg-danger-soft text-danger">
                        <ArrowUpRight className="size-3.5" />
                      </span>
                    ),
                },
                {
                  key: "product",
                  header: "Product",
                  render: (row) => (
                    <div>
                      <p className="text-ink">{row.product.name}</p>
                      <p className="text-[11px] text-muted">{row.location.name}</p>
                    </div>
                  ),
                },
                {
                  key: "quantity",
                  header: "Quantity",
                  align: "right",
                  render: (row) => (
                    <span className={`tabular-nums ${row.direction === "in" ? "text-ok" : "text-danger"}`}>
                      {row.direction === "in" ? "+" : "−"}
                      {quantity(row.quantity, row.product.unit)}
                    </span>
                  ),
                },
                {
                  key: "balance",
                  header: "Balance after",
                  align: "right",
                  render: (row) => <span className="tabular-nums text-muted">{quantity(row.balanceAfter, row.product.unit)}</span>,
                },
                { key: "reason", header: "Reason", render: (row) => titleCase(row.reason) },
                {
                  key: "when",
                  header: "When",
                  align: "right",
                  render: (row) => <span className="text-muted">{dateTime(row.createdAt)}</span>,
                },
              ]}
            />
            {movements.data ? <Pagination meta={movements.data.meta} onPage={setPage} /> : null}
          </>
        )}
      </Card>

      <Modal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title="Record a physical stock count"
        description="The adjustment posts the difference between the counted quantity and the system balance."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdjustOpen(false)}>
              Cancel
            </Button>
            <Button loading={adjust.isPending} onClick={() => adjust.mutate()}>
              Post adjustment
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Location" required htmlFor={locationField}>
            <Select id={locationField} value={adjustLocation} onChange={(event) => setAdjustLocation(event.target.value)}>
              <option value="">Select a location</option>
              {(reference.data?.locations ?? []).map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Product" required htmlFor={productField}>
            <Select id={productField} value={adjustProduct} onChange={(event) => setAdjustProduct(event.target.value)}>
              <option value="">Select a product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.unit})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Counted quantity" required htmlFor={countedField}>
            <Input id={countedField} value={counted} onChange={(event) => setCounted(event.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Reason" required htmlFor={noteField} hint="Recorded against your name in the audit trail.">
            <Textarea id={noteField} value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
          </Field>
          <FormError message={error} />
        </div>
      </Modal>
    </div>
  );
}
