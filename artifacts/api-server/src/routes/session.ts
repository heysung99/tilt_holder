import { Router, type IRouter } from "express";
import { db, currentSessionTable, pool } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { hasValidAdminPassword, requireAdmin } from "../lib/admin.js";
import { ensureColumns } from "../lib/columns.js";
import { MAX_HANDS_PER_GAME, handRecordedPayload, parseHand } from "../lib/hand-history.js";
import { buyInChangePayload, gameCreatedPayload } from "../lib/notifications.js";
import { notifyAll, pushPublicKey, senderEndpoint, type PushPayload } from "../lib/push.js";

const router: IRouter = Router();
export const SESSION_ID = 1;

router.get("/session", async (_req, res) => {
  try {
    if (!db) {
      res.json(null);
      return;
    }
    await ensureColumns();
    const [session] = await db
      .select()
      .from(currentSessionTable)
      .where(eq(currentSessionTable.id, SESSION_ID));
    res.json(session ?? null);
  } catch (error) {
    console.error("Failed to fetch current session:", error);
    res.status(500).json({ error: "Failed to fetch current session" });
  }
});

router.put("/session", async (req, res) => {
  try {
    const { date, gameName, participantNames, buyIns, finalAmounts, buyInArrows, buyInLog, hostName, bankName, isFinished, fundApplied } = req.body;
    if (!date || !gameName || !participantNames || !buyIns || !finalAmounts) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (!db) {
      res.status(503).json({ error: "Database not available" });
      return;
    }

    const values = {
      id: SESSION_ID,
      date,
      gameName,
      participantNames,
      buyIns,
      finalAmounts,
      buyInArrows: buyInArrows ?? {},
      buyInLog: buyInLog ?? [],
      hostName: hostName ?? null,
      bankName: bankName ?? null,
      isFinished: isFinished ?? false,
      fundApplied: fundApplied ?? false,
      updatedAt: new Date(),
    };

    await ensureColumns();
    const [previous] = pushPublicKey
      ? await db.select().from(currentSessionTable).where(eq(currentSessionTable.id, SESSION_ID))
      : [];

    const [saved] = await db
      .insert(currentSessionTable)
      .values(values)
      .onConflictDoUpdate({
        target: currentSessionTable.id,
        // Hand histories are appended through /session/history, never through this
        // whole-session save, so a phone with a stale copy can't drop anyone's
        // hands. They're only cleared when a new game starts.
        set: {
          ...values,
          handHistories: req.body.notify === "created"
            ? sql`'[]'::jsonb`
            : sql.raw(`CASE WHEN "current_session"."date" = excluded."date" THEN "current_session"."hand_histories" ELSE '[]'::jsonb END`),
          // Final amounts are saved through /session/final-amounts for the same reason:
          // a buy-in change from a phone that never saw them mustn't wipe them.
          finalAmounts: req.body.notify === "created"
            ? values.finalAmounts
            : sql.raw(`CASE WHEN "current_session"."date" = excluded."date" THEN "current_session"."final_amounts" ELSE excluded."final_amounts" END`),
        },
      })
      .returning();

    res.status(200).json(saved);

    // Creating a game is admin-only in the app, so only an admin-authenticated save
    // announces one (this route is otherwise open and could be used to spam).
    let payload: PushPayload | null = null;
    if (req.body.notify === "created" && hasValidAdminPassword(req)) {
      payload = gameCreatedPayload(date, participantNames);
    } else if (previous && previous.date === date) {
      payload = buyInChangePayload(previous.buyIns, buyIns);
    }
    if (payload) notifyAll([payload], senderEndpoint(req));
  } catch (error) {
    console.error("Failed to save current session:", error);
    res.status(500).json({ error: "Failed to save current session" });
  }
});

