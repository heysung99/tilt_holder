import { Router, type IRouter } from "express";
import { db, pushSubscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ensurePushTable, pushPublicKey } from "../lib/push.js";

const router: IRouter = Router();

// Browser push services (Chrome/Samsung Internet, Firefox, Edge, Safari). Anything
// else isn't a real subscription, and the server shouldn't POST to arbitrary URLs.
const PUSH_SERVICE_HOSTS = ["fcm.googleapis.com", "push.services.mozilla.com", "notify.windows.com", "push.apple.com"];

function isPushServiceEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:"
      && PUSH_SERVICE_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

router.get("/push/public-key", (_req, res) => {
  if (!pushPublicKey) {
    res.status(503).json({ error: "push_not_configured" });
    return;
  }
  res.json({ publicKey: pushPublicKey });
});

router.post("/push/subscribe", async (req, res) => {
  try {
    const endpoint = req.body?.endpoint;
    const p256dh = req.body?.keys?.p256dh;
    const auth = req.body?.keys?.auth;
    if (typeof endpoint !== "string" || !isPushServiceEndpoint(endpoint) || typeof p256dh !== "string" || typeof auth !== "string") {
      res.status(400).json({ error: "Invalid subscription" });
      return;
    }
    if (!db) {
      res.status(503).json({ error: "Database not available" });
      return;
    }

    await ensurePushTable();
    await db.insert(pushSubscriptionsTable)
      .values({ endpoint, p256dh, auth })
      .onConflictDoUpdate({ target: pushSubscriptionsTable.endpoint, set: { p256dh, auth } });
    res.status(201).json({ success: true });
  } catch (error) {
    console.error("Failed to save push subscription:", error);
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

router.post("/push/unsubscribe", async (req, res) => {
  try {
    const endpoint = req.body?.endpoint;
    if (typeof endpoint !== "string") {
      res.status(400).json({ error: "Missing endpoint" });
      return;
    }
    if (!db) {
      res.status(503).json({ error: "Database not available" });
      return;
    }

    await ensurePushTable();
    await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, endpoint));
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to remove push subscription:", error);
    res.status(500).json({ error: "Failed to remove subscription" });
  }
});

export default router;
