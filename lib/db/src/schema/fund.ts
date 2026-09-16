import { pgTable, text, integer } from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

export const fundEntriesTable = pgTable("fund_entries", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  meta: text("meta"),
  amount: integer("amount").notNull(),
});

export type FundRecord = InferSelectModel<typeof fundEntriesTable>;
export type InsertFund = InferInsertModel<typeof fundEntriesTable>;
