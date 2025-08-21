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
  type InsertScreener
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

  constructor() {
    this.users = new Map();
    this.bitgetCredentials = new Map();
    this.futuresData = new Map();
    this.userPositions = new Map();
    this.accountInfo = new Map();
    this.botStrategies = new Map();
    this.botExecutions = new Map();
    this.screeners = new Map();
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

  async getUserScreeners(userId: string): Promise<Screener[]> {
    return Array.from(this.screeners.values()).filter(
      screener => screener.userId === userId
    );
  }

  async createScreener(screener: InsertScreener): Promise<Screener> {
    const id = randomUUID();
    const savedScreener: Screener = {
      ...screener,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      criteria: screener.criteria as any
    };
    this.screeners.set(id, savedScreener);
    return savedScreener;
  }

  async updateScreener(id: string, screenerData: InsertScreener): Promise<Screener> {
    const existingScreener = this.screeners.get(id);
    if (!existingScreener) {
      throw new Error('Screener not found');
    }
    
    const updatedScreener: Screener = {
      ...existingScreener,
      ...screenerData,
      id,
      updatedAt: new Date(),
      criteria: screenerData.criteria as any
    };
    
    this.screeners.set(id, updatedScreener);
    return updatedScreener;
  }

  async deleteScreener(id: string): Promise<void> {
    this.screeners.delete(id);
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
      riskLevel: insertStrategy.riskLevel || 'medium',
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
      config: {
        ...existingStrategy.config,
        ...(updates.config || {})
      },
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
}

export const storage = new MemStorage();
