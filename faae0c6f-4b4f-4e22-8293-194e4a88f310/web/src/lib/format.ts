/** Formatting helpers. Money arrives from the API as integer kobo. */

export function money(kobo: number, options: { compact?: boolean; currency?: boolean } = {}): string {
  const naira = kobo / 100;
  if (options.compact) {
    const units: [number, string][] = [
      [1_000_000_000, "bn"],
      [1_000_000, "m"],
      [1_000, "k"],
    ];
    for (const [threshold, suffix] of units) {
      if (Math.abs(naira) >= threshold) {
        return `₦${(naira / threshold).toFixed(naira / threshold >= 100 ? 0 : 1)}${suffix}`;
      }
    }
  }
  return new Intl.NumberFormat("en-NG", {
    style: options.currency === false ? "decimal" : "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(naira);
}

export function moneyFromInput(value: string): number {
  const digits = value.replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(digits);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function quantity(value: number, unit?: string): string {
  const formatted = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 3 }).format(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

export function compactNumber(value: number): string {
  return new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function dateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function dateOnly(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-NG", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function relativeTime(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return dateOnly(value);
}

export function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .replace(/\bLpg\b/g, "LPG")
    .replace(/\bPms\b/g, "PMS")
    .replace(/\bAgo\b/g, "AGO")
    .replace(/\bDpk\b/g, "DPK")
    .replace(/\bAtk\b/g, "ATK")
    .replace(/\bHse\b/g, "HSE")
    .replace(/\bPo\b/g, "PO");
}

export interface StatusTone {
  tone: "neutral" | "success" | "warning" | "danger" | "info";
  label: string;
}

const STATUS_TONES: Record<string, StatusTone> = {
  draft: { tone: "neutral", label: "Draft" },
  pending_approval: { tone: "warning", label: "Pending approval" },
  approved: { tone: "info", label: "Approved" },
  allocated: { tone: "info", label: "Allocated" },
  partially_received: { tone: "info", label: "Partially received" },
  received: { tone: "success", label: "Received" },
  dispatched: { tone: "info", label: "Dispatched" },
  delivered: { tone: "success", label: "Delivered" },
  cancelled: { tone: "neutral", label: "Cancelled" },
  planned: { tone: "neutral", label: "Planned" },
  in_progress: { tone: "info", label: "In progress" },
  awaiting_quality: { tone: "warning", label: "Awaiting quality" },
  completed: { tone: "success", label: "Completed" },
  rejected: { tone: "danger", label: "Rejected" },
  loaded: { tone: "info", label: "Loaded" },
  in_transit: { tone: "info", label: "In transit" },
  failed: { tone: "danger", label: "Failed" },
  issued: { tone: "info", label: "Issued" },
  partially_paid: { tone: "warning", label: "Partially paid" },
  paid: { tone: "success", label: "Paid" },
  void: { tone: "neutral", label: "Void" },
  open: { tone: "warning", label: "Open" },
  investigating: { tone: "info", label: "Investigating" },
  closed: { tone: "success", label: "Closed" },
  pass: { tone: "success", label: "Pass" },
  fail: { tone: "danger", label: "Fail" },
  conditional: { tone: "warning", label: "Conditional" },
  active: { tone: "success", label: "Active" },
  suspended: { tone: "danger", label: "Suspended" },
  in_review: { tone: "info", label: "In review" },
  responded: { tone: "success", label: "Responded" },
  new: { tone: "warning", label: "New" },
  on_hold: { tone: "warning", label: "On hold" },
  inactive: { tone: "neutral", label: "Inactive" },
  low: { tone: "info", label: "Low" },
  medium: { tone: "warning", label: "Medium" },
  high: { tone: "danger", label: "High" },
  critical: { tone: "danger", label: "Critical" },
};

export function statusMeta(value: string): StatusTone {
  return STATUS_TONES[value] ?? { tone: "neutral", label: titleCase(value) };
}
