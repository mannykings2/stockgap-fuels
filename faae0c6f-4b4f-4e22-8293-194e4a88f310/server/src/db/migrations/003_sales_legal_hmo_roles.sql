-- Additional staff roles. Kept in step with the catalogue in config/rbac.ts so
-- existing databases receive the roles without a reseed. Safe to re-run.
--
-- Grants are written with INSERT ... SELECT FROM permissions rather than plain
-- VALUES: on a fresh database this migration runs before the seed, so the
-- permission catalogue is still empty and the grants are a no-op (the seed
-- writes them from config/rbac.ts). On an already-seeded database the SELECT
-- matches and the grants are applied.

INSERT OR IGNORE INTO roles (id, name, label, description, is_system) VALUES
  ('sales_marketing', 'sales_marketing', 'Sales & marketing',
   'Commercial desk: customer records, order entry and website enquiries.', 1),
  ('legal', 'legal', 'Legal',
   'Contract and compliance review with read-only access to commercial records.', 1),
  ('hmo_manager', 'hmo_manager', 'HMO management',
   'Staff health cover administration: staff records, incident data and reports.', 1);

INSERT OR IGNORE INTO role_permissions (role_id, permission_code)
SELECT 'sales_marketing', code FROM permissions WHERE code IN (
  'dashboard:view', 'orders:read', 'orders:create', 'customers:read', 'customers:manage',
  'products:read', 'inventory:read', 'finance:read', 'logistics:read', 'reports:read',
  'enquiries:manage'
);

INSERT OR IGNORE INTO role_permissions (role_id, permission_code)
SELECT 'legal', code FROM permissions WHERE code IN (
  'dashboard:view', 'orders:read', 'procurement:read', 'suppliers:read', 'customers:read',
  'products:read', 'inventory:read', 'finance:read', 'hse:read', 'audit:read', 'reports:read'
);

INSERT OR IGNORE INTO role_permissions (role_id, permission_code)
SELECT 'hmo_manager', code FROM permissions WHERE code IN (
  'dashboard:view', 'users:read', 'hse:read', 'hse:report', 'audit:read', 'reports:read'
);
