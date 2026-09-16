import { pgTable, text, integer } from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

export const usersTable = pgTable("users", {
  name: text("name").primaryKey(),
  score: integer("score").default(0).notNull(),
  color: text("color").notNull(),
  text: text("text").notNull(),
});

export type UserRecord = InferSelectModel<typeof usersTable>;
export type InsertUser = InferInsertModel<typeof usersTable>;
