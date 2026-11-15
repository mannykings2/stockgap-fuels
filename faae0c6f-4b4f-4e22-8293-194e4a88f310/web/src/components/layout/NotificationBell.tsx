import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { useApi } from "@/lib/hooks";
import { api } from "@/lib/api";
import { cx } from "@/components/ui/primitives";
import { relativeTime, titleCase } from "@/lib/format";
import type { NotificationItem } from "@/types";

const levelDot: Record<string, string> = {
  info: "bg-info",
  success: "bg-ok",
  warning: "bg-warn",
  critical: "bg-danger",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useApi<{ notifications: NotificationItem[]; unread: number }>(
    ["notifications"],
    "/notifications",
    { refetchInterval: 45_000 },
  );

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAll = useMutation({
    mutationFn: () => api.post("/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const unread = data?.unread ?? 0;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        className="relative inline-flex size-9 items-center justify-center rounded-[10px] border border-line bg-surface text-muted transition-colors hover:text-ink"
      >
        <Bell className="size-4" />
        {unread > 0 ? (
          <span className="absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-[14px] border border-line bg-surface shadow-[var(--shadow-md)]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            <button
              type="button"
              onClick={() => markAll.mutate()}
              className="inline-flex items-center gap-1 text-[11px] text-brand hover:underline"
              disabled={unread === 0 || markAll.isPending}
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </button>
          </div>
          <div className="scrollbar-thin max-h-[380px] overflow-y-auto">
            {isLoading ? <p className="px-4 py-6 text-center text-xs text-muted">Loading…</p> : null}
            {!isLoading && (data?.notifications.length ?? 0) === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-muted">No notifications yet.</p>
            ) : null}
            {data?.notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => {
                  if (!notification.read) markRead.mutate(notification.id);
                  setOpen(false);
                  if (notification.link) navigate(notification.link);
                }}
                className={cx(
                  "flex w-full items-start gap-3 border-b border-line/60 px-4 py-3 text-left last:border-0 hover:bg-surface-2",
                  notification.read ? "opacity-65" : "",
                )}
              >
                <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", levelDot[notification.level] ?? "bg-muted")} />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-ink">{notification.title}</span>
                  <span className="mt-0.5 block text-xs text-muted">{notification.body}</span>
                  <span className="mt-1 block text-[10px] tracking-wide text-muted uppercase">
                    {titleCase(notification.level)} · {relativeTime(notification.createdAt)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