// Saves the settle tab's final amounts for the game in progress so every phone sees
// them. Open to everyone, like buy-ins.
router.put("/session/final-amounts", async (req, res) => {
  try {
    const { date, finalAmounts } = req.body ?? {};
    const valid = typeof date === "string"
      && finalAmounts && typeof finalAmounts === "object" && !Array.isArray(finalAmounts)
      && Object.keys(finalAmounts).length <= 30
      && Object.entries(finalAmounts).every(([name, value]) => name.length <= 30 && typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100_000_000);
    if (!valid) {
      res.status(400).json({ error: "Invalid final amounts" });
      return;
    }
    if (!db) {
      res.status(503).json({ error: "Database not available" });
      return;
    }
    await ensureColumns();
    const [saved] = await db.update(currentSessionTable)
      .set({ finalAmounts, updatedAt: new Date() })
      .where(and(eq(currentSessionTable.id, SESSION_ID), eq(currentSessionTable.date, date)))
      .returning({ finalAmounts: currentSessionTable.finalAmounts });
    if (!saved) {
      res.status(409).json({ error: "No matching game in progress" });
      return;
    }
    res.json(saved);
  } catch (error) {
    console.error("Failed to save final amounts:", error);
    res.status(500).json({ error: "Failed to save final amounts" });
  }
});

// Appends one recorded hand to the game in progress. Open to everyone, like buy-ins.
router.post("/session/history", async (req, res) => {
  try {
    const hand = parseHand(req.body?.hand);
    const date = req.body?.date;
    if (!hand || typeof date !== "string") {
      res.status(400).json({ error: "Invalid hand" });
      return;
    }
    if (!pool) {
      res.status(503).json({ error: "Database not available" });
      return;
    }
    await ensureColumns();

    const result = await pool.query(
      `UPDATE current_session
         SET hand_histories = hand_histories || $1::jsonb
       WHERE id = $2 AND date = $3
         AND jsonb_array_length(hand_histories) < $4
         AND NOT hand_histories @> $5::jsonb
       RETURNING jsonb_array_length(hand_histories) AS count`,
      [JSON.stringify([hand]), SESSION_ID, date, MAX_HANDS_PER_GAME, JSON.stringify([{ id: hand.id }])],
    );

    if (result.rowCount === 0) {
      const existing = await pool.query(
        `SELECT 1 FROM current_session WHERE id = $1 AND date = $2 AND hand_histories @> $3::jsonb`,
        [SESSION_ID, date, JSON.stringify([{ id: hand.id }])],
      );
      // A retry of a hand that's already saved is fine; anything else means the
      // game ended, a different game started or the hand limit was reached.
      if (existing.rowCount) res.json({ success: true });
      else res.status(409).json({ error: "No matching game in progress" });
      return;
    }

    res.status(201).json({ success: true });
    if (pushPublicKey) notifyAll([handRecordedPayload(hand, Number(result.rows[0].count))], senderEndpoint(req));
  } catch (error) {
    console.error("Failed to record hand:", error);
    res.status(500).json({ error: "Failed to record hand" });
  }
});

router.delete("/session/history/:id", requireAdmin, async (req, res) => {
  try {
    if (!pool) {
      res.status(503).json({ error: "Database not available" });
      return;
    }
    await ensureColumns();
    await pool.query(
      `UPDATE current_session
         SET hand_histories = COALESCE(
           (SELECT jsonb_agg(hand) FROM jsonb_array_elements(hand_histories) AS hand WHERE hand->>'id' <> $1),
           '[]'::jsonb)
       WHERE id = $2`,
      [String(req.params.id), SESSION_ID],
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete hand:", error);
    res.status(500).json({ error: "Failed to delete hand" });
  }
});

router.delete("/session", requireAdmin, async (_req, res) => {
  try {
    if (!db) {
      res.status(503).json({ error: "Database not available" });
      return;
    }
    await db.delete(currentSessionTable).where(eq(currentSessionTable.id, SESSION_ID));
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to clear current session:", error);
    res.status(500).json({ error: "Failed to clear current session" });
  }
});

export default router;
