import { Router, type IRouter } from "express";
import { currentSessionTable, db, gamesTable } from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import { requireAdmin } from "../lib/admin.js";
import { ensureColumns } from "../lib/columns.js";
import { mergeHands } from "../lib/hand-history.js";
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
      notifyAll(settlementPayloads(date, results, rankingBefore, rankingAfter), senderEndpoint(req));
    }
  } catch (error) {
    console.error("Failed to save game:", error);
    res.status(500).json({ error: "Failed to save game result" });
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
