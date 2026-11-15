/**
 * Demonstration data.
 *
 * IMPORTANT: every company, person, price and transaction below is SAMPLE DATA
 * created to exercise the platform. None of it represents real Stockgap Fuels
 * transactions, capacities, partners or staff.
 *
 * Historical workflow documents (purchase orders, production batches, orders)
 * are seeded with consistent statuses, and their stock effects are consolidated
 * into the opening-balance movements so the ledger starts balanced.
 */
import type { Db } from "./database.js";
import { execute, getSetting, nowIso, queryOne, setSetting, transaction, type Param } from "./database.js";
import { hashPassword, randomId } from "../platform/security.js";
import { nextReference } from "../platform/references.js";
import { notify, recordAudit } from "../platform/audit.js";
import { PERMISSIONS, ROLES, permissionsForRole } from "../config/rbac.js";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../config/demo.js";

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString();
const daysAhead = (days: number) => new Date(Date.now() + days * DAY).toISOString();

interface SeedResult {
  skipped?: boolean;
  users: number;
  products: number;
  orders: number;
  productionOrders: number;
  purchaseOrders: number;
}

export function seed(db: Db): SeedResult {
  const existing = queryOne<{ count: number }>(db, "SELECT COUNT(*) AS count FROM users");
  if (Number(existing?.count ?? 0) > 0) {
    return { skipped: true, users: 0, products: 0, orders: 0, productionOrders: 0, purchaseOrders: 0 };
  }

  const result: SeedResult = { users: 0, products: 0, orders: 0, productionOrders: 0, purchaseOrders: 0 };

  transaction(db, () => {
    seedRbac(db);
    seedSettings(db);
    const locations = seedLocations(db);
    const parties = seedParties(db);
    const users = seedUsers(db, parties, result);
    const products = seedProducts(db);
    const inventory = seedInventory(db, locations, products, parties);
    seedProcurement(db, locations, parties, users, products, inventory, result);
    seedManufacturing(db, locations, products, users, inventory, result);
    seedOrders(db, locations, parties, users, products, inventory, result);
    seedHse(db, locations, users);
    seedEnquiries(db);
    seedNotifications(db);
    seedAuditTrail(db, users);
  });

  return result;
}

// --------------------------------------------------------------------- RBAC
function seedRbac(db: Db): void {
  const catalogue = new Set(PERMISSIONS.map((permission) => permission.code));
  for (const role of ROLES) {
    for (const permission of permissionsForRole(role)) {
      if (!catalogue.has(permission)) {
        throw new Error(`Role ${role.id} references unknown permission ${permission}`);
      }
    }
  }
  for (const permission of PERMISSIONS) {
    execute(db, "INSERT INTO permissions (code, module, description) VALUES (?, ?, ?)", [
      permission.code,
      permission.module,
      permission.description,
    ]);
  }
  for (const role of ROLES) {
    execute(db, "INSERT INTO roles (id, name, label, description, is_system) VALUES (?, ?, ?, ?, 1)", [
      role.id,
      role.name,
      role.label,
      role.description,
    ]);
    for (const permission of permissionsForRole(role)) {
      execute(db, "INSERT INTO role_permissions (role_id, permission_code) VALUES (?, ?)", [role.id, permission]);
    }
  }
}

function seedSettings(db: Db): void {
  setSetting(db, "company.name", "Stockgap Fuels Limited");
  setSetting(db, "company.headOffice", "Port Harcourt, Rivers State, Nigeria");
  setSetting(db, "company.currency", "NGN");
  setSetting(db, "company.fiscalYearStart", "01-01");
  setSetting(db, "demo.environment", "true");
  setSetting(db, "demo.notice", "All records are demonstration data and are not actual Stockgap transactions.");
}

// ---------------------------------------------------------------- locations
interface LocationSeed {
  id: string;
  code: string;
  name: string;
  type: "terminal" | "depot" | "warehouse" | "plant" | "retail_outlet";
  city: string;
  state: string;
  address: string;
  capacityNote: string;
}

