import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BellOff, CheckCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { Badge, Button, Card, EmptyState, PageHeader, Spinner } from "@/components/ui/primitives";
import { cx } from "@/components/ui/primitives";
import { relativeTime, titleCase } from "@/lib/format";
import type { NotificationItem } from "@/types";

export function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useApi<{ notifications: NotificationItem[]; unread: number }>(
    ["notifications"],
    "/notifications",
  );

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAll = useMutation({
    mutationFn: () => api.post("/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = data?.unread ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Workflow events routed to your role: approvals, quality queues, delivery failures and incidents."
        actions={
          <Button
            variant="secondary"
            icon={<CheckCheck className="size-4" />}
            disabled={unread === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Mark all read
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <Spinner />
        ) : (data?.notifications ?? []).length === 0 ? (
          <EmptyState
            icon={<BellOff className="size-7" />}
            title="Nothing to review"
            description="Notifications appear here when a workflow reaches your role."
          />
        ) : (
          <ul className="divide-y divide-line">
            {data?.notifications.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (!notification.read) markRead.mutate(notification.id);
                    if (notification.link) navigate(notification.link);
                  }}
                  className={cx(
                    "flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-2",
                    notification.read ? "opacity-70" : "",
                  )}
                >
                  <span
                    className={cx(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      notification.level === "critical"
                        ? "bg-danger"
                        : notification.level === "warning"
                          ? "bg-warn"
                          : notification.level === "success"
                            ? "bg-ok"
                            : "bg-info",
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium text-ink">{notification.title}</span>
                      <Badge tone="neutral">{titleCase(notification.level)}</Badge>
                      {!notification.read ? <Badge tone="info">Unread</Badge> : null}
                    </span>
                    <span className="mt-1 block text-[12px] leading-relaxed text-muted">{notification.body}</span>
                    <span className="mt-1 block text-[10px] tracking-wide text-muted uppercase">
                      {relativeTime(notification.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
