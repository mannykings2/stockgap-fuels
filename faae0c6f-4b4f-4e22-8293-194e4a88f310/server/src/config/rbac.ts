/**
 * Role based access control catalogue.
 *
 * This is the single source of truth for permissions. The seed script writes
 * these definition into the `permissions`, `roles` and `role_permissions`
 * tables, and authorisation middleware checks the database-backed set, so a
 * deployment can adjust grants without a code change.
 */

export interface PermissionDefinition {
  code: string;
  module: string;
  description: string;
}

export const PERMISSIONS: PermissionDefinition[] = [
  { code: "dashboard:view", module: "dashboard", description: "View role dashboard" },

  { code: "products:read", module: "catalogue", description: "View the product catalogue" },
  { code: "products:manage", module: "catalogue", description: "Create and edit products" },

  { code: "suppliers:read", module: "suppliers", description: "View supplier records" },
  { code: "suppliers:manage", module: "suppliers", description: "Create and edit suppliers" },
  { code: "customers:read", module: "customers", description: "View customer, distributor and retailer records" },
  { code: "customers:manage", module: "customers", description: "Create and edit customers and channel partners" },

  { code: "procurement:read", module: "procurement", description: "View purchase orders and receipts" },
  { code: "procurement:create", module: "procurement", description: "Raise purchase orders" },
  { code: "procurement:approve", module: "procurement", description: "Approve or reject purchase orders" },
  { code: "procurement:receive", module: "procurement", description: "Book goods receipts against purchase orders" },

  { code: "inventory:read", module: "inventory", description: "View stock positions and movements" },
  { code: "inventory:write", module: "inventory", description: "Post stock movements" },
  { code: "inventory:adjust", module: "inventory", description: "Post stock adjustments and dip corrections" },

  { code: "lpg:read", module: "lpg", description: "View LPG terminal, tank and filling operations" },
  { code: "lpg:operate", module: "lpg", description: "Run LPG filling and terminal operations" },
  { code: "petroleum:read", module: "petroleum", description: "View petroleum product stock and loadings" },
  { code: "petroleum:operate", module: "petroleum", description: "Run petroleum product operations" },

  { code: "manufacturing:read", module: "manufacturing", description: "View production orders and BOMs" },
  { code: "manufacturing:create", module: "manufacturing", description: "Create production orders" },
  { code: "manufacturing:operate", module: "manufacturing", description: "Start, complete or cancel production orders" },

  { code: "quality:read", module: "quality", description: "View quality inspections" },
  { code: "quality:inspect", module: "quality", description: "Record quality inspection results" },

  { code: "orders:read", module: "sales", description: "View customer orders" },
  { code: "orders:create", module: "sales", description: "Create customer orders" },
  { code: "orders:approve", module: "sales", description: "Approve customer orders and allocate stock" },
  { code: "orders:dispatch", module: "sales", description: "Dispatch approved orders" },

  { code: "logistics:read", module: "logistics", description: "View shipments and transport records" },
  { code: "logistics:manage", module: "logistics", description: "Plan and update shipments" },
  { code: "deliveries:confirm", module: "logistics", description: "Confirm proof of delivery" },

  { code: "finance:read", module: "finance", description: "View invoices, payments and receivables" },
  { code: "finance:manage", module: "finance", description: "Issue invoices and record payments" },

  { code: "hse:read", module: "hse", description: "View HSE incidents" },
  { code: "hse:report", module: "hse", description: "Report HSE incidents" },
  { code: "hse:manage", module: "hse", description: "Investigate and close HSE incidents" },

  { code: "enquiries:manage", module: "marketing", description: "Handle website enquiries" },
  { code: "users:read", module: "administration", description: "View platform users" },
  { code: "users:manage", module: "administration", description: "Create and edit platform users" },
  { code: "roles:manage", module: "administration", description: "Change role permission grants" },
  { code: "audit:read", module: "administration", description: "Read the audit trail" },
  { code: "reports:read", module: "reports", description: "View operational and financial reports" },
  { code: "settings:manage", module: "administration", description: "Change platform settings" },
] as const;

