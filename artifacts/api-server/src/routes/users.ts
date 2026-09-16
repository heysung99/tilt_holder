import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/users", async (_req, res) => {
  try {
    if (!db) {
      res.json([]);
      return;
    }
    const users = await db.select().from(usersTable);
    res.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/users", async (req, res) => {
  try {
    const { name, score, color, text } = req.body;
    if (!name || !color || !text) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (!db) {
      res.status(503).json({ error: "Database not available" });
      return;
    }

    const [inserted] = await db.insert(usersTable).values({
      name,
      score: score ?? 0,
      color,
      text,
    }).onConflictDoNothing().returning();

    res.status(201).json(inserted || { name, score: score ?? 0, color, text });
  } catch (error) {
    console.error("Failed to create user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

router.put("/users/:name", async (req, res) => {
  try {
    const currentName = req.params.name;
    const { nextName } = req.body;
    if (!nextName) {
      res.status(400).json({ error: "Missing nextName" });
      return;
    }

    if (!db) {
      res.status(503).json({ error: "Database not available" });
      return;
    }

    // Update user name (or handle rename)
    const [updated] = await db.update(usersTable)
      .set({ name: nextName })
      .where(eq(usersTable.name, currentName))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Failed to update user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

export default router;
