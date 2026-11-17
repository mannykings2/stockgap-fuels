-- Rename the external haulage role's display label.
-- The role id and name stay "transporter" because party type, shipment
-- assignment and party-scope checks reference that identifier.
UPDATE roles SET label = 'Haulage' WHERE id = 'transporter';
