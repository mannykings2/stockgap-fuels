import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { api, ApiError, qs } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { Badge, Card, PageHeader, Tabs } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/primitives";
import { dateTime, statusMeta, titleCase } from "@/lib/format";
import type { Enquiry } from "@/types";

const TABS = [
  { value: "", label: "All" },
  { value: "new", label: "New" },
  { value: "in_review", label: "In review" },
  { value: "responded", label: "Responded" },
  { value: "closed", label: "Closed" },
];

const STATUSES = ["new", "in_review", "responded", "closed"] as const;

export function Enquiries() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { data, isLoading } = useApi<Enquiry[]>(["enquiries", status], `/enquiries${qs({ status })}`);

  const update = useMutation({
    mutationFn: ({ id, next }: { id: string; next: string }) => api.patch(`/enquiries/${id}`, { status: next }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["enquiries"] });
      setError(null);
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "Could not update the enquiry."),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Website enquiries"
        description="Messages submitted through the corporate contact form, routed to the commercial desk."
      />

      {error ? <p className="rounded-[10px] border border-line bg-danger-soft px-3 py-2 text-[12px] text-danger">{error}</p> : null}

      <Card>
        <div className="border-b border-line px-4 py-3">
          <Tabs tabs={TABS} value={status} onChange={setStatus} />
        </div>
        {isLoading ? (
          <p className="px-5 py-8 text-center text-sm text-muted">Loading enquiries…</p>
        ) : (data ?? []).length === 0 ? (
          <EmptyState
            icon={<Mail className="size-7" />}
            title="No enquiries here"
            description="Submissions from the public contact form will appear in this queue."
          />
        ) : (
          <ul className="divide-y divide-line">
            {(data ?? []).map((enquiry) => (
              <li key={enquiry.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-medium text-ink">{enquiry.subject}</p>
                    <p className="text-[11px] text-muted">
                      {enquiry.name}
                      {enquiry.company ? ` · ${enquiry.company}` : ""} · {enquiry.email}
                      {enquiry.phone ? ` · ${enquiry.phone}` : ""}
                    </p>
                    <p className="mt-0.5 text-[10px] tracking-wide text-muted uppercase">
                      {titleCase(enquiry.type)} · {dateTime(enquiry.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={statusMeta(enquiry.status).tone}>{statusMeta(enquiry.status).label}</Badge>
                    <select
                      value={enquiry.status}
                      onChange={(event) => update.mutate({ id: enquiry.id, next: event.target.value })}
                      className="h-8 rounded-[8px] border border-line bg-surface-2 px-2 text-[12px] text-ink"
                      aria-label="Update enquiry status"
                    >
                      {STATUSES.map((entry) => (
                        <option key={entry} value={entry}>
                          {titleCase(entry)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="mt-2 rounded-[8px] border border-line bg-surface-2/50 px-3 py-2 text-[12px] leading-relaxed text-ink-soft">
                  {enquiry.message}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
