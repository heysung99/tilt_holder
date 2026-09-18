import { pgTable, integer, text, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

export const currentSessionTable = pgTable("current_session", {
  id: integer("id").primaryKey(),
  date: text("date").notNull(),
  gameName: text("game_name").notNull(),
  participantNames: jsonb("participant_names").notNull(),
  buyIns: jsonb("buy_ins").notNull(),
  finalAmounts: jsonb("final_amounts").notNull(),
  hostName: text("host_name"),
  bankName: text("bank_name"),
  isFinished: boolean("is_finished").notNull().default(false),
  fundApplied: boolean("fund_applied").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CurrentSessionRecord = InferSelectModel<typeof currentSessionTable>;
export type InsertCurrentSession = InferInsertModel<typeof currentSessionTable>;
