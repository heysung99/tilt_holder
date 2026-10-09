import { Router, type IRouter } from "express";
import { currentSessionTable, db, gamesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../lib/admin.js";

const router: IRouter = Router();

class RenameError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const renameName = (name: unknown, from: string, to: string) => (name === from ? to : name);

function renameKey(record: unknown, from: string, to: string) {
  if (!record || typeof record !== "object" || !(from in record)) return record;
  const { [from]: value, ...rest } = record as Record<string, unknown>;
  return { ...rest, [to]: value };
}

function renameInList(list: unknown, from: string, to: string) {
  return Array.isArray(list) ? list.map((name) => renameName(name, from, to)) : list;
}

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

router.put("/users/:name", requireAdmin, async (req, res) => {
  try {
    const currentName = String(req.params.name);
    const nextName = typeof req.body?.nextName === "string" ? req.body.nextName.trim() : "";
    if (!nextName) {
      res.status(400).json({ error: "Missing nextName" });
      return;
    }

    if (!db) {
      res.status(503).json({ error: "Database not available" });
      return;
    }

    // Game results and the live session are keyed by player name, so they have to be
    // renamed together with the user — otherwise the player's history is orphaned
    // under the old name.
    const updated = await db.transaction(async (tx) => {
      const [conflict] = await tx.select().from(usersTable).where(eq(usersTable.name, nextName));
      if (conflict) throw new RenameError(409, "Name already exists");

      const [user] = await tx.update(usersTable)
        .set({ name: nextName })
        .where(eq(usersTable.name, currentName))
        .returning();
      if (!user) throw new RenameError(404, "User not found");

      const games = await tx.select().from(gamesTable);
      for (const game of games) {
        const participants = game.participantNames as unknown[];
        const inGame = (Array.isArray(participants) && participants.includes(currentName))
          || currentName in (game.results as Record<string, unknown>)
          || game.hostName === currentName
          || game.bankName === currentName;
        if (!inGame) continue;

        await tx.update(gamesTable).set({
          participantNames: renameInList(game.participantNames, currentName, nextName),
          results: renameKey(game.results, currentName, nextName),
          hostName: renameName(game.hostName, currentName, nextName) as string | null,
          bankName: renameName(game.bankName, currentName, nextName) as string | null,
        }).where(eq(gamesTable.id, game.id));
      }

      const sessions = await tx.select().from(currentSessionTable);
      for (const session of sessions) {
        const buyInLog = Array.isArray(session.buyInLog)
          ? session.buyInLog.map((entry: { name?: unknown }) => ({ ...entry, name: renameName(entry.name, currentName, nextName) }))
          : session.buyInLog;

        await tx.update(currentSessionTable).set({
          participantNames: renameInList(session.participantNames, currentName, nextName),
          buyIns: renameKey(session.buyIns, currentName, nextName),
          finalAmounts: renameKey(session.finalAmounts, currentName, nextName),
          buyInArrows: renameKey(session.buyInArrows, currentName, nextName),
          buyInLog,
          hostName: renameName(session.hostName, currentName, nextName) as string | null,
          bankName: renameName(session.bankName, currentName, nextName) as string | null,
        }).where(eq(currentSessionTable.id, session.id));
      }

      return user;
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof RenameError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error("Failed to update user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

export default router;
