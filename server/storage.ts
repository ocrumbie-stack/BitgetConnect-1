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
  type InsertPricePrediction
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
}

export class MemStorage implements IStorage {
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
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
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
    data.forEach(item => {
      const id = randomUUID();
      const futuresItem: FuturesData = {
        ...item,
        id,
        change24h: item.change24h || null,
        volume24h: item.volume24h || null,
        fundingRate: item.fundingRate || null,
        openInterest: item.openInterest || null,
        contractType: item.contractType || null,
        lastUpdated: new Date()
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
    const strategy: BotStrategy = { 
      ...insertStrategy,
      id,
      riskLevel: insertStrategy.riskLevel,
      description: insertStrategy.description || null,
      createdAt: now,
      updatedAt: now
    };
    this.botStrategies.set(id, strategy);
    return strategy;
  }

  async updateBotStrategy(id: string, updates: Partial<InsertBotStrategy>): Promise<BotStrategy> {
    const existingStrategy = this.botStrategies.get(id);
    if (!existingStrategy) {
      throw new Error('Bot strategy not found');
    }
    const updatedStrategy: BotStrategy = { 
      ...existingStrategy, 
      ...updates,
      config: updates.config || existingStrategy.config,
      updatedAt: new Date()
    };
    this.botStrategies.set(id, updatedStrategy);
    return updatedStrategy;
  }

  async deleteBotStrategy(id: string): Promise<void> {
    this.botStrategies.delete(id);
  }

  async getBotExecutions(userId: string): Promise<BotExecution[]> {
    return Array.from(this.botExecutions.values()).filter(execution => execution.userId === userId);
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
    const screener: Screener = { 
      ...insertScreener,
      id,
      description: insertScreener.description || null,
      color: insertScreener.color || null,
      tradingPairs: insertScreener.tradingPairs || null,
      isStarred: insertScreener.isStarred || null,
      criteria: insertScreener.criteria || null,
      createdAt: now,
      updatedAt: now
    };
    this.screeners.set(id, screener);
    return screener;
  }

  async updateScreener(id: string, insertScreener: InsertScreener): Promise<Screener> {
    const existingScreener = this.screeners.get(id);
    if (!existingScreener) {
      throw new Error('Screener not found');
    }
    const updatedScreener: Screener = { 
      ...existingScreener,
      ...insertScreener,
      description: insertScreener.description || null,
      color: insertScreener.color || null,
      tradingPairs: insertScreener.tradingPairs || null,
      isStarred: insertScreener.isStarred || null,
      criteria: insertScreener.criteria || null,
      updatedAt: new Date()
    };
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
    const newSetting: AlertSetting = {
      id,
      ...setting,
      isEnabled: setting.isEnabled ?? null,
      threshold: setting.threshold || null,
      method: setting.method,
      config: setting.config || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.alertSettings.set(id, newSetting);
    return newSetting;
  }

  async updateAlertSetting(id: string, setting: Partial<InsertAlertSetting>): Promise<AlertSetting> {
    const existing = this.alertSettings.get(id);
    if (!existing) {
      throw new Error('Alert setting not found');
    }
    const updated: AlertSetting = {
      ...existing,
      ...setting,
      config: setting.config || existing.config,
      updatedAt: new Date(),
    };
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
    const newAlert: Alert = {
      id,
      ...alert,
      botExecutionId: alert.botExecutionId || null,
      severity: alert.severity,
      isRead: alert.isRead ?? null,
      isPinned: alert.isPinned ?? null,
      data: alert.data || null,
      createdAt: new Date(),
    };
    this.alerts.set(id, newAlert);
    return newAlert;
  }

  async markAlertAsRead(id: string): Promise<void> {
    const alert = this.alerts.get(id);
    if (alert) {
      alert.isRead = true;
      this.alerts.set(id, alert);
    }
  }

  async markAllAlertsAsRead(userId: string): Promise<void> {
    this.alerts.forEach((alert, id) => {
      if (alert.userId === userId && !alert.isRead) {
        alert.isRead = true;
        this.alerts.set(id, alert);
      }
    });
  }

  async deleteAlert(id: string): Promise<void> {
    this.alerts.delete(id);
  }

  // Price Predictions
  async createPricePrediction(prediction: InsertPricePrediction): Promise<PricePrediction> {
    const id = randomUUID();
    const newPrediction: PricePrediction = {
      id,
      ...prediction,
      timeframe: prediction.timeframe,
      aiAnalysis: prediction.aiAnalysis || null,
      accuracy: prediction.accuracy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
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
}

export const storage = new MemStorage();
