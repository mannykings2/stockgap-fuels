/** Shared API/domain types used across the portal. */

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  jobTitle: string | null;
  roleId: string;
  roleName: string;
  roleLabel: string;
  partyId: string | null;
  partyName: string | null;
  partyType: string | null;
}

export interface SessionProfile {
  user: SessionUser;
  permissions: string[];
  scopedToParty: boolean;
}

export interface LocationOption {
  id: string;
  code: string;
  name: string;
  type: string;
  city: string;
  state: string;
}

export interface ProductOption {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  pack_size: string | null;
  unit_price_kobo: number;
}

export interface PartyOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

export interface ReferenceOptions {
  locations: LocationOption[];
  products: ProductOption[];
  suppliers: PartyOption[];
  customers: PartyOption[];
  transporters: PartyOption[];
  party: PartyOption | null;
}

export interface PageMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

export interface Kpi {
  key: string;
  label: string;
  value: number;
  format: "number" | "currency" | "quantity";
  hint?: string;
  link?: string;
  tone?: "default" | "warning" | "critical" | "success";
}

export interface DashboardData {
  role: { id: string; label: string };
  user: { fullName: string; jobTitle: string | null; partyName: string | null };
  kpis: Kpi[];
  alerts: { tone: "info" | "warning" | "critical" | "success"; title: string; detail: string; link: string }[];
  recentOrders: { id: string; reference: string; customer: string; status: string; totalKobo: number; createdAt: string }[];
  pipeline: { status: string; count: number; valueKobo: number }[];
  lowStock: { product: string; sku: string; location: string; unit: string; available: number; reorderLevel: number }[];
  charts: {
    salesTrend: { month: string; invoicedKobo: number; collectedKobo: number }[];
    stockByCategory: { category: string; quantity: number; valueKobo: number }[];
    production: { month: string; quantity: number; batches: number }[];
  };
}

