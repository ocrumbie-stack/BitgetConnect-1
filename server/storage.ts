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
  type Bot,
  type InsertBot,
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
  
  getUserBots(userId: string): Promise<Bot[]>;
  createBot(bot: InsertBot): Promise<Bot>;
  updateBot(id: string, bot: Partial<InsertBot>): Promise<Bot>;
  deleteBot(id: string): Promise<void>;
  
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
  private bots: Map<string, Bot>;
  private screeners: Map<string, Screener>;

  constructor() {
    this.users = new Map();
    this.bitgetCredentials = new Map();
    this.futuresData = new Map();
    this.userPositions = new Map();
    this.accountInfo = new Map();
    this.bots = new Map();
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

  async getUserBots(userId: string): Promise<Bot[]> {
    return Array.from(this.bots.values()).filter(bot => bot.userId === userId);
  }

  async createBot(insertBot: InsertBot): Promise<Bot> {
    const id = randomUUID();
    const now = new Date();
    const bot: Bot = { 
      ...insertBot,
      id,
      status: insertBot.status || 'inactive',
      profit: insertBot.profit || '0',
      trades: insertBot.trades || '0',
      winRate: insertBot.winRate || '0',
      roi: insertBot.roi || '0',
      runtime: insertBot.runtime || '0',
      createdAt: now,
      updatedAt: now
    };
    this.bots.set(id, bot);
    return bot;
  }

  async updateBot(id: string, updates: Partial<InsertBot>): Promise<Bot> {
    const existingBot = this.bots.get(id);
    if (!existingBot) {
      throw new Error('Bot not found');
    }
    const updatedBot: Bot = { 
      ...existingBot, 
      ...updates,
      status: updates.status || existingBot.status,
      updatedAt: new Date()
    };
    this.bots.set(id, updatedBot);
    return updatedBot;
  }

  async deleteBot(id: string): Promise<void> {
    this.bots.delete(id);
  }
}

export const storage = new MemStorage();
