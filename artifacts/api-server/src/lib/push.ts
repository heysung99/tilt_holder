import type { Request } from "express";
import webpush from "web-push";
import { waitUntil } from "@vercel/functions";
import { createPushSubscriptionsTableSql, db, pool, pushSubscriptionsTable } from "@workspace/db";
import { eq, ne } from "drizzle-orm";

export type PushPayload = { title: string; body: string; tag: string };

const publicKey = process.env["VAPID_PUBLIC_KEY"];
const privateKey = process.env["VAPID_PRIVATE_KEY"];
const subject = process.env["VAPID_SUBJECT"] ?? "https://tiltholder.vercel.app";

export const pushPublicKey = publicKey && privateKey ? publicKey : null;

if (pushPublicKey && privateKey) {
  webpush.setVapidDetails(subject, pushPublicKey, privateKey);
}

let tableReady: Promise<unknown> | null = null;

export function ensurePushTable() {
  if (!pool) return Promise.resolve();
  tableReady ??= pool.query(createPushSubscriptionsTableSql).catch((error) => {
    tableReady = null;
    throw error;
  });
  return tableReady;
}

// The device that triggered an event already knows about it, so it sends its own
// subscription endpoint along and is skipped.
export function senderEndpoint(req: Request) {
  const header = req.headers["x-push-endpoint"];
  return typeof header === "string" && header ? header : null;
}

async function sendToAll(payload: PushPayload, excludeEndpoint: string | null) {
  if (!db || !pushPublicKey) return;
  await ensurePushTable();
  const subscriptions = excludeEndpoint
    ? await db.select().from(pushSubscriptionsTable).where(ne(pushSubscriptionsTable.endpoint, excludeEndpoint))
    : await db.select().from(pushSubscriptionsTable);

  const message = JSON.stringify(payload);
  await Promise.allSettled(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        message,
        { TTL: 60 * 60 * 12 },
      );
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      // The browser unsubscribed or the app was removed; stop sending to it.
      if (statusCode === 404 || statusCode === 410) {
        await db!.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, subscription.endpoint));
      } else {
        console.error("Failed to send push notification:", error);
      }
    }
  }));
}

// Fire-and-forget from the request's point of view; on Vercel, waitUntil keeps the
// function alive until delivery finishes instead of cutting it off after the response.
export function notifyAll(payloads: PushPayload[], excludeEndpoint: string | null) {
  if (!pushPublicKey || payloads.length === 0) return;
  const delivery = (async () => {
    for (const payload of payloads) await sendToAll(payload, excludeEndpoint);
  })().catch((error) => console.error("Push delivery failed:", error));
  waitUntil(delivery);
}