export interface Order {
  id: string;
  reference: string;
  customer: { id: string; name: string; type: string };
  location: { id: string; name: string };
  status: string;
  channel: string;
  totalKobo: number;
  requestedDeliveryDate: string | null;
  deliveryAddress: string | null;
  contactPhone: string | null;
  notes: string | null;
  createdBy: { id: string; name: string };
  lineCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderLine {
  id: string;
  product: { id: string; sku: string; name: string; unit: string; category: string };
  quantity: number;
  allocatedQuantity: number;
  unitPriceKobo: number;
  lineTotalKobo: number;
}

export interface OrderDetail extends Order {
  lines: OrderLine[];
  shipments: {
    id: string;
    reference: string;
    status: string;
    vehiclePlate: string | null;
    driverName: string | null;
    destination: string;
    transporter: string | null;
    dispatchedAt: string | null;
    deliveredAt: string | null;
  }[];
  invoices: {
    id: string;
    reference: string;
    amountKobo: number;
    amountPaidKobo: number;
    status: string;
    issuedAt: string;
    dueDate: string | null;
  }[];
}

export interface PurchaseOrderLine {
  id: string;
  product: { id: string; sku: string; name: string; unit: string };
  quantity: number;
  receivedQuantity: number;
  unitPriceKobo: number;
  lineTotalKobo: number;
}

export interface PurchaseOrder {
  id: string;
  reference: string;
  supplier: { id: string; name: string };
  location: { id: string; name: string };
  status: string;
  currency: string;
  totalKobo: number;
  expectedDate: string | null;
  notes: string | null;
  requestedBy: { id: string; name: string };
  approvedBy: { id: string; name: string } | null;
  approvedAt: string | null;
  lineCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderDetail extends PurchaseOrder {
  lines: PurchaseOrderLine[];
  receipts: { id: string; reference: string; receivedAt: string; notes: string | null; receivedBy: string; totalQuantity: number }[];
}

export interface ProductionOrder {
  id: string;
  reference: string;
  type: "cylinder_manufacture" | "lpg_filling";
  product: { id: string; sku: string; name: string; unit: string };
  location: { id: string; name: string };
  plannedQuantity: number;
  producedQuantity: number;
  outstandingQuantity: number;
  status: string;
  dueDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdBy: string;
  createdAt: string;
  consumptions?: { componentProductId: string; sku: string; name: string; unit: string; quantity: number }[];
  inspections?: {
    id: string;
    reference: string;
    result: string;
    checkedQuantity: number;
    passedQuantity: number;
    failedQuantity: number;
    notes: string | null;
    inspectedAt: string;
    inspector: string;
  }[];
}

export interface StockLine {
  id: string;
  location: { id: string; code: string; name: string; type: string };
  product: { id: string; sku: string; name: string; category: string; unit: string; unitPriceKobo: number; reorderLevel: number };
  quantity: number;
  reserved: number;
  available: number;
  lowStock: boolean;
  updatedAt: string;
}

export interface Movement {
  id: string;
  direction: "in" | "out";
  quantity: number;
  balanceAfter: number;
  reason: string;
  note: string | null;
  product: { id: string; sku: string; name: string; unit: string };
  location: { id: string; name: string };
  createdBy: string | null;
  createdAt: string;
}

export interface Inspection {
  id: string;
  reference: string;
  inspectionType: string;
  checkedQuantity: number;
  passedQuantity: number;
  failedQuantity: number;
  result: string;
  notes: string | null;
  inspectedAt: string;
  inspector: string;
  productionOrder: { id: string; reference: string; productName: string } | null;
}

export interface Shipment {
  id: string;
  reference: string;
  order: { id: string; reference: string };
  customer: string;
  location: string;
  transporter: { id: string; name: string } | null;
  vehiclePlate: string | null;
  driverName: string | null;
  driverPhone: string | null;
  destination: string;
  status: string;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  deliveryNotes: string | null;
  createdAt: string;
  cargo?: { sku: string; name: string; unit: string; quantity: number }[];
}

export interface Invoice {
  id: string;
  reference: string;
  order: { id: string; reference: string };
  customer: { id: string; name: string };
  amountKobo: number;
  amountPaidKobo: number;
  outstandingKobo: number;
  status: string;
  issuedAt: string;
  dueDate: string | null;
  isOverdue: boolean;
}

export interface InvoiceDetail extends Invoice {
  payments: { id: string; reference: string; amountKobo: number; method: string; receivedAt: string; notes: string | null; recordedBy: string }[];
}

export interface FinanceSummary {
  invoicedKobo: number;
  collectedKobo: number;
  outstandingKobo: number;
  overdueKobo: number;
  byStatus: { status: string; count: number; outstandingKobo: number }[];
}

export interface Party {
  id: string;
  code: string;
  name: string;
  type: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  tin: string | null;
  status: string;
  creditLimitKobo: number;
  notes: string | null;
  openOrders: number;
  outstandingKobo: number;
  createdAt: string;
}

export interface Incident {
  id: string;
  reference: string;
  category: string;
  severity: string;
  status: string;
  description: string;
  correctiveAction: string | null;
  occurredAt: string;
  closedAt: string | null;
  location: string;
  reportedBy: string;
  createdAt: string;
}

export interface HsePayload {
  incidents: Incident[];
  summary: { open: number; investigating: number; closed: number; bySeverity: { severity: string; count: number }[]; thisMonth: number };
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  level: string;
  link: string | null;
  createdAt: string;
  read: boolean;
  readAt: string | null;
}

export interface UserRecord {
  id: string;
  email: string;
  fullName: string;
  jobTitle: string | null;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  role: { id: string; label: string };
  party: string | null;
}

export interface RoleRecord {
  id: string;
  name: string;
  label: string;
  description: string;
  isSystem: boolean;
  permissionCount: number;
  permissions: string[];
}

export interface PermissionRecord {
  code: string;
  module: string;
  description: string;
}

export interface AuditEntry {
  id: string;
  actor: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface Enquiry {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  type: string;
  status: string;
  createdAt: string;
}
