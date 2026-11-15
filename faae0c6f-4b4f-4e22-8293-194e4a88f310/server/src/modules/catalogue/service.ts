/** Product catalogue: LPG, petroleum products, cylinders and components. */
import type { Db } from "../../db/database.js";
import { execute, nowIso, queryAll, queryOne } from "../../db/database.js";
import { conflict, notFound } from "../../platform/errors.js";
import { randomId } from "../../platform/security.js";
import { recordAudit } from "../../platform/audit.js";
import type { AuthContext } from "../../middleware/authenticate.js";

export interface ProductRow {
  id: string;
  sku: string;
  name: string;
  category: "lpg" | "petroleum" | "cylinder" | "component";
  unit: "MT" | "L" | "UNIT" | "KG";
  pack_size: string | null;
  description: string | null;
  reorder_level: number;
  unit_price_kobo: number;
  status: "active" | "discontinued";
  on_hand: number | null;
  reserved: number | null;
}

const SELECT = `
  SELECT p.*, SUM(i.quantity) AS on_hand, SUM(i.reserved) AS reserved
    FROM products p
    LEFT JOIN inventory i ON i.product_id = p.id
`;

function toProduct(row: ProductRow) {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category,
    unit: row.unit,
    packSize: row.pack_size,
    description: row.description,
    reorderLevel: row.reorder_level,
    unitPriceKobo: row.unit_price_kobo,
    status: row.status,
    onHand: Math.round(Number(row.on_hand ?? 0) * 1000) / 1000,
    reserved: Math.round(Number(row.reserved ?? 0) * 1000) / 1000,
  };
}

export function listProducts(
  db: Db,
  filter: { search?: string; category?: string; status?: string },
) {
  const conditions: string[] = [];
  const params: string[] = [];
  if (filter.search) {
    conditions.push("(p.name LIKE ? OR p.sku LIKE ?)");
    params.push(`%${filter.search}%`, `%${filter.search}%`);
  }
  if (filter.category) {
    conditions.push("p.category = ?");
    params.push(filter.category);
  }
  if (filter.status) {
    conditions.push("p.status = ?");
    params.push(filter.status);
  }
  const clause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = queryAll<ProductRow>(
    db,
    `${SELECT} ${clause} GROUP BY p.id ORDER BY p.category, p.name`,
    params,
  );
  return rows.map(toProduct);
}

export function getProduct(db: Db, id: string) {
  const row = queryOne<ProductRow>(db, `${SELECT} WHERE p.id = ? GROUP BY p.id`, [id]);
  if (!row) throw notFound("Product not found");
  const bom = queryAll<{ component_product_id: string; quantity_per_unit: number; sku: string; name: string; unit: string; unit_price_kobo: number }>(
    db,
    `SELECT b.component_product_id, b.quantity_per_unit, c.sku, c.name, c.unit, c.unit_price_kobo
       FROM bill_of_materials b
       JOIN products c ON c.id = b.component_product_id
      WHERE b.product_id = ?`,
    [id],
  );
  const stock = queryAll<{ location_id: string; location_name: string; quantity: number; reserved: number }>(
    db,
    `SELECT i.location_id, l.name AS location_name, i.quantity, i.reserved
       FROM inventory i JOIN locations l ON l.id = i.location_id
      WHERE i.product_id = ? ORDER BY l.name`,
    [id],
  );
  return {
    ...toProduct(row),
    billOfMaterials: bom.map((line) => ({
      componentProductId: line.component_product_id,
      sku: line.sku,
      name: line.name,
      unit: line.unit,
      quantityPerUnit: line.quantity_per_unit,
      unitPriceKobo: line.unit_price_kobo,
    })),
    stock: stock.map((line) => ({
      locationId: line.location_id,
      locationName: line.location_name,
      quantity: line.quantity,
      reserved: line.reserved,
    })),
  };
}

const categories = new Set(["lpg", "petroleum", "cylinder", "component"]);
const units = new Set(["MT", "L", "UNIT", "KG"]);

