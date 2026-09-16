import { pgTable, text, integer, boolean } from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

export const expensesTable = pgTable("expenses", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  payer: text("payer").notNull(),
  amount: integer("amount").notNull(),
  time: text("time"),
  settled: boolean("settled").default(false).notNull(),
});

export type ExpenseRecord = InferSelectModel<typeof expensesTable>;
export type InsertExpense = InferInsertModel<typeof expensesTable>;
