import { Router, type IRouter } from "express";
import { currentSessionTable, db, gamesTable, pool } from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import { requireAdmin } from "../lib/admin.js";
import { ensureColumns } from "../lib/columns.js";
import { MAX_HANDS_PER_GAME, mergeHands, parseHand } from "../lib/hand-history.js";
import { SESSION_ID } from "./session.js";
import { computeOverallRanking, settlementPayloads } from "../lib/notifications.js";
import { notifyAll, pushPublicKey, senderEndpoint } from "../lib/push.js";

const router: IRouter = Router();

router.get("/games", async (_req, res) => {
  try {
    if (!db) {
      res.json([]);
      return;
    }
    await ensureColumns();
    const games = await db.select().from(gamesTable).orderBy(asc(gamesTable.date));
    res.json(games);
  } catch (error) {
    console.error("Failed to fetch games:", error);
    res.status(500).json({ error: "Failed to fetch games" });
  }
});

router.post("/games", requireAdmin, async (req, res) => {
  try {
    const { date, gameName, hostName, bankName, participantNames, results, buyIns, buyInLog, handHistories } = req.body;
    if (!date || !gameName || !participantNames || !results) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (!db) {
      res.status(503).json({ error: "Database not available" });
      return;
    }

    await ensureColumns();
    const previousGames = pushPublicKey
      ? await db.select({ date: gamesTable.date, results: gamesTable.results }).from(gamesTable)
      : null;

    // The server's copy of the hands is the complete one (they're appended one by one);
    // the app's copy covers a session that was already cleared.
    const [session] = await db.select({ date: currentSessionTable.date, handHistories: currentSessionTable.handHistories })
      .from(currentSessionTable).where(eq(currentSessionTable.id, SESSION_ID));
    const hands = mergeHands(session?.date === date ? session.handHistories : [], handHistories);

    // Replace the game for this date atomically so a failed insert can't leave the date wiped.
    const inserted = await db.transaction(async (tx) => {
      await tx.delete(gamesTable).where(eq(gamesTable.date, date));
      const [row] = await tx.insert(gamesTable).values({
        date,
        gameName,
        hostName,
        bankName,
        participantNames,
        results,
        buyIns: buyIns && typeof buyIns === "object" ? buyIns : null,
        buyInLog: Array.isArray(buyInLog) ? buyInLog : null,
        handHistories: hands.length > 0 ? hands : null,
      }).returning();
      return row;
    });

    res.status(201).json(inserted);

    if (previousGames) {
      const rankingBefore = computeOverallRanking(previousGames);
      const rankingAfter = computeOverallRanking([...previousGames.filter((game) => game.date !== date), { results }]);
      // Games are numbered in date order; this one follows every earlier date.
      const gameNumber = new Set(previousGames.map((game) => game.date).filter((gameDate) => gameDate < date)).size + 1;
      notifyAll(settlementPayloads(date, results, rankingBefore, rankingAfter, gameNumber), senderEndpoint(req));
    }
  } catch (error) {
    console.error("Failed to save game:", error);
    res.status(500).json({ error: "Failed to save game result" });
  }
});

// Adds a hand to a game that's already been settled (e.g. filled in afterwards).
// Open to everyone like the live game's history; no push for past games.
router.post("/games/:date/history", async (req, res) => {
  try {
    const date = String(req.params.date);
    const hand = parseHand(req.body?.hand);
    if (!hand) {
      res.status(400).json({ error: "Invalid hand" });
      return;
    }
    if (!pool) {
      res.status(503).json({ error: "Database not available" });
      return;
    }
    await ensureColumns();
    const result = await pool.query(
      `UPDATE games
         SET hand_histories = COALESCE(hand_histories, '[]'::jsonb) || $1::jsonb
       WHERE date = $2
         AND jsonb_array_length(COALESCE(hand_histories, '[]'::jsonb)) < $3
         AND NOT COALESCE(hand_histories, '[]'::jsonb) @> $4::jsonb`,
      [JSON.stringify([hand]), date, MAX_HANDS_PER_GAME, JSON.stringify([{ id: hand.id }])],
    );
    if (result.rowCount === 0) {
      const existing = await pool.query(
        `SELECT 1 FROM games WHERE date = $1 AND COALESCE(hand_histories, '[]'::jsonb) @> $2::jsonb`,
        [date, JSON.stringify([{ id: hand.id }])],
      );
      if (existing.rowCount) res.json({ success: true });
      else res.status(404).json({ error: "No game on that date" });
      return;
    }
    res.status(201).json({ success: true });
  } catch (error) {
    console.error("Failed to record past hand:", error);
    res.status(500).json({ error: "Failed to record hand" });
  }
});

router.delete("/games/:date/history/:id", requireAdmin, async (req, res) => {
  try {
    if (!pool) {
      res.status(503).json({ error: "Database not available" });
      return;
    }
    await ensureColumns();
    await pool.query(
      `UPDATE games
         SET hand_histories = (
           SELECT jsonb_agg(hand) FROM jsonb_array_elements(COALESCE(hand_histories, '[]'::jsonb)) AS hand
           WHERE hand->>'id' <> $1)
       WHERE date = $2`,
      [String(req.params.id), String(req.params.date)],
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete past hand:", error);
    res.status(500).json({ error: "Failed to delete hand" });
  }
});

router.delete("/games/:date", requireAdmin, async (req, res) => {
  try {
    const date = String(req.params.date);
    if (!db) {
      res.status(503).json({ error: "Database not available" });
      return;
    }

    await db.delete(gamesTable).where(eq(gamesTable.date, date));
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete game:", error);
    res.status(500).json({ error: "Failed to delete game" });
  }
});

export default router;
