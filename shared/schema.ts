import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const bitgetCredentials = pgTable("bitget_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  apiKey: text("api_key").notNull(),
  apiSecret: text("api_secret").notNull(),
  apiPassphrase: text("api_passphrase").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const futuresData = pgTable("futures_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  price: decimal("price", { precision: 20, scale: 8 }).notNull(),
  change24h: decimal("change24h", { precision: 10, scale: 4 }),
  volume24h: decimal("volume24h", { precision: 20, scale: 8 }),
  fundingRate: decimal("funding_rate", { precision: 10, scale: 6 }),
  openInterest: decimal("open_interest", { precision: 20, scale: 8 }),
  contractType: text("contract_type").default("Perpetual"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const userPositions = pgTable("user_positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(), // "long" or "short"
  size: decimal("size", { precision: 20, scale: 8 }).notNull(),
  entryPrice: decimal("entry_price", { precision: 20, scale: 8 }),
  markPrice: decimal("mark_price", { precision: 20, scale: 8 }),
  pnl: decimal("pnl", { precision: 20, scale: 8 }),
  margin: decimal("margin", { precision: 20, scale: 8 }),
  leverage: decimal("leverage", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const accountInfo = pgTable("account_info", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  availableBalance: decimal("available_balance", { precision: 20, scale: 8 }),
  marginUsed: decimal("margin_used", { precision: 20, scale: 8 }),
  unrealizedPnl: decimal("unrealized_pnl", { precision: 20, scale: 8 }),
  totalEquity: decimal("total_equity", { precision: 20, scale: 8 }),
  marginRatio: decimal("margin_ratio", { precision: 5, scale: 2 }),
  maintenanceMargin: decimal("maintenance_margin", { precision: 20, scale: 8 }),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const screeners = pgTable("screeners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  criteria: jsonb("criteria").notNull(), // Contains filter criteria like minPrice, maxPrice, minVolume, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertBitgetCredentialsSchema = createInsertSchema(bitgetCredentials).pick({
  userId: true,
  apiKey: true,
  apiSecret: true,
  apiPassphrase: true,
});

export const insertFuturesDataSchema = createInsertSchema(futuresData).omit({
  id: true,
  lastUpdated: true,
});

export const insertUserPositionSchema = createInsertSchema(userPositions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAccountInfoSchema = createInsertSchema(accountInfo).omit({
  id: true,
  lastUpdated: true,
});

export const insertScreenerSchema = createInsertSchema(screeners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertBitgetCredentials = z.infer<typeof insertBitgetCredentialsSchema>;
export type BitgetCredentials = typeof bitgetCredentials.$inferSelect;

export type InsertFuturesData = z.infer<typeof insertFuturesDataSchema>;
export type FuturesData = typeof futuresData.$inferSelect;

export type InsertUserPosition = z.infer<typeof insertUserPositionSchema>;
export type UserPosition = typeof userPositions.$inferSelect;

export type InsertAccountInfo = z.infer<typeof insertAccountInfoSchema>;
export type AccountInfo = typeof accountInfo.$inferSelect;

export type InsertScreener = z.infer<typeof insertScreenerSchema>;
export type Screener = typeof screeners.$inferSelect;
