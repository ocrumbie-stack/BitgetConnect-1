import { 
  type User, 
  type InsertUser, 
  type BitgetCredentials,
  type InsertBitgetCredentials,
  type FuturesData,
  type InsertFuturesData,
  type UserPosition,
  type InsertUserPosition,
  type AccountInfo,
  type InsertAccountInfo,
  type BotStrategy,
  type InsertBotStrategy,
  type BotExecution,
  type InsertBotExecution,
  type Screener,
  type InsertScreener,
  type AlertSetting,
  type InsertAlertSetting,
  type Alert,
  type InsertAlert,
  type PricePrediction,
  type InsertPricePrediction,
  type UserTradingPreferences,
  type InsertUserTradingPreferences,
  type StrategyPerformance,
  type InsertStrategyPerformance,
  type StrategyRecommendation,
  type InsertStrategyRecommendation,
  type MarketOpportunity,
  type InsertMarketOpportunity,
  users,
  screeners,
  botStrategies,
  botExecutions,
  alertSettings,
  alerts,
  pricePredictions,
  userTradingPreferences,
  strategyPerformance,
  strategyRecommendations,
  marketOpportunities
} from "@shared/schema";
import { randomUUID } from "crypto";
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@shared/schema';
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  cache?: Map<string, any>; // Add cache property for performance
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;
  
  getBitgetCredentials(userId: string): Promise<BitgetCredentials | undefined>;
  saveBitgetCredentials(credentials: InsertBitgetCredentials): Promise<BitgetCredentials>;
  
  getAllFuturesData(): Promise<FuturesData[]>;
  updateFuturesData(data: InsertFuturesData[]): Promise<void>;
  getFuturesDataBySymbol(symbol: string): Promise<FuturesData | undefined>;
  
  getUserPositions(userId: string): Promise<UserPosition[]>;
  updateUserPositions(userId: string, positions: InsertUserPosition[]): Promise<void>;
  
  getAccountInfo(userId: string): Promise<AccountInfo | undefined>;
  updateAccountInfo(userId: string, info: InsertAccountInfo): Promise<AccountInfo>;
  
  getBotStrategies(userId: string): Promise<BotStrategy[]>;
  createBotStrategy(strategy: InsertBotStrategy): Promise<BotStrategy>;
  updateBotStrategy(id: string, strategy: Partial<InsertBotStrategy>): Promise<BotStrategy>;
  deleteBotStrategy(id: string): Promise<void>;
  
  getBotExecutions(userId: string): Promise<BotExecution[]>;
  createBotExecution(execution: InsertBotExecution): Promise<BotExecution>;
  updateBotExecution(id: string, execution: Partial<InsertBotExecution>): Promise<BotExecution>;
  deleteBotExecution(id: string): Promise<void>;
  
  getUserScreeners(userId: string): Promise<Screener[]>;
  createScreener(screener: InsertScreener): Promise<Screener>;
  updateScreener(id: string, screener: InsertScreener): Promise<Screener>;
  deleteScreener(id: string): Promise<void>;
  
  // Alert System
  getUserAlertSettings(userId: string): Promise<AlertSetting[]>;
  createAlertSetting(setting: InsertAlertSetting): Promise<AlertSetting>;
  updateAlertSetting(id: string, setting: Partial<InsertAlertSetting>): Promise<AlertSetting>;
  deleteAlertSetting(id: string): Promise<void>;
  
  getUserAlerts(userId: string): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertAsRead(id: string): Promise<void>;
  markAllAlertsAsRead(userId: string): Promise<void>;
  deleteAlert(id: string): Promise<void>;

  // Price Predictions
  createPricePrediction(prediction: InsertPricePrediction): Promise<PricePrediction>;
  getPricePredictions(symbol?: string): Promise<PricePrediction[]>;
  updatePricePrediction(id: string, updates: Partial<PricePrediction>): Promise<boolean>;
  deletePricePrediction(id: string): Promise<boolean>;

  // Personalized Strategy Recommender
  getUserTradingPreferences(userId: string): Promise<UserTradingPreferences | undefined>;
  createUserTradingPreferences(preferences: InsertUserTradingPreferences): Promise<UserTradingPreferences>;
  updateUserTradingPreferences(userId: string, preferences: Partial<InsertUserTradingPreferences>): Promise<UserTradingPreferences>;
  
  getStrategyPerformance(userId: string, strategyId?: string): Promise<StrategyPerformance[]>;
  createStrategyPerformance(performance: InsertStrategyPerformance): Promise<StrategyPerformance>;
  
  getStrategyRecommendations(userId: string): Promise<StrategyRecommendation[]>;
  createStrategyRecommendation(recommendation: InsertStrategyRecommendation): Promise<StrategyRecommendation>;
  updateStrategyRecommendation(id: string, updates: Partial<InsertStrategyRecommendation>): Promise<StrategyRecommendation>;
  deleteStrategyRecommendation(id: string): Promise<void>;
  
  getMarketOpportunities(userId?: string): Promise<MarketOpportunity[]>;
  createMarketOpportunity(opportunity: InsertMarketOpportunity): Promise<MarketOpportunity>;
  updateMarketOpportunity(id: string, updates: Partial<InsertMarketOpportunity>): Promise<MarketOpportunity>;
  deleteMarketOpportunity(id: string): Promise<void>;
  
  // User preferences
  getUserPreferences(userId: string): Promise<{ tradingStyle: string; preferences: any } | undefined>;
  saveUserPreferences(userId: string, data: { tradingStyle: string; preferences: any }): Promise<void>;
}

