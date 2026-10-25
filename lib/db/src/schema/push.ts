import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const pushSubscriptionsTable = pgTable("push_subscriptions", {
  endpoint: text("endpoint").primaryKey(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Created on first use by the API server, so the table appears in an existing
// database without a separate migration step.
export const createPushSubscriptionsTableSql = `
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    endpoint text PRIMARY KEY,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
  )
`;
