import { useState } from "react";
import { qs } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { DataTable, Pagination, TableToolbar } from "@/components/ui/table";
import { dateTime, titleCase } from "@/lib/format";
import type { AuditEntry, Page } from "@/types";

const ENTITY_TYPES = ["", "customer_order", "purchase_order", "production_order", "shipment", "invoice", "incident", "user", "settings"];

export function AuditLogs() {
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useApi<Page<AuditEntry>>(
    ["audit", search, entityType, page],
    `/audit-logs${qs({ search, entityType, page, pageSize: 30 })}`,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit trail"
        description="Every state change that matters is recorded against the person who made it. Entries cannot be edited."
      />

      <Card>
        <TableToolbar search={search} onSearch={(value) => { setSearch(value); setPage(1); }} placeholder="Search action, summary or actor">
          <select
            value={entityType}
            onChange={(event) => {
              setEntityType(event.target.value);
              setPage(1);
            }}
            className="h-9 rounded-[10px] border border-line bg-surface-2 px-2 text-[13px] text-ink"
            aria-label="Filter by entity type"
          >
            {ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type ? titleCase(type) : "All entities"}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-muted">{data?.meta.total ?? 0} entries</span>
        </TableToolbar>
        <DataTable
          rows={data?.items ?? []}
          keyFor={(row) => row.id}
          loading={isLoading}
          emptyTitle="No audit entries match this filter"
          columns={[
            {
              key: "summary",
              header: "Event",
              render: (row) => (
                <div>
                  <p className="text-ink">{row.summary}</p>
                  <p className="text-[11px] text-muted">{row.action}</p>
                </div>
              ),
            },
            {
              key: "entity",
              header: "Entity",
              render: (row) => <Badge tone="neutral">{titleCase(row.entityType)}</Badge>,
            },
            { key: "actor", header: "Actor", render: (row) => row.actor ?? <span className="text-muted">System</span> },
            {
              key: "when",
              header: "When",
              align: "right",
              render: (row) => <span className="text-muted">{dateTime(row.createdAt)}</span>,
            },
          ]}
        />
        {data ? <Pagination meta={data.meta} onPage={setPage} /> : null}
      </Card>
    </div>
  );
}
