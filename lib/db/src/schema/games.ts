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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type GameRecord = InferSelectModel<typeof gamesTable>;
export type InsertGame = InferInsertModel<typeof gamesTable>;
