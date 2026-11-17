-- Additional staff roles. Kept in step with the catalogue in config/rbac.ts so
-- existing databases receive the roles without a reseed. Safe to re-run.

INSERT OR IGNORE INTO roles (id, name, label, description, is_system) VALUES
  ('sales_marketing', 'sales_marketing', 'Sales & marketing',
   'Commercial desk: customer records, order entry and website enquiries.', 1),
  ('legal', 'legal', 'Legal',
   'Contract and compliance review with read-only access to commercial records.', 1),
  ('hmo_manager', 'hmo_manager', 'HMO management',
   'Staff health cover administration: staff records, incident data and reports.', 1);

INSERT OR IGNORE INTO role_permissions (role_id, permission_code) VALUES
  ('sales_marketing', 'dashboard:view'),
  ('sales_marketing', 'orders:read'),
  ('sales_marketing', 'orders:create'),
  ('sales_marketing', 'customers:read'),
  ('sales_marketing', 'customers:manage'),
  ('sales_marketing', 'products:read'),
  ('sales_marketing', 'inventory:read'),
  ('sales_marketing', 'finance:read'),
  ('sales_marketing', 'logistics:read'),
  ('sales_marketing', 'reports:read'),
  ('sales_marketing', 'enquiries:manage'),

  ('legal', 'dashboard:view'),
  ('legal', 'orders:read'),
  ('legal', 'procurement:read'),
  ('legal', 'suppliers:read'),
  ('legal', 'customers:read'),
  ('legal', 'products:read'),
  ('legal', 'inventory:read'),
  ('legal', 'finance:read'),
  ('legal', 'hse:read'),
  ('legal', 'audit:read'),
  ('legal', 'reports:read'),

  ('hmo_manager', 'dashboard:view'),
  ('hmo_manager', 'users:read'),
  ('hmo_manager', 'hse:read'),
  ('hmo_manager', 'hse:report'),
  ('hmo_manager', 'audit:read'),
  ('hmo_manager', 'reports:read');
