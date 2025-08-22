import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, jsonb, boolean, integer } from "drizzle-orm/pg-core";
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

// Bot Strategy Templates (reusable strategies)
export const botStrategies = pgTable("bot_strategies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  strategy: text("strategy").notNull(), // 'ai' or 'manual'
  riskLevel: text("risk_level").notNull().default('medium'), // 'low', 'medium', 'high'
  config: jsonb("config").$type<{
    // Manual Strategy config 
    positionDirection: 'long' | 'short';
    timeframe: string;
    entryConditions: Array<{
      indicator: string;
      operator: string;
      value: number;
      secondValue?: number;
    }>;
    exitConditions: Array<{
      indicator: string;
      operator: string;
      value: number;
      secondValue?: number;
    }>;
    indicators: {
      rsi?: { period: number; oversold: number; overbought: number; };
      macd?: { fastPeriod: number; slowPeriod: number; signalPeriod: number; };
      ma?: Array<{ type: string; period: number; }>;
      bollinger?: { period: number; stdDev: number; };
      stochastic?: { kPeriod: number; dPeriod: number; smoothK: number; };
      williams?: { period: number; };
      atr?: { period: number; };
      cci?: { period: number; };
      momentum?: { period: number; };
    };
    riskManagement: {
      stopLoss?: number; // percentage
      takeProfit?: number; // percentage
      maxPositionSize?: number; // percentage of capital
    };
  }>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bot Executions (active bot runs with specific trading pairs)
export const botExecutions = pgTable("bot_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  strategyId: varchar("strategy_id").notNull().references(() => botStrategies.id, { onDelete: 'cascade' }),
  tradingPair: text("trading_pair").notNull(),
  status: text("status").notNull().default('inactive'), // 'active', 'inactive', 'paused'
  capital: decimal("capital", { precision: 20, scale: 8 }).notNull(),
  leverage: varchar("leverage").default('1'),
  profit: decimal("profit", { precision: 20, scale: 8 }).default('0'),
  trades: varchar("trades").default('0'),
  winRate: decimal("win_rate", { precision: 5, scale: 2 }).default('0'),
  roi: decimal("roi", { precision: 10, scale: 4 }).default('0'),
  runtime: varchar("runtime").default('0'),
  deploymentType: text("deployment_type").default('manual'), // 'manual', 'folder'
  folderId: varchar("folder_id"), // Reference to the folder if deployed via bulk
  botName: text("bot_name"), // Store custom bot name for display
  folderName: text("folder_name"), // Store folder name for compatibility
  startedAt: timestamp("started_at"),
  pausedAt: timestamp("paused_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const screeners = pgTable("screeners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default('#3b82f6'),
  tradingPairs: text("trading_pairs").array(),
  isStarred: boolean("is_starred").default(false),
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
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Trading Bot Alert System
export const alertSettings = pgTable("alert_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  alertType: text("alert_type").notNull(), // 'pnl_gain', 'pnl_loss', 'entry_signal', 'exit_signal', 'bot_error', 'performance_milestone', 'screener_match', 'trend_change', 'volume_spike', 'price_breakout', 'technical_signal', 'market_news', 'support_resistance', 'unusual_activity'
  isEnabled: boolean("is_enabled").default(true),
  threshold: text("threshold"), // For PnL thresholds, performance metrics
  method: text("method").notNull().default('in_app'), // 'in_app', 'email', 'webhook', 'browser_notification'
  config: jsonb("config").$type<{
    email?: string;
    webhookUrl?: string;
    discordWebhook?: string;
    sound?: boolean;
    priority?: 'low' | 'medium' | 'high';
    // Screener-specific config
    screenerId?: string;
    screenerName?: string;
    // Technical analysis config
    technicalIndicator?: string;
    timeframe?: string;
    // Market conditions
    volumeThreshold?: number;
    priceChangeThreshold?: number;
    // Trend analysis
    trendDirection?: 'bullish' | 'bearish' | 'neutral';
    trendStrength?: number;
    // Trading pair and folder targeting
    tradingPair?: string;
    folderName?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  botExecutionId: varchar("bot_execution_id").references(() => botExecutions.id),
  alertType: text("alert_type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  severity: text("severity").notNull().default('info'), // 'info', 'warning', 'error', 'success'
  isRead: boolean("is_read").default(false),
  isPinned: boolean("is_pinned").default(false),
  data: jsonb("data").$type<{
    pnl?: string;
    tradingPair?: string;
    price?: string;
    change?: string;
    profit?: string;
    winRate?: string;
    actionRequired?: boolean;
    // Screener data
    screenerId?: string;
    screenerName?: string;
    matchedCriteria?: string[];
    // Technical analysis data
    indicator?: string;
    indicatorValue?: number;
    timeframe?: string;
    // Volume and price data
    volume?: string;
    volumeChange?: string;
    priceTarget?: string;
    supportLevel?: string;
    resistanceLevel?: string;
    // Market trend data
    trendDirection?: string;
    trendStrength?: number;
    confidence?: number;
    // Target scope
    folderName?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
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

export const insertBotStrategySchema = createInsertSchema(botStrategies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBotExecutionSchema = createInsertSchema(botExecutions).omit({
  id: true,
  startedAt: true,
  pausedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScreenerSchema = createInsertSchema(screeners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAlertSettingSchema = createInsertSchema(alertSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
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

export type InsertBotStrategy = z.infer<typeof insertBotStrategySchema>;
export type BotStrategy = typeof botStrategies.$inferSelect;

export type InsertBotExecution = z.infer<typeof insertBotExecutionSchema>;
export type BotExecution = typeof botExecutions.$inferSelect;

export type InsertScreener = z.infer<typeof insertScreenerSchema>;
export type Screener = typeof screeners.$inferSelect;

export type InsertAlertSetting = z.infer<typeof insertAlertSettingSchema>;
export type AlertSetting = typeof alertSettings.$inferSelect;

export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

// Price Predictions with AI Confidence Analysis
export const pricePredictions = pgTable("price_predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  currentPrice: decimal("current_price", { precision: 20, scale: 8 }).notNull(),
  predictedPrice: decimal("predicted_price", { precision: 20, scale: 8 }).notNull(),
  direction: text("direction").notNull(), // 'up', 'down', 'sideways'
  confidence: integer("confidence").notNull(), // 0-100
  timeframe: text("timeframe").notNull().default('1h'), // '1h', '4h', '1d', '1w'
  aiAnalysis: jsonb("ai_analysis").$type<{
    technicalIndicators: {
      rsi: { value: number; signal: 'oversold' | 'overbought' | 'neutral' };
      macd: { value: number; signal: 'bullish' | 'bearish' | 'neutral' };
      bollinger: { position: 'upper' | 'middle' | 'lower' | 'outside' };
      volume: { trend: 'increasing' | 'decreasing' | 'stable'; strength: number };
    };
    marketSentiment: {
      overall: 'bullish' | 'bearish' | 'neutral';
      strength: number; // 0-100
      factors: string[];
    };
    supportResistance: {
      support: number[];
      resistance: number[];
      nearestLevel: { type: 'support' | 'resistance'; price: number; distance: number };
    };
    riskFactors: {
      volatility: 'low' | 'medium' | 'high';
      liquidityRisk: 'low' | 'medium' | 'high';
      marketConditions: string[];
    };
    confidenceFactors: {
      technicalAlignment: number; // 0-100
      volumeConfirmation: number; // 0-100
      marketConsensus: number; // 0-100
      historicalAccuracy: number; // 0-100
    };
  }>(),
  accuracy: decimal("accuracy", { precision: 5, scale: 2 }), // Historical accuracy percentage
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertPricePredictionSchema = createInsertSchema(pricePredictions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPricePrediction = z.infer<typeof insertPricePredictionSchema>;
export type PricePrediction = typeof pricePredictions.$inferSelect;
