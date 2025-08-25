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
  change24h: string;
  quoteVolume: string;
  holdingAmount: string;
  fundingRate: string;
  high24h: string;
  low24h: string;
  baseVolume: string;
  markPrice: string;
  indexPrice: string;
}

export interface CandlestickData {
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  quoteVolume: string;
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
  // TP/SL fields returned by Bitget API
  takeProfit?: string;      // Take Profit price level  
  stopLoss?: string;        // Stop Loss price level
  takeProfitId?: string;    // Active TP order ID
  stopLossId?: string;      // Active SL order ID
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
      let requestPath = config.url || '';
      
      // Include query parameters in the request path for signature
      if (config.params) {
        const searchParams = new URLSearchParams();
        Object.keys(config.params).forEach(key => {
          if (config.params[key] !== undefined) {
            searchParams.append(key, config.params[key]);
          }
        });
        const queryString = searchParams.toString();
        if (queryString) {
          requestPath += '?' + queryString;
        }
      }
      
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
      } as any;

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

  async getCandlestickData(symbol: string, granularity: string = '5m', limit: number = 100): Promise<CandlestickData[]> {
    try {
      const response = await this.client.get('/api/v2/mix/market/candles', {
        params: {
          symbol,
          granularity,
          productType: 'USDT-FUTURES',
          limit
        }
      });
      
      const rawData = response.data.data || [];
      return rawData.map((candle: string[]) => ({
        timestamp: candle[0],
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5],
        quoteVolume: candle[6]
      }));
    } catch (error) {
      console.error(`Error fetching ${granularity} candlestick data for ${symbol}:`, error);
      throw new Error(`Failed to fetch candlestick data for ${symbol}`);
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

  async getOrders(): Promise<any[]> {
    try {
      const response = await this.client.get('/api/v2/mix/order/orders-pending', {
        params: { productType: 'USDT-FUTURES' }
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw new Error('Failed to fetch orders from Bitget API');
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

  async getContractConfig(symbol?: string): Promise<any> {
    try {
      const params: any = { productType: 'usdt-futures' };
      if (symbol) {
        params.symbol = symbol;
      }
      
      const response = await this.client.get('/api/v2/mix/market/contracts', { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching contract config:', error);
      throw new Error('Failed to fetch contract configuration');
    }
  }

  async placeOrder(orderParams: {
    symbol: string;
    side: 'buy' | 'sell';
    size: string;
    orderType?: 'market' | 'limit';
    price?: string;
    leverage?: number;
    takeProfit?: string;
    stopLoss?: string;
  }): Promise<any> {
    try {
      const orderData = {
        symbol: orderParams.symbol,
        productType: 'USDT-FUTURES',
        marginMode: 'isolated', // Required: 'isolated' or 'crossed'
        marginCoin: 'USDT',
        side: orderParams.side, // Use 'buy' or 'sell' directly
        tradeSide: 'open', // Always 'open' for new positions
        orderType: orderParams.orderType || 'market',
        size: orderParams.size,
        ...(orderParams.price && { price: orderParams.price }),
        // Take Profit / Stop Loss preset parameters (using correct Bitget API parameter names)
        ...(orderParams.takeProfit && { 
          presetStopSurplusPrice: orderParams.takeProfit // Correct name for TP
          // Note: Don't include executePrice for market execution
        }),
        ...(orderParams.stopLoss && { 
          presetStopLossPrice: orderParams.stopLoss // Correct name for SL  
          // Note: Don't include executePrice for market execution
        })
      };

      console.log('🔧 Final order data for Bitget:', JSON.stringify(orderData, null, 2));

      const response = await this.client.post('/api/v2/mix/order/place-order', orderData);
      return response.data;
    } catch (error: any) {
      console.error('Error placing order:', error.response?.data || error.message || error);
      
      // Handle different types of errors
      if (error.response?.data?.msg) {
        throw new Error(error.response.data.msg);
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Failed to place order - please check your API credentials and connection');
      }
    }
  }

  async closePosition(symbol: string, side: string): Promise<any> {
    try {
      console.log(`🔧 Closing position: ${symbol} ${side}`);
      
      // First, get the current position to determine the exact size
      const positions = await this.getPositions();
      console.log('📋 All positions from API:', JSON.stringify(positions, null, 2));
      
      // Try different matching strategies
      console.log('🔍 Looking for position with symbol:', symbol, 'side:', side);
      console.log('🔍 Available positions:', positions.map(p => ({ symbol: p.symbol, holdSide: p.holdSide, total: p.total })));
      
      let currentPosition = positions.find(pos => 
        pos.symbol === symbol && pos.holdSide === side
      );
      
      console.log('🔍 First match attempt result:', currentPosition ? 'FOUND' : 'NOT FOUND');
      
      if (!currentPosition) {
        // Try matching with lowercase
        currentPosition = positions.find(pos => 
          pos.symbol === symbol && pos.holdSide === side.toLowerCase()
        );
        console.log('🔍 Second match attempt (lowercase) result:', currentPosition ? 'FOUND' : 'NOT FOUND');
      }
      
      if (!currentPosition) {
        // Show available positions for debugging
        console.log('🔍 Available positions:', positions.map(p => `${p.symbol} ${p.holdSide} (size: ${p.total})`));
        throw new Error(`No ${side} position found for ${symbol}. Available positions: ${positions.map(p => `${p.symbol}:${p.holdSide}`).join(', ')}`);
      }
      
      if (parseFloat(currentPosition.total) === 0) {
        throw new Error(`Position ${symbol} ${side} has zero size`);
      }
      
      console.log('📊 Current position:', JSON.stringify(currentPosition, null, 2));
      
      // To close a position, we place an opposite order with 'close' tradeSide
      const oppositeSide = side === 'long' ? 'sell' : 'buy';
      
      // For hedge mode positions - use 'open' tradeSide with opposite holdSide to close via offsetting
      // This creates an opposite position that cancels out the existing one
      const orderData = {
        symbol: symbol,
        productType: 'USDT-FUTURES',
        marginMode: currentPosition.marginMode || 'isolated',
        marginCoin: 'USDT',
        side: oppositeSide,
        tradeSide: 'open', // Use 'open' in hedge mode
        orderType: 'market',
        size: currentPosition.total,
        holdSide: currentPosition.holdSide === 'long' ? 'short' : 'long' // Opposite holdSide to offset
      };

      // Check for any open orders first that might interfere
      try {
        const openOrders = await this.client.get(`/api/v2/mix/order/orders-pending?symbol=${symbol}&productType=USDT-FUTURES`);
        console.log('📝 Open orders for', symbol, ':', JSON.stringify(openOrders.data, null, 2));
      } catch (orderError: any) {
        console.log('⚠️ Could not fetch open orders:', orderError.message);
      }

      console.log('🔧 Close position order data:', JSON.stringify(orderData, null, 2));

      // Try the flash close position endpoint first (doesn't require additional margin)
      try {
        const flashCloseData = {
          symbol: symbol,
          productType: 'USDT-FUTURES',
          holdSide: currentPosition.holdSide
        };
        console.log('🚀 Trying flash close first:', JSON.stringify(flashCloseData, null, 2));
        
        const flashResponse = await this.client.post('/api/v2/mix/order/close-positions', flashCloseData);
        console.log('✅ Flash close successful:', JSON.stringify(flashResponse.data, null, 2));
        return flashResponse.data;
      } catch (flashError: any) {
        console.log('⚠️ Flash close failed, trying regular order:', flashError.response?.data?.msg || flashError.message);
        
        // Fall back to regular order placement
        const response = await this.client.post('/api/v2/mix/order/place-order', orderData);
        return response.data;
      }
    } catch (error: any) {
      console.error('❌ Error closing position:', error.response?.data || error.message || error);
      
      if (error.response?.data?.msg) {
        throw new Error(error.response.data.msg);
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Failed to close position');
      }
    }
  }
}