export class MemStorage implements IStorage {
  cache = new Map<string, any>(); // Initialize cache for performance
  private users: Map<string, User>;
  private bitgetCredentials: Map<string, BitgetCredentials>;
  private futuresData: Map<string, FuturesData>;
  private userPositions: Map<string, UserPosition[]>;
  private accountInfo: Map<string, AccountInfo>;
  private botStrategies: Map<string, BotStrategy>;
  private botExecutions: Map<string, BotExecution>;
  private screeners: Map<string, Screener>;
  private alertSettings: Map<string, AlertSetting>;
  private alerts: Map<string, Alert>;
  private pricePredictions: Map<string, PricePrediction>;
  private userTradingPreferences: Map<string, UserTradingPreferences>;
  private strategyPerformance: Map<string, StrategyPerformance>;
  private strategyRecommendations: Map<string, StrategyRecommendation>;
  private marketOpportunities: Map<string, MarketOpportunity>;
  private userPreferences: Map<string, { tradingStyle: string; preferences: any }>;
  
  // Price history for calculating 5-minute changes
  private priceHistory: Map<string, Array<{ price: number; timestamp: number }>>;

  constructor() {
    this.users = new Map();
    this.bitgetCredentials = new Map();
    this.futuresData = new Map();
    this.userPositions = new Map();
    this.accountInfo = new Map();
    this.botStrategies = new Map();
    this.botExecutions = new Map();
    this.screeners = new Map();
    this.alertSettings = new Map();
    this.alerts = new Map();
    this.pricePredictions = new Map();
    this.userTradingPreferences = new Map();
    this.strategyPerformance = new Map();
    this.strategyRecommendations = new Map();
    this.marketOpportunities = new Map();
    this.userPreferences = new Map();
    this.priceHistory = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      tradingStyle: insertUser.tradingStyle || 'balanced',
      preferences: insertUser.preferences || {}
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    const updatedUser = { ...user, password: hashedPassword };
    this.users.set(userId, updatedUser);
  }

  async getBitgetCredentials(userId: string): Promise<BitgetCredentials | undefined> {
    return this.bitgetCredentials.get(userId);
  }

  async saveBitgetCredentials(credentials: InsertBitgetCredentials): Promise<BitgetCredentials> {
    const id = randomUUID();
    const savedCredentials: BitgetCredentials = { 
      ...credentials, 
      id,
      createdAt: new Date()
    };
    this.bitgetCredentials.set(credentials.userId, savedCredentials);
    return savedCredentials;
  }

  async getAllFuturesData(): Promise<FuturesData[]> {
    return Array.from(this.futuresData.values());
  }