function seedLocations(db: Db): Record<string, string> {
  const rows: LocationSeed[] = [
    {
      id: randomId(),
      code: "PH-TERM",
      name: "Port Harcourt Terminal",
      type: "terminal",
      city: "Port Harcourt",
      state: "Rivers",
      address: "Rumuolumeni, Port Harcourt",
      capacityNote: "Bulk LPG and white product storage with jetty access (demo figures)",
    },
    {
      id: randomId(),
      code: "PH-PLANT",
      name: "Port Harcourt Cylinder Plant",
      type: "plant",
      city: "Port Harcourt",
      state: "Rivers",
      address: "Rumuolumeni Industrial Layout, Port Harcourt",
      capacityNote: "Cylinder manufacturing and LPG filling lines (demo figures)",
    },
    {
      id: randomId(),
      code: "LAG-DEPOT",
      name: "Lagos Depot",
      type: "depot",
      city: "Lagos",
      state: "Lagos",
      address: "Ijegun, Lagos",
      capacityNote: "Distribution depot serving the South-West (demo figures)",
    },
    {
      id: randomId(),
      code: "ABJ-WH",
      name: "Abuja Distribution Warehouse",
      type: "warehouse",
      city: "Abuja",
      state: "FCT",
      address: "Kuje, Abuja",
      capacityNote: "Finished cylinder stock and regional fulfilment (demo figures)",
    },
    {
      id: randomId(),
      code: "PH-RETAIL",
      name: "Rumuokoro Retail Outlet",
      type: "retail_outlet",
      city: "Port Harcourt",
      state: "Rivers",
      address: "Rumuokoro, Port Harcourt",
      capacityNote: "Consumer cylinder exchange point (demo figures)",
    },
  ];
  for (const row of rows) {
    execute(
      db,
      `INSERT INTO locations (id, code, name, type, city, state, address, capacity_note, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [row.id, row.code, row.name, row.type, row.city, row.state, row.address, row.capacityNote],
    );
  }
  return Object.fromEntries(rows.map((row) => [row.code, row.id]));
}

// ------------------------------------------------------------------ parties
interface PartySeed {
  id: string;
  code: string;
  name: string;
  type: "supplier" | "distributor" | "retailer" | "customer" | "transporter";
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  tin: string;
  creditLimitKobo: number;
  notes: string;
}

function seedParties(db: Db): Record<string, string> {
  const rows: PartySeed[] = [
    {
      id: randomId(), code: "PTY-0001", name: "Bridgetown Steel & Valves Ltd", type: "supplier",
      contactName: "Goodluck Amadi", email: "sales@bridgetownsteel.example", phone: "+234 803 000 0001",
      address: "Trans-Amadi Industrial Layout", city: "Port Harcourt", state: "Rivers",
      tin: "DEMO-TIN-0001", creditLimitKobo: 0, notes: "Demonstration supplier - cylinder steel and valve assemblies",
    },
    {
      id: randomId(), code: "PTY-0002", name: "Delta Industrial Gases Ltd", type: "supplier",
      contactName: "Ebiere Tamuno", email: "supply@deltagases.example", phone: "+234 803 000 0002",
      address: "Warri Industrial Estate", city: "Warri", state: "Delta",
      tin: "DEMO-TIN-0002", creditLimitKobo: 0, notes: "Demonstration supplier - bulk LPG feedstock",
    },
    {
      id: randomId(), code: "PTY-0003", name: "Harbour Industrial Spares Ltd", type: "supplier",
      contactName: "Chukwuma Nnaji", email: "orders@harbourspares.example", phone: "+234 803 000 0003",
      address: "Aba Road", city: "Port Harcourt", state: "Rivers",
      tin: "DEMO-TIN-0003", creditLimitKobo: 0, notes: "Demonstration supplier - valves, paint and spares",
    },
    {
      id: randomId(), code: "PTY-0004", name: "Bonny Gas Distributors Ltd", type: "distributor",
      contactName: "Ngozi Nwafor", email: "orders@bonnygas.example", phone: "+234 803 000 0004",
      address: "Aba Road, Rumuola", city: "Port Harcourt", state: "Rivers",
      tin: "DEMO-TIN-0004", creditLimitKobo: 2_500_000_000, notes: "Demonstration distributor for LPG cylinders and bulk product",
    },
    {
      id: randomId(), code: "PTY-0005", name: "Rumuokoro Gas Retail Ltd", type: "retailer",
      contactName: "Sani Musa", email: "shop@rumuokorogas.example", phone: "+234 803 000 0005",
      address: "Rumuokoro Junction", city: "Port Harcourt", state: "Rivers",
      tin: "DEMO-TIN-0005", creditLimitKobo: 800_000_000, notes: "Demonstration retail channel partner",
    },
    {
      id: randomId(), code: "PTY-0006", name: "Delta Haulage & Logistics Ltd", type: "transporter",
      contactName: "John Bassey", email: "dispatch@deltahaulage.example", phone: "+234 803 000 0006",
      address: "Elelenwo", city: "Port Harcourt", state: "Rivers",
      tin: "DEMO-TIN-0006", creditLimitKobo: 0, notes: "Demonstration haulage partner for cylinder and LPG deliveries",
    },
    {
      id: randomId(), code: "PTY-0007", name: "Zenith Facilities Services Ltd", type: "customer",
      contactName: "Funmi Adebayo", email: "procurement@zenithfacilities.example", phone: "+234 803 000 0007",
      address: "Trans-Amadi", city: "Port Harcourt", state: "Rivers",
      tin: "DEMO-TIN-0007", creditLimitKobo: 500_000_000, notes: "Demonstration corporate customer - diesel and LPG for facilities",
    },
  ];
  for (const row of rows) {
    execute(
      db,
      `INSERT INTO parties (id, code, name, type, contact_name, email, phone, address, city, state, tin, status,
              credit_limit_kobo, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
      [
        row.id, row.code, row.name, row.type, row.contactName, row.email, row.phone, row.address,
        row.city, row.state, row.tin, row.creditLimitKobo, row.notes, daysAgo(120), nowIso(),
      ],
    );
  }
  return Object.fromEntries(rows.map((row) => [row.code, row.id]));
}

// -------------------------------------------------------------------- users
function seedUsers(db: Db, parties: Record<string, string>, result: SeedResult): Record<string, string> {
  const users: Record<string, string> = {};
  for (const account of DEMO_ACCOUNTS) {
    const id = randomId();
    execute(
      db,
      `INSERT INTO users (id, email, full_name, password_hash, role_id, party_id, phone, job_title, status,
              must_change_password, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, ?, ?)`,
      [
        id,
        account.email,
        account.fullName,
        hashPassword(DEMO_PASSWORD),
        account.roleId,
        account.partyCode ? parties[account.partyCode] ?? null : null,
        "+234 803 000 0100",
        account.jobTitle,
        daysAgo(90),
        nowIso(),
      ],
    );
    users[account.roleId] = id;
    result.users += 1;
  }
  return users;
}

// ----------------------------------------------------------------- products
interface ProductSeed {
  id: string;
  sku: string;
  name: string;
  category: "lpg" | "petroleum" | "cylinder" | "component";
  unit: "MT" | "L" | "UNIT" | "KG";
  packSize: string | null;
  description: string;
  reorderLevel: number;
  priceKobo: number;
}

function seedProducts(db: Db): Record<string, string> {
  const rows: ProductSeed[] = [
    {
      id: randomId(), sku: "LPG-BULK", name: "Liquefied Petroleum Gas (bulk)", category: "lpg", unit: "MT",
      packSize: "Bulk", description: "Bulk LPG held in terminal spheres for truck loading and bottling.",
      reorderLevel: 250, priceKobo: 105_000_000,
    },
    {
      id: randomId(), sku: "LPG-FILL-125", name: "LPG 12.5kg filled cylinder", category: "lpg", unit: "UNIT",
      packSize: "12.5 kg", description: "Filled 12.5kg domestic cylinder, ready for distributor and retail supply.",
      reorderLevel: 800, priceKobo: 1_850_000,
    },
    {
      id: randomId(), sku: "LPG-FILL-50", name: "LPG 50kg filled cylinder", category: "lpg", unit: "UNIT",
      packSize: "50 kg", description: "Filled 50kg commercial cylinder.",
      reorderLevel: 200, priceKobo: 6_800_000,
    },
    {
      id: randomId(), sku: "CYL-125-SHELL", name: "12.5kg cylinder shell", category: "cylinder", unit: "UNIT",
      packSize: "12.5 kg", description: "Manufactured and certified empty 12.5kg cylinder shell.",
      reorderLevel: 1_500, priceKobo: 980_000,
    },
    {
      id: randomId(), sku: "CYL-50-SHELL", name: "50kg cylinder shell", category: "cylinder", unit: "UNIT",
      packSize: "50 kg", description: "Manufactured and certified empty 50kg cylinder shell.",
      reorderLevel: 400, priceKobo: 3_200_000,
    },
    {
      id: randomId(), sku: "PMS", name: "Premium Motor Spirit (PMS)", category: "petroleum", unit: "L",
      packSize: "Bulk", description: "White product stored at the terminal for truck loading.",
      reorderLevel: 80_000, priceKobo: 92_000,
    },
    {
      id: randomId(), sku: "AGO", name: "Automotive Gas Oil (AGO)", category: "petroleum", unit: "L",
      packSize: "Bulk", description: "Diesel for industrial, marine and generator customers.",
      reorderLevel: 60_000, priceKobo: 115_000,
    },
    {
      id: randomId(), sku: "DPK", name: "Dual Purpose Kerosene (DPK)", category: "petroleum", unit: "L",
      packSize: "Bulk", description: "Household and industrial kerosene.",
      reorderLevel: 40_000, priceKobo: 105_000,
    },
    {
      id: randomId(), sku: "ATK", name: "Aviation Turbine Kerosene (ATK)", category: "petroleum", unit: "L",
      packSize: "Bulk", description: "Jet fuel stored in dedicated terminal tanks.",
      reorderLevel: 40_000, priceKobo: 132_000,
    },
    {
      id: randomId(), sku: "RAW-STEEL", name: "Cold rolled steel sheet", category: "component", unit: "KG",
      packSize: "Coil", description: "Cylinder body raw material (demonstration unit of measure).",
      reorderLevel: 6_000, priceKobo: 120_000,
    },
    {
      id: randomId(), sku: "RAW-VALVE", name: "Cylinder valve assembly", category: "component", unit: "UNIT",
      packSize: "Each", description: "Valve, regulator collar and safety component set.",
      reorderLevel: 1_500, priceKobo: 240_000,
    },
    {
      id: randomId(), sku: "RAW-PAINT", name: "Powder coating", category: "component", unit: "KG",
      packSize: "Kg", description: "Powder coating for cylinder finishing.",
      reorderLevel: 800, priceKobo: 450_000,
    },
  ];
  for (const row of rows) {
    execute(
      db,
      `INSERT INTO products (id, sku, name, category, unit, pack_size, description, reorder_level, unit_price_kobo, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [row.id, row.sku, row.name, row.category, row.unit, row.packSize, row.description, row.reorderLevel, row.priceKobo, daysAgo(120), nowIso()],
    );
  }
  const bySku = Object.fromEntries(rows.map((row) => [row.sku, row.id]));

  const bom: [string, string, number][] = [
    ["CYL-125-SHELL", "RAW-STEEL", 4.2],
    ["CYL-125-SHELL", "RAW-VALVE", 1],
    ["CYL-125-SHELL", "RAW-PAINT", 0.25],
    ["CYL-50-SHELL", "RAW-STEEL", 14.5],
    ["CYL-50-SHELL", "RAW-VALVE", 1],
    ["CYL-50-SHELL", "RAW-PAINT", 0.9],
    ["LPG-FILL-125", "LPG-BULK", 0.0125],
    ["LPG-FILL-125", "CYL-125-SHELL", 1],
    ["LPG-FILL-50", "LPG-BULK", 0.05],
    ["LPG-FILL-50", "CYL-50-SHELL", 1],
  ];
  for (const [product, component, quantity] of bom) {
    execute(
      db,
      "INSERT INTO bill_of_materials (id, product_id, component_product_id, quantity_per_unit) VALUES (?, ?, ?, ?)",
      [randomId(), bySku[product], bySku[component], quantity],
    );
  }
  return bySku;
}

// ---------------------------------------------------------------- inventory
function openingBalance(
  db: Db,
  locationId: string,
  productId: string,
  quantity: number,
  at: string,
): string {
  const id = randomId();
  execute(
    db,
    "INSERT INTO inventory (id, location_id, product_id, quantity, reserved, updated_at) VALUES (?, ?, ?, ?, 0, ?)",
    [id, locationId, productId, quantity, at],
  );
  execute(
    db,
    `INSERT INTO inventory_movements
       (id, location_id, product_id, direction, quantity, balance_after, reason, reference_type, note, created_at)
     VALUES (?, ?, ?, 'in', ?, ?, 'opening_balance', 'seed', 'Demonstration opening balance', ?)`,
    [randomId(), locationId, productId, quantity, quantity, at],
  );
  return id;
}

function seedInventory(
  db: Db,
  locations: Record<string, string>,
  products: Record<string, string>,
  _parties: Record<string, string>,
): Record<string, string> {
  const at = daysAgo(35);
  const rows: [string, string, number][] = [
    ["PH-TERM", "LPG-BULK", 3_200],
    ["PH-TERM", "PMS", 1_850_000],
    ["PH-TERM", "AGO", 940_000],
    ["PH-TERM", "DPK", 420_000],
    ["PH-TERM", "ATK", 260_000],
    ["PH-PLANT", "LPG-BULK", 180],
    ["PH-PLANT", "CYL-125-SHELL", 8_400],
    ["PH-PLANT", "CYL-50-SHELL", 2_150],
    ["PH-PLANT", "LPG-FILL-125", 3_600],
    ["PH-PLANT", "LPG-FILL-50", 740],
    ["PH-PLANT", "RAW-STEEL", 37_000],
    ["PH-PLANT", "RAW-VALVE", 10_600],
    ["PH-PLANT", "RAW-PAINT", 6_800],
    ["LAG-DEPOT", "LPG-BULK", 640],
    ["LAG-DEPOT", "AGO", 320_000],
    ["LAG-DEPOT", "PMS", 480_000],
    ["LAG-DEPOT", "LPG-FILL-125", 1_200],
    ["ABJ-WH", "LPG-FILL-125", 900],
    ["ABJ-WH", "LPG-FILL-50", 260],
    ["ABJ-WH", "CYL-125-SHELL", 1_400],
    ["PH-RETAIL", "LPG-FILL-125", 120],
    ["PH-RETAIL", "LPG-FILL-50", 40],
  ];
  const ids: Record<string, string> = {};
  for (const [locationCode, sku, quantity] of rows) {
    ids[`${locationCode}:${sku}`] = openingBalance(db, locations[locationCode]!, products[sku]!, quantity, at);
  }
  return ids;
}

// -------------------------------------------------------------- procurement
function seedProcurement(
  db: Db,
  locations: Record<string, string>,
  parties: Record<string, string>,
  users: Record<string, string>,
  products: Record<string, string>,
  inventory: Record<string, string>,
  result: SeedResult,
): void {
  const procurement = users.procurement_officer!;
  const operations = users.operations_manager!;

  const createPo = (
    supplierId: string,
    locationId: string,
    status: string,
    lines: { productId: string; quantity: number; unitPriceKobo: number; received?: number }[],
    createdAt: string,
    approved: boolean,
  ) => {
    const id = randomId();
    const reference = nextReference(db, "PO", "PO");
    const total = lines.reduce((sum, line) => sum + Math.round(line.quantity * line.unitPriceKobo), 0);
    execute(
      db,
      `INSERT INTO purchase_orders (id, reference, supplier_id, location_id, status, currency, total_kobo,
              expected_date, notes, requested_by, approved_by, approved_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'NGN', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, reference, supplierId, locationId, status, total, daysAhead(5),
        "Demonstration purchase order", procurement, approved ? operations : null,
        approved ? daysAgo(3) : null, createdAt, nowIso(),
      ],
    );
    const lineIds: string[] = [];
    for (const line of lines) {
      const lineId = randomId();
      lineIds.push(lineId);
      execute(
        db,
        `INSERT INTO purchase_order_lines (id, purchase_order_id, product_id, quantity, received_quantity, unit_price_kobo)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [lineId, id, line.productId, line.quantity, line.received ?? 0, line.unitPriceKobo],
      );
    }
    result.purchaseOrders += 1;
    return { id, reference, lines, lineIds };
  };

  // Received order: steel and valves, booked at the plant.
  const received = createPo(
    parties["PTY-0001"]!,
    locations["PH-PLANT"]!,
    "received",
    [
      { productId: products["RAW-STEEL"]!, quantity: 5_000, unitPriceKobo: 118_000, received: 5_000 },
      { productId: products["RAW-VALVE"]!, quantity: 1_000, unitPriceKobo: 235_000, received: 1_000 },
    ],
    daysAgo(12),
    true,
  );
  const grnId = randomId();
  const grnReference = nextReference(db, "GRN", "GRN");
  execute(
    db,
    `INSERT INTO goods_receipts (id, reference, purchase_order_id, location_id, received_by, received_at, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'Demonstration goods receipt', ?)`,
    [grnId, grnReference, received.id, locations["PH-PLANT"]!, users.warehouse_manager!, daysAgo(9), daysAgo(9)],
  );
  for (let index = 0; index < received.lines.length; index += 1) {
    const line = received.lines[index]!;
    execute(
      db,
      `INSERT INTO goods_receipt_lines (id, goods_receipt_id, purchase_order_line_id, product_id, quantity)
       VALUES (?, ?, ?, ?, ?)`,
      [randomId(), grnId, received.lineIds[index]!, line.productId, line.quantity],
    );
    // Opening balance + receipt = current on-hand for these materials.
    const current = queryOne<{ quantity: number }>(
      db,
      "SELECT quantity FROM inventory WHERE location_id = ? AND product_id = ?",
      [locations["PH-PLANT"]!, line.productId],
    );
    const next = Number(current?.quantity ?? 0) + line.quantity;
    execute(db, "UPDATE inventory SET quantity = ?, updated_at = ? WHERE location_id = ? AND product_id = ?", [
      next, daysAgo(9), locations["PH-PLANT"]!, line.productId,
    ]);
    execute(
      db,
      `INSERT INTO inventory_movements (id, location_id, product_id, direction, quantity, balance_after, reason,
              reference_type, reference_id, note, created_by, created_at)
       VALUES (?, ?, ?, 'in', ?, ?, 'goods_receipt', 'goods_receipt', ?, ?, ?, ?)`,
      [randomId(), locations["PH-PLANT"]!, line.productId, line.quantity, next, grnId,
       `Received against ${received.reference}`, users.warehouse_manager!, daysAgo(9)],
    );
  }

  // Approved order awaiting delivery: bulk LPG.
  createPo(
    parties["PTY-0002"]!,
    locations["PH-TERM"]!,
    "approved",
    [{ productId: products["LPG-BULK"]!, quantity: 500, unitPriceKobo: 102_000_000 }],
    daysAgo(4),
    true,
  );

  // Pending approval: valve and paint restock.
  createPo(
    parties["PTY-0003"]!,
    locations["PH-PLANT"]!,
    "pending_approval",
    [
      { productId: products["RAW-VALVE"]!, quantity: 2_000, unitPriceKobo: 238_000 },
      { productId: products["RAW-PAINT"]!, quantity: 3_000, unitPriceKobo: 440_000 },
    ],
    daysAgo(1),
    false,
  );

  void inventory;
}

// ------------------------------------------------------------ manufacturing
function seedManufacturing(
  db: Db,
  locations: Record<string, string>,
  products: Record<string, string>,
  users: Record<string, string>,
  _inventory: Record<string, string>,
  result: SeedResult,
): void {
  const plant = locations["PH-PLANT"]!;
  const production = users.production_supervisor!;
  const quality = users.quality_inspector!;

  const insertOrder = (input: {
    type: "cylinder_manufacture" | "lpg_filling";
    sku: string;
    planned: number;
    status: string;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    produced: number;
    dueDate: string;
  }) => {
    const id = randomId();
    const reference = nextReference(db, "PRD", "PRD");
    execute(
      db,
      `INSERT INTO production_orders (id, reference, type, product_id, location_id, planned_quantity, produced_quantity,
              status, due_date, started_at, completed_at, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, reference, input.type, products[input.sku]!, plant, input.planned, input.produced, input.status,
       input.dueDate, input.startedAt, input.completedAt, production, input.createdAt, nowIso()],
    );
    result.productionOrders += 1;
    return { id, reference };
  };

  // Completed cylinder batch with a passed inspection.
  const completed = insertOrder({
    type: "cylinder_manufacture", sku: "CYL-125-SHELL", planned: 2_000, status: "completed",
    createdAt: daysAgo(24), startedAt: daysAgo(23), completedAt: daysAgo(20), produced: 2_000,
    dueDate: daysAgo(19),
  });
  const consumptions: [string, number][] = [
    ["RAW-STEEL", 8_400],
    ["RAW-VALVE", 2_000],
    ["RAW-PAINT", 500],
  ];
  for (const [sku, quantity] of consumptions) {
    execute(
      db,
      "INSERT INTO production_consumptions (id, production_order_id, component_product_id, quantity, created_at) VALUES (?, ?, ?, ?, ?)",
      [randomId(), completed.id, products[sku]!, quantity, daysAgo(23)],
    );
  }
  const inspectionId = randomId();
  const inspectionReference = nextReference(db, "QC", "QC");
  execute(
    db,
    `INSERT INTO quality_inspections (id, reference, production_order_id, inspection_type, checked_quantity,
            passed_quantity, failed_quantity, result, notes, inspector_id, inspected_at, created_at)
     VALUES (?, ?, ?, 'finished_goods', 2000, 2000, 0, 'pass', ?, ?, ?, ?)`,
    [inspectionId, inspectionReference, completed.id, "Valve torque, wall thickness and leak tests passed (demo).",
     quality, daysAgo(20), daysAgo(20)],
  );

  // LPG filling batch waiting for quality release.
  const awaiting = insertOrder({
    type: "lpg_filling", sku: "LPG-FILL-125", planned: 1_500, status: "awaiting_quality",
    createdAt: daysAgo(3), startedAt: daysAgo(2), completedAt: null, produced: 0, dueDate: daysAhead(1),
  });
  for (const [sku, quantity] of [["LPG-BULK", 18.75], ["CYL-125-SHELL", 1_500]] as [string, number][]) {
    execute(
      db,
      "INSERT INTO production_consumptions (id, production_order_id, component_product_id, quantity, created_at) VALUES (?, ?, ?, ?, ?)",
      [randomId(), awaiting.id, products[sku]!, quantity, daysAgo(2)],
    );
  }

  // Planned 50kg cylinder run.
  insertOrder({
    type: "cylinder_manufacture", sku: "CYL-50-SHELL", planned: 500, status: "planned",
    createdAt: daysAgo(1), startedAt: null, completedAt: null, produced: 0, dueDate: daysAhead(7),
  });
}

// ------------------------------------------------------------------- orders
function seedOrders(
  db: Db,
  locations: Record<string, string>,
  parties: Record<string, string>,
  users: Record<string, string>,
  products: Record<string, string>,
  _inventory: Record<string, string>,
  result: SeedResult,
): void {
  const sales = users.operations_manager!;
  const dispatcher = users.logistics_officer!;

  const createOrder = (input: {
    customerId: string;
    locationId: string;
    status: string;
    channel: string;
    createdAt: string;
    approvedAt: string | null;
    requestedDate: string;
    address: string;
    lines: { productId: string; quantity: number; unitPriceKobo: number; allocated?: number }[];
  }) => {
    const id = randomId();
    const reference = nextReference(db, "SO", "SO");
    const total = input.lines.reduce((sum, line) => sum + Math.round(line.quantity * line.unitPriceKobo), 0);
    execute(
      db,
      `INSERT INTO customer_orders (id, reference, customer_id, location_id, status, channel, total_kobo,
              requested_delivery_date, delivery_address, contact_phone, notes, created_by, approved_by, approved_at,
              created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Demonstration order', ?, ?, ?, ?, ?)`,
      [id, reference, input.customerId, input.locationId, input.status, input.channel, total,
       input.requestedDate, input.address, "+234 803 000 0200", sales, input.approvedAt ? sales : null,
       input.approvedAt, input.createdAt, nowIso()],
    );
    for (const line of input.lines) {
      execute(
        db,
        `INSERT INTO customer_order_lines (id, customer_order_id, product_id, quantity, allocated_quantity, unit_price_kobo)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [randomId(), id, line.productId, line.quantity, line.allocated ?? 0, line.unitPriceKobo],
      );
    }
    result.orders += 1;
    return { id, reference, total };
  };

  // 1. Delivered retailer order with invoice and part payment.
  const delivered = createOrder({
    customerId: parties["PTY-0005"]!,
    locationId: locations["PH-PLANT"]!,
    status: "delivered",
    channel: "retailer",
    createdAt: daysAgo(8),
    approvedAt: daysAgo(8),
    requestedDate: daysAgo(6),
    address: "Rumuokoro Junction, Port Harcourt",
    lines: [
      { productId: products["LPG-FILL-125"]!, quantity: 400, unitPriceKobo: 1_850_000, allocated: 400 },
      { productId: products["LPG-FILL-50"]!, quantity: 80, unitPriceKobo: 6_800_000, allocated: 80 },
    ],
  });
  const deliveredShipment = randomId();
  const deliveredShipmentRef = nextReference(db, "SHP", "SHP");
  execute(
    db,
    `INSERT INTO shipments (id, reference, order_id, transporter_id, vehicle_plate, driver_name, driver_phone,
            destination, status, dispatched_at, delivered_at, delivery_notes, confirmed_by, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'RIV-482-XA', 'Emeka Udo', '+234 803 000 0300', ?, 'delivered', ?, ?, 'Received in good condition (demo).', ?, ?, ?, ?)`,
    [deliveredShipment, deliveredShipmentRef, delivered.id, parties["PTY-0006"]!,
     "Rumuokoro Junction, Port Harcourt", daysAgo(7), daysAgo(6), dispatcher, dispatcher, daysAgo(7), daysAgo(6)],
  );
  const invoiceId = randomId();
  const invoiceReference = nextReference(db, "INV", "INV");
  execute(
    db,
    `INSERT INTO invoices (id, reference, order_id, customer_id, amount_kobo, amount_paid_kobo, status, issued_at, due_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'partially_paid', ?, ?, ?)`,
    [invoiceId, invoiceReference, delivered.id, parties["PTY-0005"]!, delivered.total,
     Math.round(delivered.total / 2), daysAgo(6), daysAhead(8), daysAgo(6)],
  );
  execute(
    db,
    `INSERT INTO payments (id, reference, invoice_id, amount_kobo, method, received_at, notes, recorded_by, created_at)
     VALUES (?, ?, ?, ?, 'bank_transfer', ?, 'Demonstration part payment', ?, ?)`,
    [randomId(), nextReference(db, "PMT", "PMT"), invoiceId, Math.round(delivered.total / 2), daysAgo(2),
     users.finance_officer!, daysAgo(2)],
  );

  // 2. Dispatched distributor order, shipment still in transit.
  const dispatched = createOrder({
    customerId: parties["PTY-0004"]!,
    locationId: locations["PH-TERM"]!,
    status: "dispatched",
    channel: "distributor",
    createdAt: daysAgo(3),
    approvedAt: daysAgo(3),
    requestedDate: daysAhead(1),
    address: "Aba Road, Rumuola, Port Harcourt",
    lines: [{ productId: products["LPG-BULK"]!, quantity: 40, unitPriceKobo: 105_000_000, allocated: 40 }],
  });
  execute(
    db,
    `INSERT INTO shipments (id, reference, order_id, transporter_id, vehicle_plate, driver_name, driver_phone,
            destination, status, dispatched_at, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'RIV-315-KJA', 'Bassey Etim', '+234 803 000 0301', ?, 'in_transit', ?, ?, ?, ?)`,
    [randomId(), nextReference(db, "SHP", "SHP"), dispatched.id, parties["PTY-0006"]!,
     "Aba Road, Rumuola, Port Harcourt", daysAgo(1), dispatcher, daysAgo(1), daysAgo(1)],
  );

  // 3. Allocated corporate order: AGO reserved at the terminal.
  const allocated = createOrder({
    customerId: parties["PTY-0007"]!,
    locationId: locations["PH-TERM"]!,
    status: "allocated",
    channel: "corporate",
    createdAt: daysAgo(2),
    approvedAt: daysAgo(2),
    requestedDate: daysAhead(2),
    address: "Trans-Amadi, Port Harcourt",
    lines: [{ productId: products["AGO"]!, quantity: 12_000, unitPriceKobo: 115_000, allocated: 12_000 }],
  });
  execute(db, "UPDATE inventory SET reserved = reserved + ? WHERE location_id = ? AND product_id = ?", [
    12_000, locations["PH-TERM"]!, products["AGO"]!,
  ]);

  // 4. Distributor order awaiting approval.
  createOrder({
    customerId: parties["PTY-0004"]!,
    locationId: locations["PH-PLANT"]!,
    status: "pending_approval",
    channel: "distributor",
    createdAt: daysAgo(1),
    approvedAt: null,
    requestedDate: daysAhead(4),
    address: "Aba Road, Rumuola, Port Harcourt",
    lines: [
      { productId: products["LPG-FILL-125"]!, quantity: 1_200, unitPriceKobo: 1_800_000 },
      { productId: products["LPG-FILL-50"]!, quantity: 240, unitPriceKobo: 6_600_000 },
    ],
  });

  void allocated;
}

// ---------------------------------------------------------------------- HSE
function seedHse(db: Db, locations: Record<string, string>, users: Record<string, string>): void {
  const rows: [string, string, string, string, string, number, string][] = [
    ["PH-TERM", "near_miss", "medium", "Loose hose coupling noticed during LPG truck loading", "open", 1,
      "Operator stopped loading and isolated the line (demo)."],
    ["PH-PLANT", "equipment_failure", "high", "Conveyor motor tripped twice during cylinder handling", "investigating", 3,
      "Maintenance team assessing motor winding; production resumed on the second line (demo)."],
    ["PH-RETAIL", "first_aid", "low", "Minor hand abrasion while changing a cylinder valve", "closed", 12,
      "First aid administered and valve tooling replaced (demo)."],
  ];
  for (const [locationCode, category, severity, description, status, age, action] of rows) {
    const id = randomId();
    const reference = nextReference(db, "HSE", "HSE");
    execute(
      db,
      `INSERT INTO hse_incidents (id, reference, location_id, category, severity, description, occurred_at,
              reported_by, status, corrective_action, closed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, reference, locations[locationCode]!, category, severity, description, daysAgo(age),
       users.hse_officer!, status, action, status === "closed" ? daysAgo(age - 1) : null,
       daysAgo(age), nowIso()],
    );
  }
}

function seedEnquiries(db: Db): void {
  const rows: [string, string, string, string, string, string, string, string, number][] = [
    ["Bright Okon", "Lekki Kitchen Solutions", "bright@example.com", "+234 802 000 0001",
      "Bulk 12.5kg cylinder supply for Lagos", "We operate six kitchens in Lekki and need a monthly cylinder supply plan. Please share distributor terms (demo enquiry).",
      "business", "new", 2],
    ["Sarah Adewale", "Greenfields Schools", "sarah@example.com", "+234 802 000 0002",
      "LPG supply for school kitchens", "Requesting pricing and delivery schedule for 50kg cylinders in Obio-Akpor (demo enquiry).",
      "customer", "responded", 6],
  ];
  for (const [name, company, email, phone, subject, message, type, status, age] of rows) {
    execute(
      db,
      `INSERT INTO enquiries (id, name, company, email, phone, subject, message, type, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [randomId(), name, company, email, phone, subject, message, type, status, daysAgo(age)],
    );
  }
}

function seedNotifications(db: Db): void {
  notify(db, {
    roleId: "quality_inspector",
    title: "Batch awaiting inspection",
    body: "An LPG filling batch of 1,500 cylinders is ready for quality inspection.",
    level: "info",
    link: "/portal/quality",
  });
  notify(db, {
    roleId: "warehouse_manager",
    title: "Approved order ready to allocate",
    body: "A distributor order for filled cylinders has been approved and needs stock allocation.",
    level: "info",
    link: "/portal/orders",
  });
  notify(db, {
    roleId: "procurement_officer",
    title: "Purchase order awaiting approval",
    body: "Harbour Industrial Spares purchase order for valves and paint is pending approval.",
    level: "warning",
    link: "/portal/procurement",
  });
  notify(db, {
    roleId: "hse_officer",
    title: "HIGH HSE incident reported",
    body: "Conveyor motor tripped twice during cylinder handling at the Port Harcourt plant.",
    level: "critical",
    link: "/portal/hse",
  });
}

function seedAuditTrail(db: Db, users: Record<string, string>): void {
  const actor = { id: users.admin!, fullName: "Adaeze Okonkwo" };
  const entries: [string, string, string, number][] = [
    ["demo.environment_initialised", "settings", "Demonstration environment initialised with sample operational data", 30],
    ["procurement.goods_received", "purchase_order", "Received demonstration steel and valve consignment at the cylinder plant", 9],
    ["quality.inspection_recorded", "quality_inspection", "Passed 2,000 12.5kg cylinder shells after leak and dimension checks", 20],
    ["orders.dispatched", "customer_order", "Dispatched 400 x 12.5kg and 80 x 50kg filled cylinders to a retail partner", 7],
    ["logistics.delivery_confirmed", "shipment", "Retail delivery confirmed; invoice issued", 6],
    ["finance.payment_recorded", "invoice", "Part payment received by bank transfer", 2],
  ];
  for (const [action, entityType, summary, age] of entries) {
    recordAudit(db, actor, { action, entityType, summary, entityId: null }, "127.0.0.1");
    void age;
  }
  void getSetting;
  void (null as unknown as Param);
}
