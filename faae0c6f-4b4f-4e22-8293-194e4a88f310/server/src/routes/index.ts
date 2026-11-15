/** API route assembly. Everything under /api except auth and public routes. */
import { Router } from "express";
import type { Db } from "../db/database.js";
import { authRoutes } from "../modules/auth/routes.js";
import { auditRoutes } from "../modules/audit/routes.js";
import { catalogueRoutes } from "../modules/catalogue/routes.js";
import { financeRoutes } from "../modules/finance/routes.js";
import { hseRoutes } from "../modules/hse/routes.js";
import { inventoryRoutes } from "../modules/inventory/routes.js";
import { logisticsRoutes } from "../modules/logistics/routes.js";
import { manufacturingRoutes } from "../modules/manufacturing/routes.js";
import { enquiryAdminRoutes } from "../modules/marketing/routes.js";
import { notificationRoutes } from "../modules/notifications/routes.js";
import { orderRoutes } from "../modules/orders/routes.js";
import { partyRoutes } from "../modules/parties/routes.js";
import { procurementRoutes } from "../modules/procurement/routes.js";
import { qualityRoutes } from "../modules/quality/routes.js";
import { referenceRoutes } from "../modules/reference/routes.js";
import { reportRoutes } from "../modules/reports/routes.js";
import { userRoutes } from "../modules/users/routes.js";

export function apiRoutes(db: Db): Router {
  const router = Router();
  router.use("/auth", authRoutes(db));
  router.use(referenceRoutes(db));
  router.use(catalogueRoutes(db));
  router.use(partyRoutes(db));
  router.use(inventoryRoutes(db));
  router.use(procurementRoutes(db));
  router.use(manufacturingRoutes(db));
  router.use(qualityRoutes(db));
  router.use(orderRoutes(db));
  router.use(logisticsRoutes(db));
  router.use(financeRoutes(db));
  router.use(hseRoutes(db));
  router.use(notificationRoutes(db));
  router.use(reportRoutes(db));
  router.use(userRoutes(db));
  router.use(enquiryAdminRoutes(db));
  router.use(auditRoutes(db));
  return router;
}
