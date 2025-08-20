import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

export interface BitgetConfig {
  apiKey: string;
  apiSecret: string;
  apiPassphrase: string;
  baseURL?: string;
}

export interface FuturesTickerData {
  symbol: string;
  lastPr: string;
  chgUTC: string;
  chg24h: string;
  volume24h: string;
  openInterest: string;
  fundingRate: string;
  nextFundingTime: string;
}

export interface AccountData {
  marginCoin: string;
  available: string;
  crossMaxAvailable: string;
  fixedMaxAvailable: string;
  maxTransferOut: string;
  equity: string;
  usdtEquity: string;
  btcEquity: string;
  crossRiskRate: string;
  unrealizedPL: string;
  bonus: string;
}

export interface PositionData {
  marginCoin: string;
  symbol: string;
  holdSide: string;
  openDelegateSize: string;
  marginSize: string;
  available: string;
  locked: string;
  total: string;
  leverage: string;
  achievedProfits: string;
  unrealizedPL: string;
  marginMode: string;
  posMode: string;
  unrealizedPLR: string;
  breakEvenPrice: string;
  markPrice: string;
  indexPrice: string;
  marginRatio: string;
  maintenanceMargin: string;
  initialMargin: string;
  holdMode: string;
  cTime: string;
  uTime: string;
}

export class BitgetAPI {
  private client: AxiosInstance;
  private config: BitgetConfig;

  constructor(config: BitgetConfig) {
    this.config = {
      ...config,
      baseURL: config.baseURL || 'https://api.bitget.com'
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: 30000,
    });

    this.client.interceptors.request.use((config) => {
      const timestamp = Date.now().toString();
      const method = config.method?.toUpperCase() || 'GET';
      const requestPath = config.url || '';
      const body = config.data ? JSON.stringify(config.data) : '';
      
      const message = timestamp + method + requestPath + body;
      const signature = crypto
        .createHmac('sha256', this.config.apiSecret)
        .update(message)
        .digest('base64');

      config.headers = {
        ...config.headers,
        'ACCESS-KEY': this.config.apiKey,
        'ACCESS-SIGN': signature,
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-PASSPHRASE': this.config.apiPassphrase,
        'Content-Type': 'application/json',
        'locale': 'en-US'
      };

      return config;
    });
  }

  async getAllFuturesTickers(): Promise<FuturesTickerData[]> {
    try {
      const response = await this.client.get('/api/v2/mix/market/tickers', {
        params: { productType: 'USDT-FUTURES' }
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching futures tickers:', error);
      throw new Error('Failed to fetch futures tickers from Bitget API');
    }
  }

  async getAccountInfo(): Promise<AccountData[]> {
    try {
      const response = await this.client.get('/api/v2/mix/account/accounts', {
        params: { productType: 'USDT-FUTURES' }
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching account info:', error);
      throw new Error('Failed to fetch account info from Bitget API');
    }
  }

  async getPositions(): Promise<PositionData[]> {
    try {
      const response = await this.client.get('/api/v2/mix/position/all-position', {
        params: { productType: 'USDT-FUTURES' }
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching positions:', error);
      throw new Error('Failed to fetch positions from Bitget API');
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/api/v2/public/time');
      return true;
    } catch (error) {
      console.error('Bitget API connection test failed:', error);
      return false;
    }
  }
}
