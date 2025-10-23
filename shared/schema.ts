import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, numeric, timestamp, jsonb, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  tradingStyle: text("trading_style").default('balanced'), // 'conservative', 'balanced', 'aggressive', 'high_risk'
  preferences: jsonb("preferences").$type<{
    confidenceThreshold?: number;
    maxLeverage?: number;
    riskTolerance?: 'low' | 'medium' | 'high' | 'extreme';
    timeframePreference?: '1m' | '5m' | '15m' | '1h' | '4h';
    tradingStyleSettings?: {
      aggressive?: boolean;
      scalping?: boolean;
      volatilityFocus?: boolean;
    };
  }>(),
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
  totalBalance: decimal("total_balance", { precision: 20, scale: 8 }),
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
  source: text("source").notNull().default('manual'), // 'manual', 'auto_scanner'
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
      trailingStop?: number; // percentage - mutually exclusive with stopLoss
      maxPositionSize?: number; // percentage of capital
    };
  }>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


/**
 * Bot lifecycle states (simplified — no 'waiting_entry')
 */
export type BotStatus = "active" | "exit_pending" | "terminated";
export type DeploymentType = "manual" | "auto_scanner" | "folder";
export type BotSource = "manual" | "ai_bot" | "auto_scanner";
export type CompletedReason = "tp" | "sl" | "manual" | "other";

/**
 * bot_executions
 * - Default status is 'active' (Smart Scanner enters immediately)
 * - One-shot controls: oneShot, completed, completedReason
 * - positionData jsonb for storing orderId, entryPrice, TP/SL, etc.
 */
export const botExecutions = pgTable("bot_executions", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  userId: varchar("user_id", { length: 64 }).notNull(),
  strategyId: varchar("strategy_id", { length: 128 }).notNull(),
  tradingPair: text("trading_pair").notNull(),

  // ❗Changed default: no 'waiting_entry' — Smart Scanner deploys as active
  status: text("status").$type<BotStatus>().notNull().default("active"),

  // Monetary/metrics — stored as NUMERIC to avoid FP issues
  capital: numeric("capital", { precision: 20, scale: 8 }).notNull(),
  leverage: varchar("leverage", { length: 8 }).notNull().default("1"),

  profit: numeric("profit", { precision: 20, scale: 8 }).notNull().default("0"),
  trades: varchar("trades", { length: 16 }).notNull().default("0"),
  winRate: numeric("win_rate", { precision: 7, scale: 3 }).notNull().default("0"),
  roi: numeric("roi", { precision: 12, scale: 6 }).notNull().default("0"),

  runtime: varchar("runtime", { length: 32 }).notNull().default("0"),

  // Deployment metadata
  deploymentType: text("deployment_type")
    .$type<DeploymentType | null>()
    .default(null),
  folderId: varchar("folder_id", { length: 64 }),
  botName: text("bot_name"),
  folderName: text("folder_name"),
  isAIBot: boolean("is_ai_bot").notNull().default(false),

  source: text("source").$type<BotSource | null>().default(null),

  // Optional user-specified % TP/SL (e.g., "2" for 2%)
  customStopLoss: numeric("custom_stop_loss", { precision: 6, scale: 3 }),
  customTakeProfit: numeric("custom_take_profit", { precision: 6, scale: 3 }),

  // ✅ One-shot lifecycle controls
  oneShot: boolean("one_shot").notNull().default(true),
  completed: boolean("completed").notNull().default(false),
  completedReason: text("completed_reason")
    .$type<CompletedReason | null>()
    .default(null),

  // 🧾 Last-known position snapshot for UI/debug (orderId, entry, TP/SL, side, etc.)
  positionData: jsonb("position_data"),

  // Timestamps
  startedAt: timestamp("started_at", { withTimezone: false }),
  pausedAt: timestamp("paused_at", { withTimezone: false }),
  exitReason: text("exit_reason"),

  createdAt: timestamp("created_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
});

/** Drizzle type helpers */
export type BotExecution = typeof botExecutions.$inferSelect;
export type InsertBotExecution = typeof botExecutions.$inferInsert;

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
    deploymentType?: string;
    strategyId?: string;
    createdBy?: string;
    timestamp?: string;

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
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
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
  createdAt: true,
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

