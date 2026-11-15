/** Notification inbox endpoints. */
import { Router } from "express";
import type { Db } from "../../db/database.js";
import { asyncHandler, pathParam } from "../../platform/http.js";
import { requireAuth } from "../../middleware/authenticate.js";
import * as service from "./service.js";

export function notificationRoutes(db: Db): Router {
  const router = Router();

  router.get(
    "/notifications",
    requireAuth,
    asyncHandler(async (req, res) => {
      res.json({
        data: {
          notifications: service.list(db, req.auth!),
          unread: service.unreadCount(db, req.auth!),
        },
      });
    }),
  );

  router.post(
    "/notifications/:id/read",
    requireAuth,
    asyncHandler(async (req, res) => {
      service.markRead(db, req.auth!, pathParam(req));
      res.json({ data: { unread: service.unreadCount(db, req.auth!) } });
    }),
  );

  router.post(
    "/notifications/read-all",
    requireAuth,
    asyncHandler(async (req, res) => {
      const marked = service.markAllRead(db, req.auth!);
      res.json({ data: { marked, unread: service.unreadCount(db, req.auth!) } });
    }),
  );

  return router;
}
