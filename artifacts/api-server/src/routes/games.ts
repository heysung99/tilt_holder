import { Router, type IRouter } from "express";
import { db, gamesTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/games", async (_req, res) => {
  try {
    if (!db) {
      res.json([]);
      return;
    }
    const games = await db.select().from(gamesTable).orderBy(desc(gamesTable.id));
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

export default router;
