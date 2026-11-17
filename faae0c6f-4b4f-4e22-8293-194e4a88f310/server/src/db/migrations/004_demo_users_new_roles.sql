-- Demo logins for the sales & marketing, legal and HMO management roles.
-- Fresh databases get these from the seed (config/demo.ts); this patch adds
-- them to databases that were seeded before the roles existed.
-- Password for all three: Stockgap#2026 (same as every demo account).
-- Safe to re-run: email is unique, so existing rows are left alone.

INSERT OR IGNORE INTO users
  (id, email, full_name, password_hash, role_id, party_id, phone, job_title, status,
   must_change_password, created_at, updated_at)
VALUES
  ('bf9ba23d-f58a-4b1f-a2a6-60c6fc32a22a', 'sales@stockgap.demo', 'Oluwaseun Adeleke',
   'scrypt:d1bf770d50f683c9d58a77f9a60a6c1a:c755aade42f56491f6c602cb22c89d0e16468e3ad06d68b0345ddc67e74fefdd69ea5c69d45e7b7014d4522d83c006a8059cd3e4a86d228f942190f1ea0d02ff',
   'sales_marketing', NULL, '+234 803 000 0100', 'Sales & Marketing Manager', 'active', 0,
   '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),

  ('1432eff9-be95-42e7-ab9c-665476f36b7a', 'legal@stockgap.demo', 'Chiamaka Eze',
   'scrypt:6ef9a788071a3458178b210912eb0764:3d3585d4179b9e05bf74a11ff7b4d5d068d1fc41e8faab2ae2906c50878f2278cf3d339cf21afdbf7e90fafc4af4183e610b888d041430862d9f464ee275ab77',
   'legal', NULL, '+234 803 000 0100', 'Legal Counsel', 'active', 0,
   '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),

  ('805c5660-3e15-4cb1-80b5-5e3150d45471', 'hmo@stockgap.demo', 'Bashir Lawal',
   'scrypt:60cc0d1da2816f3391924e7bb01dd829:a8d50653c3706782cbdf90178422a0fde16d144f041f659306380fb624d983c1cbd862ea00e39a8fb89af4a5114a5a72b04298c46ad5c046bfe95e2d5a30d0d9',
   'hmo_manager', NULL, '+234 803 000 0100', 'HMO Administrator', 'active', 0,
   '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
