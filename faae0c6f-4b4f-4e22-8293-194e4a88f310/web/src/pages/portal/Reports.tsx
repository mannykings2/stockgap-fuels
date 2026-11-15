import { useState } from "react";
import { useApi } from "@/lib/hooks";
import { Badge, Card, CardHeader, PageHeader, Spinner, Tabs } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/table";
import { CategoryBarChart, DonutChart, MoneyTrendChart } from "@/components/charts/Charts";
import { dateTime, money, quantity, titleCase } from "@/lib/format";

interface OperationalReport {
  stockByCategory: { category: string; quantity: number; valueKobo: number }[];
  stockByLocation: { location: string; type: string; quantity: number; valueKobo: number }[];
  lowStock: { product: string; sku: string; location: string; unit: string; available: number; reorderLevel: number }[];
  orderPipeline: { status: string; count: number; valueKobo: number }[];
  production: { month: string; quantity: number; batches: number }[];
  procurement: { month: string; spendKobo: number; orders: number }[];
  hse: { bySeverity: { severity: string; count: number }[]; total: number; closed: number };
  generatedAt: string;
}

interface FinancialReport {
  salesTrend: { month: string; invoicedKobo: number; collectedKobo: number }[];
  topCustomers: { name: string; invoicedKobo: number; collectedKobo: number }[];
  receivablesAging: { bucket: string; amountKobo: number; count: number }[];
  invoiceStatus: { status: string; count: number; outstandingKobo: number }[];
  collectedThisMonthKobo: number;
  generatedAt: string;
}