  async updateFuturesData(data: InsertFuturesData[]): Promise<void> {
    const now = Date.now();
    
    data.forEach(item => {
      const id = randomUUID();
      const currentPrice = parseFloat(item.price);
      
      // Store price history for 5-minute change calculation
      if (!this.priceHistory.has(item.symbol)) {
        this.priceHistory.set(item.symbol, []);
      }
      
      const history = this.priceHistory.get(item.symbol)!;
      history.push({ price: currentPrice, timestamp: now });
      
      // Keep only last 10 minutes of data (for safety margin)
      const tenMinutesAgo = now - (10 * 60 * 1000);
      const filteredHistory = history.filter(h => h.timestamp > tenMinutesAgo);
      this.priceHistory.set(item.symbol, filteredHistory);
      
      // Calculate 5-minute change
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      const fiveMinutePrice = filteredHistory.find(h => h.timestamp <= fiveMinutesAgo + 30000); // 30s tolerance
      
      let change5m = '0';
      if (fiveMinutePrice) {
        const changePercent = ((currentPrice - fiveMinutePrice.price) / fiveMinutePrice.price);
        change5m = changePercent.toString();
      }
      
      const futuresItem: FuturesData & { change5m?: string } = {
        ...item,
        id,
        change24h: item.change24h || null,
        volume24h: item.volume24h || null,
        fundingRate: item.fundingRate || null,
        openInterest: item.openInterest || null,
        contractType: item.contractType || null,
        lastUpdated: new Date(),
        // Add 5-minute change as a custom field
        change5m: change5m
      };
      this.futuresData.set(item.symbol, futuresItem);
    });
  }

  async getFuturesDataBySymbol(symbol: string): Promise<FuturesData | undefined> {
    return this.futuresData.get(symbol);
  }

  async getUserPositions(userId: string): Promise<UserPosition[]> {
    return this.userPositions.get(userId) || [];
  }

