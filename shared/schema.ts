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

export const bots = pgTable("bots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  strategy: text("strategy").notNull(), // 'ai' or 'manual'
  tradingPair: text("trading_pair").notNull(),
  status: text("status").notNull().default('inactive'), // 'active', 'inactive', 'paused'
  capital: decimal("capital", { precision: 20, scale: 8 }).notNull(),
  riskLevel: text("risk_level").notNull().default('medium'), // 'low', 'medium', 'high'
  profit: decimal("profit", { precision: 20, scale: 8 }).default('0'),
  trades: varchar("trades").default('0'),
  winRate: decimal("win_rate", { precision: 5, scale: 2 }).default('0'),
  roi: decimal("roi", { precision: 10, scale: 4 }).default('0'),
  runtime: varchar("runtime").default('0'),
  config: jsonb("config").$type<{
    // AI Bot config
    aiStrategy?: string;
    autoConfig?: boolean;
    
    // Manual Bot config 
    indicators?: {
      rsi?: { period: number; oversold: number; overbought: number; };
      macd?: { fastPeriod: number; slowPeriod: number; signalPeriod: number; };
      ma?: { type: string; period: number; };
      bollinger?: { period: number; stdDev: number; };
      stochastic?: { kPeriod: number; dPeriod: number; smoothK: number; };
    };
    entryConditions?: string[];
    exitConditions?: string[];
    stopLoss?: number;
    takeProfit?: number;
    maxPositionSize?: number;
    leverage?: number;
  }>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const screeners = pgTable("screeners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  criteria: jsonb("criteria").$type<{
    // Basic filters
    minPrice?: number;
    maxPrice?: number;
    minVolume?: number;
    maxVolume?: number;
    minVolumeUsd?: number;
    maxVolumeUsd?: number;
    minChange?: number;
    maxChange?: number;
    minMarketCap?: number;
    maxMarketCap?: number;
    symbols?: string[];
    
    // Technical indicators
    rsi?: {
      period: number;
      operator: 'above' | 'below' | 'between';
      value: number;
      valueMax?: number;
    };
    macd?: {
      fastPeriod: number;
      slowPeriod: number;
      signalPeriod: number;
      operator: 'bullish_crossover' | 'bearish_crossover' | 'above_signal' | 'below_signal' | 'above_zero' | 'below_zero';
    };
    movingAverage1?: {
      type: 'SMA' | 'EMA' | 'WMA' | 'DEMA' | 'TEMA' | 'HMA' | 'VWMA';
      period: number;
      operator: 'above' | 'below' | 'crossing_up' | 'crossing_down';
      comparison: 'price' | 'another_ma';
      comparisonMa?: {
        type: 'SMA' | 'EMA' | 'WMA' | 'DEMA' | 'TEMA' | 'HMA' | 'VWMA';
        period: number;
      };
    };
    movingAverage2?: {
      type: 'SMA' | 'EMA' | 'WMA' | 'DEMA' | 'TEMA' | 'HMA' | 'VWMA';
      period: number;
      operator: 'above' | 'below' | 'crossing_up' | 'crossing_down';
      comparison: 'price' | 'another_ma';
      comparisonMa?: {
        type: 'SMA' | 'EMA' | 'WMA' | 'DEMA' | 'TEMA' | 'HMA' | 'VWMA';
        period: number;
      };
    };
    bollinger?: {
      period: number;
      stdDev: number;
      operator: 'above_upper' | 'below_lower' | 'between_bands' | 'touching_upper' | 'touching_lower' | 'squeeze';
    };
    stochastic?: {
      kPeriod: number;
      dPeriod: number;
      smoothK: number;
      operator: 'above' | 'below' | 'between' | 'bullish_crossover' | 'bearish_crossover' | 'oversold' | 'overbought';
      value: number;
      valueMax?: number;
    };
    williams?: {
      period: number;
      operator: 'above' | 'below' | 'between' | 'oversold' | 'overbought';
      value: number;
      valueMax?: number;
    };
    atr?: {
      period: number;
      operator: 'above' | 'below' | 'between';
      value: number;
      valueMax?: number;
    };
    cci?: {
      period: number;
      operator: 'above' | 'below' | 'between' | 'oversold' | 'overbought';
      value: number;
      valueMax?: number;
    };
    momentum?: {
      period: number;
      operator: 'above' | 'below' | 'positive' | 'negative';
      value?: number;
    };
  }>().notNull(),
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

export const insertBotSchema = createInsertSchema(bots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export type InsertBot = z.infer<typeof insertBotSchema>;
export type Bot = typeof bots.$inferSelect;

export type InsertScreener = z.infer<typeof insertScreenerSchema>;
export type Screener = typeof screeners.$inferSelect;
