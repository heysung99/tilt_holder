import { Router, type IRouter } from "express";
import { db, expensesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/expenses", async (_req, res) => {
  try {
    if (!db) {
      res.json([]);
      return;
    }
    const expenses = await db.select().from(expensesTable);
    res.json(expenses);
  } catch (error) {
    console.error("Failed to fetch expenses:", error);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

router.post("/expenses", async (req, res) => {
  try {
    const { id, title, payer, amount, time, settled } = req.body;
    if (!id || !title || !payer || amount == null) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (!db) {
      res.status(503).json({ error: "Database not available" });
      return;
    }

    const [inserted] = await db.insert(expensesTable).values({
      id,
      title,
      payer,
      amount,
      time: time || '방금 전',
      settled: settled ?? false,
    }).onConflictDoUpdate({
      target: expensesTable.id,
      set: { title, payer, amount, time, settled },
    }).returning();

    res.status(201).json(inserted);
  } catch (error) {
    console.error("Failed to save expense:", error);
    res.status(500).json({ error: "Failed to save expense" });
  }
});

router.patch("/expenses/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { settled } = req.body;
    if (!db) {
      res.status(503).json({ error: "Database not available" });
      return;
    }

    const [updated] = await db.update(expensesTable)
      .set({ settled })
      .where(eq(expensesTable.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Failed to update expense:", error);
    res.status(500).json({ error: "Failed to update expense" });
  }
});

router.delete("/expenses/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!db) {
      res.status(503).json({ error: "Database not available" });
      return;
    }

    await db.delete(expensesTable).where(eq(expensesTable.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete expense:", error);
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

export default router;
