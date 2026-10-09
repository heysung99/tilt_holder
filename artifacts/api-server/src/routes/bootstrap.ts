import { Router, type IRouter } from "express";
import {
  currentSessionTable,
  db,
  expensesTable,
  fundEntriesTable,
  gamesTable,
  usersTable,
} from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import { SESSION_ID } from "./session.js";

const router: IRouter = Router();

// Everything the app needs on load in one request, instead of five separate
// function invocations per page load / refresh.
router.get("/bootstrap", async (_req, res) => {
  try {
    if (!db) {
      res.json({ users: [], expenses: [], fund: [], games: [], session: null });
      return;
    }

    const [users, expenses, fund, games, sessions] = await Promise.all([
      db.select().from(usersTable),
      db.select().from(expensesTable),
      db.select().from(fundEntriesTable),
      db.select().from(gamesTable).orderBy(asc(gamesTable.date)),
      db.select().from(currentSessionTable).where(eq(currentSessionTable.id, SESSION_ID)),
    ]);

    res.json({ users, expenses, fund, games, session: sessions[0] ?? null });
  } catch (error) {
    console.error("Failed to load bootstrap data:", error);
    res.status(500).json({ error: "Failed to load data" });
  }
});

export default router;