export interface RoleDefinition {
  id: string;
  name: string;
  label: string;
  description: string;
  /** `*` grants every permission (system administrator only). */
  permissions: string[] | "*";
  /** Party-scoped roles only ever see their own organisation's records. */
  scopedToParty: boolean;
}

const READ_ALL = PERMISSIONS.filter((permission) => permission.code.endsWith(":read")).map(
  (permission) => permission.code,
);

export const ROLES: RoleDefinition[] = [
  {
    id: "admin",
    name: "admin",
    label: "System administrator",
    description: "Full platform access, user and role administration.",
    permissions: "*",
    scopedToParty: false,
  },
  {
    id: "executive",
    name: "executive",
    label: "Executive management",
    description: "Company-wide read access with executive approvals.",
    permissions: [
      ...new Set([
        ...READ_ALL,
        "dashboard:view",
        "procurement:approve",
        "orders:approve",
        "reports:read",
      ]),
    ],
    scopedToParty: false,
  },
  {
    id: "operations_manager",
    name: "operations_manager",
    label: "Operations manager",
    description: "Runs terminals, depots, plants and order fulfilment.",
    permissions: [
      "dashboard:view",
      "products:read",
      "suppliers:read",
      "customers:read",
      "customers:manage",
      "procurement:read",
      "procurement:create",
      "procurement:approve",
      "procurement:receive",
      "inventory:read",
      "inventory:write",
      "inventory:adjust",
      "lpg:read",
      "lpg:operate",
      "petroleum:read",
      "petroleum:operate",
      "manufacturing:read",
      "manufacturing:create",
      "manufacturing:operate",
      "quality:read",
      "orders:read",
      "orders:create",
      "orders:approve",
      "orders:dispatch",
      "logistics:read",
      "logistics:manage",
      "deliveries:confirm",
      "hse:read",
      "hse:report",
      "hse:manage",
      "reports:read",
      "enquiries:manage",
    ],
    scopedToParty: false,
  },
  {
    id: "procurement_officer",
    name: "procurement_officer",
    label: "Procurement officer",
    description: "Raises and tracks purchase orders and supplier records.",
    permissions: [
      "dashboard:view",
      "procurement:read",
      "procurement:create",
      "procurement:receive",
      "suppliers:read",
      "suppliers:manage",
      "products:read",
      "inventory:read",
      "reports:read",
      "orders:read",
    ],
    scopedToParty: false,
  },
  {
    id: "warehouse_manager",
    name: "warehouse_manager",
    label: "Warehouse manager",
    description: "Owns stock accuracy, receipts and warehouse dispatch.",
    permissions: [
      "dashboard:view",
      "inventory:read",
      "inventory:write",
      "inventory:adjust",
      "procurement:read",
      "procurement:receive",
      "products:read",
      "orders:read",
      "orders:dispatch",
      "logistics:read",
      "quality:read",
      "reports:read",
    ],
    scopedToParty: false,
  },
  {
    id: "depot_operator",
    name: "depot_operator",
    label: "Depot / terminal operator",
    description: "Records terminal stock, filling and product loadings.",
    permissions: [
      "dashboard:view",
      "inventory:read",
      "inventory:write",
      "lpg:read",
      "lpg:operate",
      "petroleum:read",
      "petroleum:operate",
      "orders:read",
      "logistics:read",
      "hse:report",
      "products:read",
    ],
    scopedToParty: false,
  },
  {
    id: "production_supervisor",
    name: "production_supervisor",
    label: "Production supervisor",
    description: "Runs cylinder manufacturing and cylinder filling orders.",
    permissions: [
      "dashboard:view",
      "manufacturing:read",
      "manufacturing:create",
      "manufacturing:operate",
      "inventory:read",
      "quality:read",
      "products:read",
      "lpg:read",
      "lpg:operate",
      "hse:report",
      "reports:read",
    ],
    scopedToParty: false,
  },
  {
    id: "quality_inspector",
    name: "quality_inspector",
    label: "Quality inspector",
    description: "Inspects finished goods and certifies cylinders.",
    permissions: [
      "dashboard:view",
      "quality:read",
      "quality:inspect",
      "manufacturing:read",
      "inventory:read",
      "products:read",
      "hse:read",
      "reports:read",
    ],
    scopedToParty: false,
  },
  {
    id: "logistics_officer",
    name: "logistics_officer",
    label: "Logistics officer",
    description: "Plans shipments and manages delivery confirmation.",
    permissions: [
      "dashboard:view",
      "logistics:read",
      "logistics:manage",
      "deliveries:confirm",
      "orders:read",
      "orders:dispatch",
      "inventory:read",
      "customers:read",
      "reports:read",
    ],
    scopedToParty: false,
  },
  {
    id: "transporter",
    name: "transporter",
    label: "Haulage",
    description: "External haulage partner, sees only its own shipments.",
    permissions: ["dashboard:view", "logistics:read", "deliveries:confirm", "orders:read"],
    scopedToParty: true,
  },
  {
    id: "distributor",
    name: "distributor",
    label: "Distributor",
    description: "Bulk channel partner ordering LPG, petroleum and cylinders.",
    permissions: [
      "dashboard:view",
      "orders:read",
      "orders:create",
      "products:read",
      "inventory:read",
      "finance:read",
      "logistics:read",
    ],
    scopedToParty: true,
  },
  {
    id: "retailer",
    name: "retailer",
    label: "Retailer",
    description: "Retail channel partner ordering cylinders and LPG.",
    permissions: ["dashboard:view", "orders:read", "orders:create", "products:read", "finance:read", "logistics:read"],
    scopedToParty: true,
  },
  {
    id: "supplier",
    name: "supplier",
    label: "Supplier",
    description: "Vendor portal access to its own purchase orders.",
    permissions: ["dashboard:view", "procurement:read", "suppliers:read", "products:read"],
    scopedToParty: true,
  },
  {
    id: "finance_officer",
    name: "finance_officer",
    label: "Finance officer",
    description: "Receivables, invoices and payment recording.",
    permissions: [
      "dashboard:view",
      "finance:read",
      "finance:manage",
      "orders:read",
      "procurement:read",
      "inventory:read",
      "customers:read",
      "reports:read",
      "audit:read",
    ],
    scopedToParty: false,
  },
  {
    id: "hse_officer",
    name: "hse_officer",
    label: "HSE officer",
    description: "Health, safety and environment incident management.",
    permissions: [
      "dashboard:view",
      "hse:read",
      "hse:report",
      "hse:manage",
      "inventory:read",
      "logistics:read",
      "reports:read",
    ],
    scopedToParty: false,
  },
  {
    id: "sales_marketing",
    name: "sales_marketing",
    label: "Sales & marketing",
    description: "Commercial desk: customer records, order entry and website enquiries.",
    permissions: [
      "dashboard:view",
      "orders:read",
      "orders:create",
      "customers:read",
      "customers:manage",
      "products:read",
      "inventory:read",
      "finance:read",
      "logistics:read",
      "reports:read",
      "enquiries:manage",
    ],
    scopedToParty: false,
  },
  {
    id: "legal",
    name: "legal",
    label: "Legal",
    description: "Contract and compliance review with read-only access to commercial records.",
    permissions: [
      "dashboard:view",
      "orders:read",
      "procurement:read",
      "suppliers:read",
      "customers:read",
      "products:read",
      "inventory:read",
      "finance:read",
      "hse:read",
      "audit:read",
      "reports:read",
    ],
    scopedToParty: false,
  },
  {
    id: "hmo_manager",
    name: "hmo_manager",
    label: "HMO management",
    description: "Staff health cover administration: staff records, incident data and reports.",
    permissions: [
      "dashboard:view",
      "users:read",
      "hse:read",
      "hse:report",
      "audit:read",
      "reports:read",
    ],
    scopedToParty: false,
  },
  {
    id: "customer",
    name: "customer",
    label: "Customer",
    description: "Consumer and corporate customer self-service ordering.",
    permissions: ["dashboard:view", "orders:read", "orders:create", "products:read", "finance:read", "logistics:read"],
    scopedToParty: true,
  },
];

export function permissionsForRole(role: RoleDefinition): string[] {
  return role.permissions === "*" ? PERMISSIONS.map((permission) => permission.code) : role.permissions;
}