  async updateUserPositions(userId: string, positions: InsertUserPosition[]): Promise<void> {
    const userPositionsList = positions.map(pos => ({
      ...pos,
      id: randomUUID(),
      userId,
      entryPrice: pos.entryPrice || null,
      markPrice: pos.markPrice || null,
      pnl: pos.pnl || null,
      margin: pos.margin || null,
      leverage: pos.leverage || null,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    this.userPositions.set(userId, userPositionsList);
  }

  async getAccountInfo(userId: string): Promise<AccountInfo | undefined> {
    return this.accountInfo.get(userId);
  }

  async updateAccountInfo(userId: string, info: InsertAccountInfo): Promise<AccountInfo> {
    const id = randomUUID();
    const accountData: AccountInfo = {
      ...info,
      id,
      userId,
      availableBalance: info.availableBalance || null,
      marginUsed: info.marginUsed || null,
      unrealizedPnl: info.unrealizedPnl || null,
      totalEquity: info.totalEquity || null,
      totalBalance: info.totalBalance || null,
      marginRatio: info.marginRatio || null,
      maintenanceMargin: info.maintenanceMargin || null,
      lastUpdated: new Date()
    };
    this.accountInfo.set(userId, accountData);
    return accountData;
  }



  async getBotStrategies(userId: string): Promise<BotStrategy[]> {
    return Array.from(this.botStrategies.values()).filter(strategy => strategy.userId === userId);
  }

  async createBotStrategy(insertStrategy: InsertBotStrategy): Promise<BotStrategy> {
    const id = randomUUID();
    const now = new Date();
    const strategy = { 
      ...insertStrategy,
      id,
      riskLevel: insertStrategy.riskLevel || 'medium',
      description: insertStrategy.description || null,
      createdAt: now,
      updatedAt: now
    } as BotStrategy;
    this.botStrategies.set(id, strategy);
    return strategy;
  }

  async updateBotStrategy(id: string, updates: Partial<InsertBotStrategy>): Promise<BotStrategy> {
    const existingStrategy = this.botStrategies.get(id);
    if (!existingStrategy) {
      throw new Error('Bot strategy not found');
    }
    const updatedStrategy = { 
      ...existingStrategy, 
      ...updates,
      config: updates.config || existingStrategy.config,
      updatedAt: new Date()
    } as BotStrategy;
    this.botStrategies.set(id, updatedStrategy);
    return updatedStrategy;
  }

  async deleteBotStrategy(id: string): Promise<void> {
    this.botStrategies.delete(id);
  }

  async getBotExecutions(userId: string): Promise<BotExecution[]> {
    const executions = Array.from(this.botExecutions.values()).filter(execution => execution.userId === userId);
    
    // Debug: Log each bot execution status 
    console.log(`📋 Storage getBotExecutions for ${userId}:`);
    executions.forEach(bot => {
      console.log(`  - ${bot.tradingPair}: status="${bot.status}", deploymentType="${bot.deploymentType}"`);
    });
    
    return executions;
  }

  async createBotExecution(insertExecution: InsertBotExecution): Promise<BotExecution> {
    const id = randomUUID();
    const now = new Date();
    const execution: BotExecution = { 
      ...insertExecution,
      id,
      status: insertExecution.status || 'inactive',
      leverage: insertExecution.leverage || '1',
      profit: insertExecution.profit || '0',
      trades: insertExecution.trades || '0',
      winRate: insertExecution.winRate || '0',
      roi: insertExecution.roi || '0',
      runtime: insertExecution.runtime || '0',
      deploymentType: insertExecution.deploymentType || null,
      folderId: insertExecution.folderId || null,
      botName: insertExecution.botName || null,
      folderName: insertExecution.folderName || null,
      startedAt: null,
      pausedAt: null,
      createdAt: now,
      updatedAt: now
    };
    this.botExecutions.set(id, execution);
    return execution;
  }

  async updateBotExecution(id: string, updates: Partial<InsertBotExecution>): Promise<BotExecution> {
    const existingExecution = this.botExecutions.get(id);
    if (!existingExecution) {
      throw new Error('Bot execution not found');
    }
    const updatedExecution: BotExecution = { 
      ...existingExecution, 
      ...updates,
      updatedAt: new Date()
    };
    this.botExecutions.set(id, updatedExecution);
    return updatedExecution;
  }

  async deleteBotExecution(id: string): Promise<void> {
    this.botExecutions.delete(id);
  }

  async getUserScreeners(userId: string): Promise<Screener[]> {
    return Array.from(this.screeners.values()).filter(screener => screener.userId === userId);
  }

  async createScreener(insertScreener: InsertScreener): Promise<Screener> {
    const id = randomUUID();
    const now = new Date();
    const screener = { 
      ...insertScreener,
      id,
      description: insertScreener.description || null,
      color: insertScreener.color || '#3b82f6',
      tradingPairs: insertScreener.tradingPairs || null,
      isStarred: insertScreener.isStarred || false,
      criteria: insertScreener.criteria || null,
      createdAt: now,
      updatedAt: now
    } as Screener;
    this.screeners.set(id, screener);
    return screener;
  }

  async updateScreener(id: string, insertScreener: InsertScreener): Promise<Screener> {
    const existingScreener = this.screeners.get(id);
    if (!existingScreener) {
      throw new Error('Screener not found');
    }
    const updatedScreener = { 
      ...existingScreener,
      ...insertScreener,
      description: insertScreener.description || existingScreener.description,
      color: insertScreener.color || existingScreener.color,
      tradingPairs: insertScreener.tradingPairs || existingScreener.tradingPairs,
      isStarred: insertScreener.isStarred !== undefined ? insertScreener.isStarred : existingScreener.isStarred,
      criteria: insertScreener.criteria || existingScreener.criteria,
      updatedAt: new Date()
    } as Screener;
    this.screeners.set(id, updatedScreener);
    return updatedScreener;
  }

  async deleteScreener(id: string): Promise<void> {
    this.screeners.delete(id);
  }

  // Alert Settings
  async getUserAlertSettings(userId: string): Promise<AlertSetting[]> {
    return Array.from(this.alertSettings.values()).filter(setting => setting.userId === userId);
  }

  async createAlertSetting(setting: InsertAlertSetting): Promise<AlertSetting> {
    const id = randomUUID();
    const newSetting = {
      id,
      ...setting,
      isEnabled: setting.isEnabled ?? true,
      threshold: setting.threshold || null,
      method: setting.method || 'in_app',
      config: setting.config || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as AlertSetting;
    this.alertSettings.set(id, newSetting);
    return newSetting;
  }

  async updateAlertSetting(id: string, setting: Partial<InsertAlertSetting>): Promise<AlertSetting> {
    const existing = this.alertSettings.get(id);
    if (!existing) {
      throw new Error('Alert setting not found');
    }
    const updated = {
      ...existing,
      ...setting,
      config: setting.config !== undefined ? setting.config : existing.config,
      updatedAt: new Date(),
    } as AlertSetting;
    this.alertSettings.set(id, updated);
    return updated;
  }

  async deleteAlertSetting(id: string): Promise<void> {
    this.alertSettings.delete(id);
  }

  // Alerts
  async getUserAlerts(userId: string): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .filter(alert => alert.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const id = randomUUID();
    const newAlert = {
      id,
      ...alert,
      botExecutionId: alert.botExecutionId || null,
      severity: alert.severity || 'info',
      isRead: alert.isRead ?? false,
      isPinned: alert.isPinned ?? false,
      data: alert.data || null,
      createdAt: new Date(),
    } as Alert;
    this.alerts.set(id, newAlert);
    return newAlert;
  }

  async markAlertAsRead(id: string): Promise<void> {
    const alert = this.alerts.get(id);
    if (alert) {
      const updatedAlert = { ...alert, isRead: true };
      this.alerts.set(id, updatedAlert);
    }
  }

  async markAllAlertsAsRead(userId: string): Promise<void> {
    this.alerts.forEach((alert, id) => {
      if (alert.userId === userId && !alert.isRead) {
        const updatedAlert = { ...alert, isRead: true };
        this.alerts.set(id, updatedAlert);
      }
    });
  }

  async deleteAlert(id: string): Promise<void> {
    this.alerts.delete(id);
  }

  // Price Predictions
  async createPricePrediction(prediction: InsertPricePrediction): Promise<PricePrediction> {
    const id = randomUUID();
    const newPrediction = {
      id,
      ...prediction,
      timeframe: prediction.timeframe || '1h',
      aiAnalysis: prediction.aiAnalysis || null,
      accuracy: prediction.accuracy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as PricePrediction;
    this.pricePredictions.set(id, newPrediction);
    return newPrediction;
  }

  async getPricePredictions(symbol?: string): Promise<PricePrediction[]> {
    const predictions = Array.from(this.pricePredictions.values());
    if (symbol) {
      return predictions.filter(p => p.symbol === symbol);
    }
    return predictions;
  }

  async updatePricePrediction(id: string, updates: Partial<PricePrediction>): Promise<boolean> {
    const existing = this.pricePredictions.get(id);
    if (!existing) return false;
    
    const updated: PricePrediction = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.pricePredictions.set(id, updated);
    return true;
  }

  async deletePricePrediction(id: string): Promise<boolean> {
    return this.pricePredictions.delete(id);
  }

  // Personalized Strategy Recommender Methods
  async getUserTradingPreferences(userId: string): Promise<UserTradingPreferences | undefined> {
    return Array.from(this.userTradingPreferences.values()).find(pref => pref.userId === userId);
  }

  async createUserTradingPreferences(preferences: InsertUserTradingPreferences): Promise<UserTradingPreferences> {
    const id = randomUUID();
    const defaultTradingHours = {
      timezone: 'UTC',
      activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      activeHours: [{ start: '09:00', end: '17:00' }],
      pauseDuringNews: false
    };
    const newPreferences = {
      id,
      userId: preferences.userId,
      riskTolerance: preferences.riskTolerance || 'medium',
      tradingExperience: preferences.tradingExperience || 'intermediate',
      availableCapital: preferences.availableCapital || null,
      preferredTimeframes: preferences.preferredTimeframes || ['4h', '1d'],
      tradingStyle: preferences.tradingStyle || 'swing',
      preferredStrategies: preferences.preferredStrategies || ['momentum', 'trend_following'],
      maxLeverage: preferences.maxLeverage || '3.00',
      maxPositionSize: preferences.maxPositionSize || '10.00',
      stopLossPreference: preferences.stopLossPreference || '2.00',
      takeProfitPreference: preferences.takeProfitPreference || '5.00',
      preferredMarkets: preferences.preferredMarkets || ['major_pairs'],
      avoidPatterns: preferences.avoidPatterns || [],
      tradingHours: preferences.tradingHours || defaultTradingHours,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as UserTradingPreferences;
    this.userTradingPreferences.set(id, newPreferences);
    return newPreferences;
  }

  async updateUserTradingPreferences(userId: string, preferences: Partial<InsertUserTradingPreferences>): Promise<UserTradingPreferences> {
    const existing = Array.from(this.userTradingPreferences.values()).find(pref => pref.userId === userId);
    if (!existing) {
      // Create new preferences if none exist
      return this.createUserTradingPreferences({ ...preferences, userId } as InsertUserTradingPreferences);
    }
    
    const updated = {
      ...existing,
      ...preferences,
      updatedAt: new Date(),
    } as UserTradingPreferences;
    this.userTradingPreferences.set(existing.id, updated);
    return updated;
  }

  async getStrategyPerformance(userId: string, strategyId?: string): Promise<StrategyPerformance[]> {
    const performances = Array.from(this.strategyPerformance.values()).filter(perf => perf.userId === userId);
    if (strategyId) {
      return performances.filter(perf => perf.strategyId === strategyId);
    }
    return performances;
  }

  async createStrategyPerformance(performance: InsertStrategyPerformance): Promise<StrategyPerformance> {
    const id = randomUUID();
    const newPerformance = {
      id,
      ...performance,
      createdAt: new Date(),
    } as StrategyPerformance;
    this.strategyPerformance.set(id, newPerformance);
    return newPerformance;
  }

  async getStrategyRecommendations(userId: string): Promise<StrategyRecommendation[]> {
    return Array.from(this.strategyRecommendations.values())
      .filter(rec => rec.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createStrategyRecommendation(recommendation: InsertStrategyRecommendation): Promise<StrategyRecommendation> {
    const id = randomUUID();
    const newRecommendation = {
      id,
      ...recommendation,
      status: recommendation.status || 'pending',
      priority: recommendation.priority || 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as StrategyRecommendation;
    this.strategyRecommendations.set(id, newRecommendation);
    return newRecommendation;
  }

  async updateStrategyRecommendation(id: string, updates: Partial<InsertStrategyRecommendation>): Promise<StrategyRecommendation> {
    const existing = this.strategyRecommendations.get(id);
    if (!existing) {
      throw new Error(`Strategy recommendation with id ${id} not found`);
    }
    
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    } as StrategyRecommendation;
    this.strategyRecommendations.set(id, updated);
    return updated;
  }

  async deleteStrategyRecommendation(id: string): Promise<void> {
    this.strategyRecommendations.delete(id);
  }

  async getMarketOpportunities(userId?: string): Promise<MarketOpportunity[]> {
    const opportunities = Array.from(this.marketOpportunities.values())
      .filter(opp => opp.isActive && opp.expiresAt > new Date())
      .sort((a, b) => b.strength - a.strength);
    
    if (userId) {
      // Filter opportunities based on user preferences if userId is provided
      const userPrefs = await this.getUserTradingPreferences(userId);
      if (userPrefs) {
        return opportunities.filter(opp => {
          return opp.suitableForUsers?.includes(userPrefs.riskTolerance) || 
                 opp.suitableForUsers?.includes('all');
        });
      }
    }
    
    return opportunities;
  }

  async createMarketOpportunity(opportunity: InsertMarketOpportunity): Promise<MarketOpportunity> {
    const id = randomUUID();
    const newOpportunity = {
      id,
      ...opportunity,
      isActive: opportunity.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as MarketOpportunity;
    this.marketOpportunities.set(id, newOpportunity);
    return newOpportunity;
  }

  async updateMarketOpportunity(id: string, updates: Partial<InsertMarketOpportunity>): Promise<MarketOpportunity> {
    const existing = this.marketOpportunities.get(id);
    if (!existing) {
      throw new Error(`Market opportunity with id ${id} not found`);
    }
    
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    } as MarketOpportunity;
    this.marketOpportunities.set(id, updated);
    return updated;
  }

  async deleteMarketOpportunity(id: string): Promise<void> {
    this.marketOpportunities.delete(id);
  }

  // User preferences methods
  async getUserPreferences(userId: string): Promise<{ tradingStyle: string; preferences: any } | undefined> {
    return this.userPreferences.get(userId);
  }

  async saveUserPreferences(userId: string, data: { tradingStyle: string; preferences: any }): Promise<void> {
    this.userPreferences.set(userId, data);
  }
}

export class DatabaseStorage implements IStorage {
  private memStorage: MemStorage;

  constructor() {
    this.memStorage = new MemStorage();
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }

  async getBitgetCredentials(userId: string): Promise<BitgetCredentials | undefined> {
    return this.memStorage.getBitgetCredentials(userId);
  }

  async saveBitgetCredentials(credentials: InsertBitgetCredentials): Promise<BitgetCredentials> {
    return this.memStorage.saveBitgetCredentials(credentials);
  }

  async getAllFuturesData(): Promise<FuturesData[]> {
    return this.memStorage.getAllFuturesData();
  }

  async updateFuturesData(data: InsertFuturesData[]): Promise<void> {
    return this.memStorage.updateFuturesData(data);
  }

  async getFuturesDataBySymbol(symbol: string): Promise<FuturesData | undefined> {
    return this.memStorage.getFuturesDataBySymbol(symbol);
  }

  async getUserPositions(userId: string): Promise<UserPosition[]> {
    return this.memStorage.getUserPositions(userId);
  }

  async updateUserPositions(userId: string, positions: InsertUserPosition[]): Promise<void> {
    return this.memStorage.updateUserPositions(userId, positions);
  }

  async getAccountInfo(userId: string): Promise<AccountInfo | undefined> {
    return this.memStorage.getAccountInfo(userId);
  }

  async updateAccountInfo(userId: string, info: InsertAccountInfo): Promise<AccountInfo> {
    return this.memStorage.updateAccountInfo(userId, info);
  }

  async getBotStrategies(userId: string): Promise<BotStrategy[]> {
    return await db.select().from(botStrategies).where(eq(botStrategies.userId, userId));
  }

  async createBotStrategy(strategy: InsertBotStrategy): Promise<BotStrategy> {
    const [created] = await db
      .insert(botStrategies)
      .values(strategy)
      .returning();
    return created;
  }

  async updateBotStrategy(id: string, strategy: Partial<InsertBotStrategy>): Promise<BotStrategy> {
    const [updated] = await db
      .update(botStrategies)
      .set({ ...strategy, updatedAt: new Date() })
      .where(eq(botStrategies.id, id))
      .returning();
    return updated;
  }

  async deleteBotStrategy(id: string): Promise<void> {
    await db.delete(botStrategies).where(eq(botStrategies.id, id));
  }

  async getBotExecutions(userId: string): Promise<BotExecution[]> {
    return await db.select().from(botExecutions).where(eq(botExecutions.userId, userId));
  }

  async createBotExecution(execution: InsertBotExecution): Promise<BotExecution> {
    const [created] = await db
      .insert(botExecutions)
      .values(execution)
      .returning();
    return created;
  }

  async updateBotExecution(id: string, execution: Partial<InsertBotExecution>): Promise<BotExecution> {
    const [updated] = await db
      .update(botExecutions)
      .set({ ...execution, updatedAt: new Date() })
      .where(eq(botExecutions.id, id))
      .returning();
    return updated;
  }

  async deleteBotExecution(id: string): Promise<void> {
    await db.delete(botExecutions).where(eq(botExecutions.id, id));
  }

  async getUserScreeners(userId: string): Promise<Screener[]> {
    return await db.select().from(screeners).where(eq(screeners.userId, userId));
  }

  async createScreener(screener: InsertScreener): Promise<Screener> {
    const [created] = await db
      .insert(screeners)
      .values(screener)
      .returning();
    return created;
  }

  async updateScreener(id: string, screener: InsertScreener): Promise<Screener> {
    const [updated] = await db
      .update(screeners)
      .set({ ...screener, updatedAt: new Date() })
      .where(eq(screeners.id, id))
      .returning();
    return updated;
  }

  async deleteScreener(id: string): Promise<void> {
    await db.delete(screeners).where(eq(screeners.id, id));
  }

  // Alert System - implementing basic structure
  async getUserAlertSettings(userId: string): Promise<AlertSetting[]> {
    return await db.select().from(alertSettings).where(eq(alertSettings.userId, userId));
  }

  async createAlertSetting(setting: InsertAlertSetting): Promise<AlertSetting> {
    const [created] = await db
      .insert(alertSettings)
      .values(setting)
      .returning();
    return created;
  }

  async updateAlertSetting(id: string, setting: Partial<InsertAlertSetting>): Promise<AlertSetting> {
    const [updated] = await db
      .update(alertSettings)
      .set({ ...setting, updatedAt: new Date() })
      .where(eq(alertSettings.id, id))
      .returning();
    return updated;
  }

  async deleteAlertSetting(id: string): Promise<void> {
    await db.delete(alertSettings).where(eq(alertSettings.id, id));
  }

  async getUserAlerts(userId: string): Promise<Alert[]> {
    return await db.select().from(alerts).where(eq(alerts.userId, userId));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [created] = await db
      .insert(alerts)
      .values(alert)
      .returning();
    return created;
  }

  async markAlertAsRead(id: string): Promise<void> {
    await db
      .update(alerts)
      .set({ isRead: true })
      .where(eq(alerts.id, id));
  }

  async markAllAlertsAsRead(userId: string): Promise<void> {
    await db
      .update(alerts)
      .set({ isRead: true })
      .where(eq(alerts.userId, userId));
  }

  async deleteAlert(id: string): Promise<void> {
    await db.delete(alerts).where(eq(alerts.id, id));
  }

  // Price Predictions - implementing basic structure
  async createPricePrediction(prediction: InsertPricePrediction): Promise<PricePrediction> {
    const [created] = await db
      .insert(pricePredictions)
      .values(prediction)
      .returning();
    return created;
  }

  async getPricePredictions(symbol?: string): Promise<PricePrediction[]> {
    if (symbol) {
      return await db.select().from(pricePredictions).where(eq(pricePredictions.symbol, symbol));
    }
    return await db.select().from(pricePredictions);
  }

  async updatePricePrediction(id: string, updates: Partial<PricePrediction>): Promise<boolean> {
    const result = await db
      .update(pricePredictions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pricePredictions.id, id));
    return result.count > 0;
  }

  async deletePricePrediction(id: string): Promise<boolean> {
    const result = await db.delete(pricePredictions).where(eq(pricePredictions.id, id));
    return result.count > 0;
  }

  // Strategy Recommender - implementing basic structure
  async getUserTradingPreferences(userId: string): Promise<UserTradingPreferences | undefined> {
    const [prefs] = await db.select().from(userTradingPreferences).where(eq(userTradingPreferences.userId, userId));
    return prefs || undefined;
  }

  async createUserTradingPreferences(preferences: InsertUserTradingPreferences): Promise<UserTradingPreferences> {
    const [created] = await db
      .insert(userTradingPreferences)
      .values(preferences)
      .returning();
    return created;
  }

  async updateUserTradingPreferences(userId: string, preferences: Partial<InsertUserTradingPreferences>): Promise<UserTradingPreferences> {
    const [updated] = await db
      .update(userTradingPreferences)
      .set({ ...preferences, updatedAt: new Date() })
      .where(eq(userTradingPreferences.userId, userId))
      .returning();
    return updated;
  }

  async getStrategyPerformance(userId: string, strategyId?: string): Promise<StrategyPerformance[]> {
    if (strategyId) {
      return await db.select().from(strategyPerformance)
        .where(eq(strategyPerformance.userId, userId));
    }
    return await db.select().from(strategyPerformance).where(eq(strategyPerformance.userId, userId));
  }

  async createStrategyPerformance(performance: InsertStrategyPerformance): Promise<StrategyPerformance> {
    const [created] = await db
      .insert(strategyPerformance)
      .values(performance)
      .returning();
    return created;
  }

  async getStrategyRecommendations(userId: string): Promise<StrategyRecommendation[]> {
    return await db.select().from(strategyRecommendations).where(eq(strategyRecommendations.userId, userId));
  }

  async createStrategyRecommendation(recommendation: InsertStrategyRecommendation): Promise<StrategyRecommendation> {
    const [created] = await db
      .insert(strategyRecommendations)
      .values(recommendation)
      .returning();
    return created;
  }

  async updateStrategyRecommendation(id: string, updates: Partial<InsertStrategyRecommendation>): Promise<StrategyRecommendation> {
    const [updated] = await db
      .update(strategyRecommendations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(strategyRecommendations.id, id))
      .returning();
    return updated;
  }

  async deleteStrategyRecommendation(id: string): Promise<void> {
    await db.delete(strategyRecommendations).where(eq(strategyRecommendations.id, id));
  }

  async getMarketOpportunities(userId?: string): Promise<MarketOpportunity[]> {
    return await db.select().from(marketOpportunities);
  }

  async createMarketOpportunity(opportunity: InsertMarketOpportunity): Promise<MarketOpportunity> {
    const [created] = await db
      .insert(marketOpportunities)
      .values(opportunity)
      .returning();
    return created;
  }

  async updateMarketOpportunity(id: string, updates: Partial<InsertMarketOpportunity>): Promise<MarketOpportunity> {
    const [updated] = await db
      .update(marketOpportunities)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(marketOpportunities.id, id))
      .returning();
    return updated;
  }

  async deleteMarketOpportunity(id: string): Promise<void> {
    await db.delete(marketOpportunities).where(eq(marketOpportunities.id, id));
  }

  // User preferences methods (in-memory for now, can be moved to database later)
  private userPreferencesMap = new Map<string, { tradingStyle: string; preferences: any }>();

  async getUserPreferences(userId: string): Promise<{ tradingStyle: string; preferences: any } | undefined> {
    return this.userPreferencesMap.get(userId);
  }

  async saveUserPreferences(userId: string, data: { tradingStyle: string; preferences: any }): Promise<void> {
    this.userPreferencesMap.set(userId, data);
  }
}

// Use DatabaseStorage for persistent PostgreSQL strategy storage
export const storage = new DatabaseStorage();