export function Reports() {
  const [tab, setTab] = useState<"operational" | "financial">("operational");
  const operational = useApi<OperationalReport>(["reports", "operational"], "/reports/operational");
  const financial = useApi<FinancialReport>(["reports", "financial"], "/reports/financial");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Operational and commercial reporting built from the same records that run the business."
        actions={
          <Tabs
            tabs={[
              { value: "operational", label: "Operational" },
              { value: "financial", label: "Financial" },
            ]}
            value={tab}
            onChange={(value) => setTab(value as typeof tab)}
          />
        }
      />

      {tab === "operational" ? (
        operational.isLoading || !operational.data ? (
          <Spinner label="Building operational report" />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <MoneyTrendChart
                title="Procurement spend"
                description="Committed purchase order value by month."
                data={operational.data.procurement.map((entry) => ({ month: entry.month, spendKobo: entry.spendKobo }))}
                series={[{ key: "spendKobo", label: "Spend" }]}
              />
              <CategoryBarChart
                title="Production output"
                description="Completed quantity by month."
                data={operational.data.production.map((entry) => ({ ...entry }))}
                categoryKey="month"
                valueKey="quantity"
                valueLabel="Quantity"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader title="Stock value by location" description="On-hand quantity valued at catalogue price." />
                <DataTable
                  rows={operational.data.stockByLocation}
                  keyFor={(row) => row.location}
                  columns={[
                    {
                      key: "location",
                      header: "Location",
                      render: (row) => (
                        <div>
                          <p className="text-ink">{row.location}</p>
                          <p className="text-[11px] text-muted">{titleCase(row.type)}</p>
                        </div>
                      ),
                    },
                    { key: "qty", header: "Quantity", align: "right", render: (row) => <span className="tabular-nums text-muted">{quantity(row.quantity)}</span> },
                    { key: "value", header: "Value", align: "right", render: (row) => <span className="tabular-nums">{money(row.valueKobo)}</span> },
                  ]}
                />
              </Card>

              <DonutChart
                title="Stock value by category"
                description="Where working capital sits."
                data={operational.data.stockByCategory.map((entry) => ({ ...entry }))}
                nameKey="category"
                valueKey="valueKobo"
              />
            </div>

            <Card>
              <CardHeader title="Order pipeline" description="Orders by stage with committed value." />
              <DataTable
                rows={operational.data.orderPipeline}
                keyFor={(row) => row.status}
                columns={[
                  { key: "status", header: "Stage", render: (row) => titleCase(row.status) },
                  { key: "count", header: "Orders", align: "right", render: (row) => <span className="tabular-nums">{row.count}</span> },
                  { key: "value", header: "Value", align: "right", render: (row) => <span className="tabular-nums">{money(row.valueKobo)}</span> },
                ]}
              />
            </Card>

            <Card>
              <CardHeader title="Stock below reorder level" description="Available stock after reservations." />
              <DataTable
                rows={operational.data.lowStock}
                keyFor={(row) => `${row.sku}-${row.location}`}
                emptyTitle="No stock exceptions"
                columns={[
                  {
                    key: "product",
                    header: "Product",
                    render: (row) => (
                      <div>
                        <p className="text-ink">{row.product}</p>
                        <p className="text-[11px] text-muted">{row.sku}</p>
                      </div>
                    ),
                  },
                  { key: "location", header: "Location", render: (row) => row.location },
                  {
                    key: "available",
                    header: "Available",
                    align: "right",
                    render: (row) => <span className="tabular-nums text-warn">{quantity(row.available, row.unit)}</span>,
                  },
                  {
                    key: "reorder",
                    header: "Reorder at",
                    align: "right",
                    render: (row) => <span className="tabular-nums text-muted">{quantity(row.reorderLevel)}</span>,
                  },
                ]}
              />
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
              <span>HSE: {operational.data.hse.total} incidents recorded, {operational.data.hse.closed} closed.</span>
              <span>Generated {dateTime(operational.data.generatedAt)}</span>
            </div>
          </div>
        )
      ) : financial.isLoading || !financial.data ? (
        <Spinner label="Building financial report" />
      ) : (
        <div className="space-y-6">
          <MoneyTrendChart
            title="Invoiced and collected"
            description="Six-month view of billing and cash collection."
            data={financial.data.salesTrend.map((entry) => ({ ...entry }))}
            series={[
              { key: "invoicedKobo", label: "Invoiced" },
              { key: "collectedKobo", label: "Collected" },
            ]}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <CategoryBarChart
              title="Receivables ageing"
              description="Outstanding balance by age bucket."
              data={financial.data.receivablesAging.map((entry) => ({ bucket: entry.bucket, amountKobo: entry.amountKobo }))}
              categoryKey="bucket"
              valueKey="amountKobo"
            />
            <DonutChart
              title="Outstanding by invoice status"
              description="Exposure still to be collected."
              data={financial.data.invoiceStatus.map((entry) => ({
                status: titleCase(entry.status),
                outstandingKobo: entry.outstandingKobo,
              }))}
              nameKey="status"
              valueKey="outstandingKobo"
            />
          </div>

          <Card>
            <CardHeader
              title="Top customers"
              description={`Collected this month: ${money(financial.data.collectedThisMonthKobo)}`}
            />
            <DataTable
              rows={financial.data.topCustomers}
              keyFor={(row) => row.name}
              emptyTitle="No invoiced customers yet"
              columns={[
                { key: "name", header: "Customer", render: (row) => row.name },
                { key: "invoiced", header: "Invoiced", align: "right", render: (row) => <span className="tabular-nums">{money(row.invoicedKobo)}</span> },
                {
                  key: "collected",
                  header: "Collected",
                  align: "right",
                  render: (row) => <span className="tabular-nums text-muted">{money(row.collectedKobo)}</span>,
                },
                {
                  key: "outstanding",
                  header: "Outstanding",
                  align: "right",
                  render: (row) => (
                    <span className={`tabular-nums ${row.invoicedKobo - row.collectedKobo > 0 ? "text-warn" : "text-ok"}`}>
                      {money(row.invoicedKobo - row.collectedKobo)}
                    </span>
                  ),
                },
              ]}
            />
          </Card>

          <Card>
            <CardHeader title="Invoice status" />
            <ul className="divide-y divide-line">
              {financial.data.invoiceStatus.map((entry) => (
                <li key={entry.status} className="flex items-center justify-between px-5 py-2.5 text-[12px]">
                  <span className="flex items-center gap-2">
                    <Badge tone="neutral">{titleCase(entry.status)}</Badge>
                    <span className="text-muted">{entry.count} invoices</span>
                  </span>
                  <span className="tabular-nums text-muted">{money(entry.outstandingKobo)}</span>
                </li>
              ))}
            </ul>
          </Card>

          <p className="text-right text-[11px] text-muted">Generated {dateTime(financial.data.generatedAt)}</p>
        </div>
      )}
    </div>
  );
}
