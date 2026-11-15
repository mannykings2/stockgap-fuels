/**
 * Reference data for form selects: facilities, business partners, products and
 * transporters. Kept separate from the module routers so a page can load every
 * dropdown it needs in one request.
 */
import { Router } from "express";
import { queryAll, type Db } from "../../db/database.js";
import { asyncHandler, pathParam } from "../../platform/http.js";
import { requireAuth } from "../../middleware/authenticate.js";

export function referenceRoutes(db: Db): Router {
  const router = Router();

  router.get(
    "/reference/options",
    requireAuth,
    asyncHandler(async (req, res) => {
      const auth = req.auth!;
      const locations = queryAll<{
        id: string;
        code: string;
        name: string;
        type: string;
        city: string;
        state: string;
      }>(
        db,
        "SELECT id, code, name, type, city, state FROM locations WHERE is_active = 1 ORDER BY name",
      );

      const products = queryAll<{
        id: string;
        sku: string;
        name: string;
        category: string;
        unit: string;
        pack_size: string | null;
        unit_price_kobo: number;
      }>(
        db,
        "SELECT id, sku, name, category, unit, pack_size, unit_price_kobo FROM products WHERE status = 'active' ORDER BY category, name",
      );

      const parties = queryAll<{ id: string; code: string; name: string; type: string }>(
        db,
        "SELECT id, code, name, type FROM parties WHERE status = 'active' ORDER BY type, name",
      );

      const canSeeAllPartners =
        auth.permissions.has("customers:read") || auth.permissions.has("suppliers:read");

      res.json({
        data: {
          locations,
          products,
          suppliers: canSeeAllPartners ? parties.filter((party) => party.type === "supplier") : [],
          customers: canSeeAllPartners
            ? parties.filter((party) => ["distributor", "retailer", "customer"].includes(party.type))
            : parties.filter((party) => party.id === auth.user.partyId),
          transporters: canSeeAllPartners ? parties.filter((party) => party.type === "transporter") : [],
          party: parties.find((party) => party.id === auth.user.partyId) ?? null,
        },
      });
    }),
  );

  return router;
}
