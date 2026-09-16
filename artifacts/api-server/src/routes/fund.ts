import { Router, type IRouter } from "express";
import { db, fundEntriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/fund", async (_req, res) => {
  try {
    if (!db) {
      res.json([]);
      return;
    }
    const entries = await db.select().from(fundEntriesTable);
    res.json(entries);
  } catch (error) {
    console.error("Failed to fetch fund entries:", error);
    res.status(500).json({ error: "Failed to fetch fund entries" });
  }
});

router.post("/fund", async (req, res) => {
  try {
    const { id, title, meta, amount } = req.body;
    if (!id || !title || amount == null) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (!db) {
      res.status(503).json({ error: "Database not available" });
      return;
    }

    const [inserted] = await db.insert(fundEntriesTable).values({
      id,
      title,
      meta: meta || '',
      amount,
    }).onConflictDoUpdate({
      target: fundEntriesTable.id,
      set: { title, meta, amount },
    }).returning();

    res.status(201).json(inserted);
  } catch (error) {
    console.error("Failed to save fund entry:", error);
    res.status(500).json({ error: "Failed to save fund entry" });
  }
});

router.delete("/fund/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!db) {
      res.status(503).json({ error: "Database not available" });
      return;
    }

    await db.delete(fundEntriesTable).where(eq(fundEntriesTable.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete fund entry:", error);
    res.status(500).json({ error: "Failed to delete fund entry" });
  }
});

export default router;