// User Trading Preferences for Personalized Strategy Recommendations
export const userTradingPreferences = pgTable("user_trading_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  riskTolerance: text("risk_tolerance").notNull().default('medium'), // 'conservative', 'moderate', 'aggressive', 'high_risk'
  tradingExperience: text("trading_experience").notNull().default('intermediate'), // 'beginner', 'intermediate', 'advanced', 'expert'
  availableCapital: decimal("available_capital", { precision: 20, scale: 8 }),
  preferredTimeframes: text("preferred_timeframes").array().default(['4h', '1d']), // ['1m', '5m', '15m', '1h', '4h', '1d', '1w']
  tradingStyle: text("trading_style").notNull().default('swing'), // 'scalping', 'day_trading', 'swing', 'position'
  preferredStrategies: text("preferred_strategies").array().default(['momentum', 'trend_following']), // ['momentum', 'mean_reversion', 'breakout', 'trend_following', 'scalping', 'arbitrage']
  maxLeverage: decimal("max_leverage", { precision: 5, scale: 2 }).default('3.00'),
  maxPositionSize: decimal("max_position_size", { precision: 5, scale: 2 }).default('10.00'), // percentage
  stopLossPreference: decimal("stop_loss_preference", { precision: 5, scale: 2 }).default('2.00'), // percentage
  takeProfitPreference: decimal("take_profit_preference", { precision: 5, scale: 2 }).default('5.00'), // percentage
  preferredMarkets: text("preferred_markets").array().default(['major_pairs']), // ['major_pairs', 'altcoins', 'defi', 'meme_coins', 'new_listings']
  avoidPatterns: text("avoid_patterns").array().default([]), // ['high_volatility', 'low_volume', 'new_tokens', 'leveraged_tokens']
  tradingHours: jsonb("trading_hours").$type<{
    timezone: string;
    activeDays: string[]; // ['monday', 'tuesday', etc.]
    activeHours: { start: string; end: string }[]; // [{ start: '09:00', end: '17:00' }]
    pauseDuringNews: boolean;
  }>().default({
    timezone: 'UTC',
    activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    activeHours: [{ start: '09:00', end: '17:00' }],
    pauseDuringNews: false
  }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Strategy Performance History for ML-based Recommendations
export const strategyPerformance = pgTable("strategy_performance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  strategyId: varchar("strategy_id").notNull().references(() => botStrategies.id, { onDelete: 'cascade' }),
  tradingPair: text("trading_pair").notNull(),
  timeframe: text("timeframe").notNull(),
  marketConditions: jsonb("market_conditions").$type<{
    volatility: 'low' | 'medium' | 'high';
    trend: 'bullish' | 'bearish' | 'sideways';
    volume: 'low' | 'medium' | 'high';
    sentiment: 'bullish' | 'bearish' | 'neutral';
  }>().notNull(),
  performance: jsonb("performance").$type<{
    totalReturn: number;
    roi: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    maxDrawdown: number;
    sharpeRatio: number;
    profitFactor: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    avgHoldTime: number; // in hours
    maxConsecutiveWins: number;
    maxConsecutiveLosses: number;
  }>().notNull(),
  duration: integer("duration").notNull(), // in hours
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isCompleted: boolean("is_completed").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Personalized Strategy Recommendations
export const strategyRecommendations = pgTable("strategy_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  recommendationType: text("recommendation_type").notNull(), // 'market_opportunity', 'portfolio_rebalance', 'risk_adjustment', 'performance_optimization'
  title: text("title").notNull(),
  description: text("description").notNull(),
  confidenceScore: integer("confidence_score").notNull(), // 0-100
  priority: text("priority").notNull().default('medium'), // 'low', 'medium', 'high', 'critical'
  strategyConfig: jsonb("strategy_config").$type<{
    strategyType: string;
    tradingPairs: string[];
    timeframes: string[];
    capitalAllocation: number; // percentage
    leverage: number;
    riskManagement: {
      stopLoss: number;
      takeProfit: number;
      maxPositionSize: number;
    };
    indicators: {
      primary: string[];
      secondary: string[];
    };
    entryConditions: Array<{
      indicator: string;
      operator: string;
      value: number;
      weight: number;
    }>;
    exitConditions: Array<{
      indicator: string;
      operator: string;
      value: number;
      weight: number;
    }>;
  }>().notNull(),
  reasoning: jsonb("reasoning").$type<{
    marketAnalysis: string[];
    userProfileMatch: string[];
    historicalPerformance: string[];
    riskAssessment: string[];
    opportunityFactors: string[];
  }>().notNull(),
  expectedOutcome: jsonb("expected_outcome").$type<{
    expectedROI: number;
    expectedWinRate: number;
    estimatedDuration: number; // in hours
    riskLevel: 'low' | 'medium' | 'high';
    confidenceInterval: { min: number; max: number };
  }>().notNull(),
  status: text("status").default('pending'), // 'pending', 'accepted', 'rejected', 'implemented', 'expired'
  implementedAt: timestamp("implemented_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Market Opportunity Scanner
export const marketOpportunities = pgTable("market_opportunities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  opportunityType: text("opportunity_type").notNull(), // 'breakout', 'reversal', 'momentum', 'arbitrage', 'volatility', 'news_driven'
  timeframe: text("timeframe").notNull(),
  strength: integer("strength").notNull(), // 0-100
  confidence: integer("confidence").notNull(), // 0-100
  description: text("description").notNull(),
  analysis: jsonb("analysis").$type<{
    technicalFactors: Array<{
      indicator: string;
      value: number;
      signal: 'bullish' | 'bearish' | 'neutral';
      weight: number;
    }>;
    fundamentalFactors: string[];
    marketContext: {
      volume: number;
      volatility: number;
      trend: string;
      sentiment: string;
    };
    entryZone: {
      min: number;
      max: number;
      optimal: number;
    };
    targets: number[];
    stopLoss: number;
  }>().notNull(),
  recommendedStrategies: text("recommended_strategies").array(),
  suitableForUsers: text("suitable_for_users").array(), // risk tolerance levels
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for new tables
export const insertUserTradingPreferencesSchema = createInsertSchema(userTradingPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStrategyPerformanceSchema = createInsertSchema(strategyPerformance).omit({
  id: true,
  createdAt: true,
});

export const insertStrategyRecommendationSchema = createInsertSchema(strategyRecommendations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMarketOpportunitySchema = createInsertSchema(marketOpportunities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for new tables
export type InsertUserTradingPreferences = z.infer<typeof insertUserTradingPreferencesSchema>;
export type UserTradingPreferences = typeof userTradingPreferences.$inferSelect;

export type InsertStrategyPerformance = z.infer<typeof insertStrategyPerformanceSchema>;
export type StrategyPerformance = typeof strategyPerformance.$inferSelect;

export type InsertStrategyRecommendation = z.infer<typeof insertStrategyRecommendationSchema>;
export type StrategyRecommendation = typeof strategyRecommendations.$inferSelect;

export type InsertMarketOpportunity = z.infer<typeof insertMarketOpportunitySchema>;
export type MarketOpportunity = typeof marketOpportunities.$inferSelect;