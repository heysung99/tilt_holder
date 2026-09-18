import { Router, type IRouter } from "express";
import { db, currentSessionTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();
const SESSION_ID = 1;

router.get("/session", async (_req, res) => {
  try {
    if (!db) {
      res.json(null);
      return;
    }
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
    const { date, gameName, participantNames, buyIns, finalAmounts, hostName, bankName, isFinished, fundApplied } = req.body;
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
      hostName: hostName ?? null,
      bankName: bankName ?? null,
      isFinished: isFinished ?? false,
      fundApplied: fundApplied ?? false,
      updatedAt: new Date(),
    };

    const [saved] = await db
      .insert(currentSessionTable)
      .values(values)
      .onConflictDoUpdate({
        target: currentSessionTable.id,
        set: values,
      })
      .returning();

    res.status(200).json(saved);
  } catch (error) {
    console.error("Failed to save current session:", error);
    res.status(500).json({ error: "Failed to save current session" });
  }
});

router.delete("/session", async (_req, res) => {
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