export interface ProductInput {
  sku: string;
  name: string;
  category: string;
  unit: string;
  packSize?: string | null;
  description?: string | null;
  reorderLevel: number;
  unitPriceKobo: number;
}

function normalise(input: ProductInput) {
  if (!categories.has(input.category)) throw conflict("Unknown product category");
  if (!units.has(input.unit)) throw conflict("Unknown unit of measure");
  return {
    sku: input.sku.trim().toUpperCase(),
    name: input.name.trim(),
    category: input.category,
    unit: input.unit,
    packSize: input.packSize?.trim() || null,
    description: input.description?.trim() || null,
    reorderLevel: input.reorderLevel,
    unitPriceKobo: input.unitPriceKobo,
  };
}

export function createProduct(db: Db, auth: AuthContext, input: ProductInput, ip?: string): string {
  const product = normalise(input);
  const existing = queryOne<{ id: string }>(db, "SELECT id FROM products WHERE sku = ?", [product.sku]);
  if (existing) throw conflict(`A product with SKU ${product.sku} already exists`);

  const id = randomId();
  const now = nowIso();
  execute(
    db,
    `INSERT INTO products (id, sku, name, category, unit, pack_size, description, reorder_level, unit_price_kobo, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    [id, product.sku, product.name, product.category, product.unit, product.packSize, product.description, product.reorderLevel, product.unitPriceKobo, now, now],
  );
  recordAudit(
    db,
    { id: auth.user.id, fullName: auth.user.fullName },
    { action: "catalogue.product_created", entityType: "product", entityId: id, summary: `Created product ${product.sku} - ${product.name}` },
    ip,
  );
  return id;
}

export function updateProduct(db: Db, auth: AuthContext, id: string, input: ProductInput, ip?: string): void {
  const existing = queryOne<{ id: string }>(db, "SELECT id FROM products WHERE id = ?", [id]);
  if (!existing) throw notFound("Product not found");
  const product = normalise(input);
  execute(
    db,
    `UPDATE products SET sku = ?, name = ?, category = ?, unit = ?, pack_size = ?, description = ?,
            reorder_level = ?, unit_price_kobo = ?, updated_at = ? WHERE id = ?`,
    [product.sku, product.name, product.category, product.unit, product.packSize, product.description, product.reorderLevel, product.unitPriceKobo, nowIso(), id],
  );
  recordAudit(
    db,
    { id: auth.user.id, fullName: auth.user.fullName },
    { action: "catalogue.product_updated", entityType: "product", entityId: id, summary: `Updated product ${product.sku}` },
    ip,
  );
}

export function setBillOfMaterials(
  db: Db,
  auth: AuthContext,
  productId: string,
  lines: { componentProductId: string; quantityPerUnit: number }[],
  ip?: string,
): void {
  const product = queryOne<{ name: string }>(db, "SELECT name FROM products WHERE id = ?", [productId]);
  if (!product) throw notFound("Product not found");
  for (const line of lines) {
    const component = queryOne<{ id: string }>(db, "SELECT id FROM products WHERE id = ?", [line.componentProductId]);
    if (!component) throw notFound("A component in the bill of materials does not exist");
    if (line.quantityPerUnit <= 0) throw conflict("Bill of materials quantities must be positive");
  }
  execute(db, "DELETE FROM bill_of_materials WHERE product_id = ?", [productId]);
  for (const line of lines) {
    execute(
      db,
      "INSERT INTO bill_of_materials (id, product_id, component_product_id, quantity_per_unit) VALUES (?, ?, ?, ?)",
      [randomId(), productId, line.componentProductId, line.quantityPerUnit],
    );
  }
  recordAudit(
    db,
    { id: auth.user.id, fullName: auth.user.fullName },
    {
      action: "catalogue.bom_updated",
      entityType: "product",
      entityId: productId,
      summary: `Updated bill of materials for ${product.name}`,
      metadata: { lines: lines.length },
    },
    ip,
  );
}
