import { Router, type IRouter } from "express";
import { db, gamesTable } from "@workspace/db";
import { asc, eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/games", async (_req, res) => {
  try {
    if (!db) {
      res.json([]);
      return;
    }
    const games = await db.select().from(gamesTable).orderBy(asc(gamesTable.date));
    res.json(games);
  } catch (error) {
    console.error("Failed to fetch games:", error);
    res.status(500).json({ error: "Failed to fetch games" });
  }
});

router.post("/games", async (req, res) => {
  try {
    const { date, gameName, hostName, bankName, participantNames, results } = req.body;
    if (!date || !gameName || !participantNames || !results) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (!db) {
      res.status(503).json({ error: "Database not available" });
      return;
    }

    // Upsert or insert game for date
    await db.delete(gamesTable).where(eq(gamesTable.date, date));

    const [inserted] = await db.insert(gamesTable).values({
      date,
      gameName,
      hostName,
      bankName,
      participantNames,
      results,
    }).returning();

    res.status(201).json(inserted);
  } catch (error) {
    console.error("Failed to save game:", error);
    res.status(500).json({ error: "Failed to save game result" });
  }
});

router.delete("/games/:date", async (req, res) => {
  try {
    const date = req.params.date;
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
