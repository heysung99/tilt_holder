import { pgTable, text, serial, jsonb, timestamp } from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

export const gamesTable = pgTable("games", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  gameName: text("game_name").notNull(),
  hostName: text("host_name"),
  bankName: text("bank_name"),
  participantNames: jsonb("participant_names").notNull(),
  results: jsonb("results").notNull(),
  // Buy-in count per player and the buy-in change log at settlement time.
  // Null for games saved before these were recorded.
  buyIns: jsonb("buy_ins"),
  buyInLog: jsonb("buy_in_log"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Added on first use by the API server, so existing databases pick up the
// columns without a separate migration step. The ALTER only runs when a column
// is missing, so routine cold starts don't take a lock on the table.
export const addGamesBuyInColumnsSql = `
  DO $$
  BEGIN
    IF (SELECT count(*) FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'games'
          AND column_name IN ('buy_ins', 'buy_in_log')) < 2 THEN
      ALTER TABLE games
        ADD COLUMN IF NOT EXISTS buy_ins jsonb,
        ADD COLUMN IF NOT EXISTS buy_in_log jsonb;
    END IF;
  END $$
`;

export type GameRecord = InferSelectModel<typeof gamesTable>;
export type InsertGame = InferInsertModel<typeof gamesTable>;
