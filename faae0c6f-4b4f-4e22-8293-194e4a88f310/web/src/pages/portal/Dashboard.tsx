import { Link } from "react-router-dom";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { useApi } from "@/lib/hooks";
import { Alert, Badge, Card, CardHeader, EmptyState, PageHeader, Spinner, StatCard } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/table";
import { CategoryBarChart, MoneyTrendChart } from "@/components/charts/Charts";
import { money, quantity, relativeTime, statusMeta, titleCase } from "@/lib/format";
import type { DashboardData } from "@/types";

function kpiValue(value: number, format: "number" | "currency" | "quantity"): string {
  if (format === "currency") return money(value, { compact: true });
  if (format === "quantity") return quantity(value);
  return new Intl.NumberFormat("en-NG").format(value);
}

export function Dashboard() {
  const { data, isLoading, error } = useApi<DashboardData>(["dashboard"], "/dashboard");

  if (isLoading) return <Spinner label="Loading your dashboard" />;
  if (error || !data) {
    return (
      <Alert tone="critical" title="Dashboard unavailable">
        {(error as Error)?.message ?? "The dashboard could not be loaded."}
      </Alert>
    );
  }

  const firstName = data.user.fullName.split(" ")[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={data.role.label}
        title={`Good day, ${firstName}`}
        description={
          data.user.partyName
            ? `${data.user.partyName} · your orders, deliveries and invoices.`
            : data.user.jobTitle ?? "Operational overview for your role."
        }
      />

      {data.alerts.length > 0 ? (
        <div className="grid gap-3">
          {data.alerts.map((alert) => (
            <Link key={alert.title} to={alert.link} className="block">
              <Alert tone={alert.tone} title={alert.title} action={<ArrowRight className="size-4" />}>
                {alert.detail}
              </Alert>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((kpi) => (
          <Link key={kpi.key} to={kpi.link ?? "/portal"} className="block transition-transform hover:-translate-y-0.5">
            <StatCard
              label={kpi.label}
              value={kpiValue(kpi.value, kpi.format)}
              hint={kpi.hint}
              tone={kpi.tone === "default" ? undefined : kpi.tone}
            />
          </Link>
        ))}
        {data.kpis.length === 0 ? (
          <div className="sm:col-span-2 xl:col-span-4">
            <EmptyState
              title="No dashboard cards for your role"
              description="Use the navigation to open the modules your role has access to."
            />
          </div>
        ) : null}
      </div>

      {data.charts.salesTrend.length > 0 ? (
        <MoneyTrendChart
          title="Invoiced and collected"
          description="Last six months, settled against issued invoices."
          data={data.charts.salesTrend as unknown as Record<string, string | number>[]}
          series={[
            { key: "invoicedKobo", label: "Invoiced" },
            { key: "collectedKobo", label: "Collected" },
          ]}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <Card>
          <CardHeader
            title="Recent orders"
            action={
              <Link to="/portal/orders" className="text-[11px] font-medium text-brand hover:underline">
                All orders
              </Link>
            }
          />
          <DataTable
            rows={data.recentOrders}
            keyFor={(row) => row.id}
            emptyTitle="No orders yet"
            emptyDescription="Orders raised by you or your customers will appear here."
            columns={[
              {
                key: "reference",
                header: "Reference",
                render: (row) => (
                  <Link to={`/portal/orders/${row.id}`} className="font-medium text-brand hover:underline">
                    {row.reference}
                  </Link>
                ),
              },
              { key: "customer", header: "Customer", render: (row) => row.customer },
              {
                key: "status",
                header: "Status",
                render: (row) => <Badge tone={statusMeta(row.status).tone}>{statusMeta(row.status).label}</Badge>,
              },
              {
                key: "total",
                header: "Value",
                align: "right",
                render: (row) => <span className="tabular-nums">{money(row.totalKobo)}</span>,
              },
              {
                key: "created",
                header: "Raised",
                align: "right",
                render: (row) => <span className="text-muted">{relativeTime(row.createdAt)}</span>,
              },
            ]}
          />
        </Card>

        <div className="space-y-6">
          {data.pipeline.length > 0 ? (
            <Card>
              <CardHeader title="Order pipeline" description="Orders by current stage." />
              <div className="space-y-3 px-5 py-4">
                {data.pipeline
                  .filter((stage) => stage.count > 0)
                  .map((stage) => (
                    <div key={stage.status} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-[12px] text-muted">{titleCase(stage.status)}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{
                            width: `${Math.max(4, (stage.count / Math.max(...data.pipeline.map((entry) => entry.count))) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="w-6 text-right text-[12px] tabular-nums text-ink">{stage.count}</span>
                    </div>
                  ))}
              </div>
            </Card>
          ) : null}

          {data.lowStock.length > 0 ? (
            <Card>
              <CardHeader title="Below reorder level" description="Available stock after reservations." />
              <ul className="divide-y divide-line">
                {data.lowStock.map((item) => (
                  <li key={`${item.sku}-${item.location}`} className="flex items-start justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="text-[13px] font-medium text-ink">{item.product}</p>
                      <p className="text-[11px] text-muted">
                        {item.location} · {item.sku}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-semibold tabular-nums text-warn">
                        {quantity(item.available, item.unit)}
                      </p>
                      <p className="text-[10px] text-muted">reorder at {quantity(item.reorderLevel)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {data.lowStock.length === 0 && data.pipeline.length === 0 ? (
            <Card>
              <EmptyState
                icon={<TriangleAlert className="size-7" />}
                title="No operational exceptions"
                description="Stock is above reorder levels and nothing is waiting on you."
              />
            </Card>
          ) : null}
        </div>
      </div>

      {data.charts.stockByCategory.length > 0 || data.charts.production.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {data.charts.stockByCategory.length > 0 ? (
            <CategoryBarChart
              title="Stock value by category"
              description="On-hand quantity valued at catalogue price."
              data={data.charts.stockByCategory as unknown as Record<string, string | number>[]}
              categoryKey="category"
              valueKey="valueKobo"
            />
          ) : null}
          {data.charts.production.length > 0 ? (
            <CategoryBarChart
              title="Production output"
              description="Completed quantity by month."
              data={data.charts.production as unknown as Record<string, string | number>[]}
              categoryKey="month"
              valueKey="quantity"
              valueLabel="Quantity"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
