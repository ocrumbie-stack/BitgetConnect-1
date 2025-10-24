import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { PositionGuard, Side } from '../core/positionGuard';

// Shared guard for all Bitget entries
const positionGuard = new PositionGuard(10_000);

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

  private convertTimeframe(timeframe: string): string {
    // Convert standard timeframes to Bitget API format
    const timeframeMap: Record<string, string> = {
      '1m': '1m',
      '3m': '3m', 
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1H',
      '4h': '4H',
      '6h': '6H',
      '12h': '12H',
      '1d': '1D',
      '1w': '1W',
      '1M': '1M'
    };
    return timeframeMap[timeframe] || timeframe;
  }

  async getCandlestickData(symbol: string, granularity: string = '5m', limit: number = 100): Promise<CandlestickData[]> {
    try {
      const convertedGranularity = this.convertTimeframe(granularity);
      const response = await this.client.get('/api/v2/mix/market/candles', {
        params: {
          symbol,
          granularity: convertedGranularity,
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
  // Normalize the currently active position for a symbol, or null if none
  async getActivePositionForSymbol(symbol: string): Promise<{ side: Side; size: number } | null> {
    try {
      const positions = await this.getPositions();
      const pos = positions.find((p: any) => p.symbol === symbol && Number(p.total) > 0);
      if (!pos) return null;
      const side = (pos.holdSide as Side) || 'long';
      const size = Number(pos.total) || 0;
      return { side, size };
    } catch {
      return null;
    }
  }


  async getOrders(): Promise<any[]> {
    try {
      console.log('🔍 Fetching regular orders from Bitget API...');
      
      // Fetch regular pending orders first
      const regularOrdersResponse = await this.client.get('/api/v2/mix/order/orders-pending', {
        params: { productType: 'USDT-FUTURES' }
      });
      
      // Parse regular orders from entrustedList structure
      const regularOrdersList = regularOrdersResponse.data.data?.entrustedList || [];
      const regularOrders = Array.isArray(regularOrdersList) ? regularOrdersList : [];
      console.log(`📋 Found ${regularOrders.length} regular orders`);
      
      // Now try to fetch both TP/SL and trailing stop plan orders
      let planOrders: any[] = [];
      
      try {
        console.log('🔍 Fetching TP/SL plan orders...');
        const tpslOrdersResponse = await this.client.get('/api/v2/mix/order/orders-plan-pending', {
          params: { 
            productType: 'USDT-FUTURES',
            planType: 'profit_loss'  // Required parameter for TP/SL orders
          }
        });
        
        const tpslOrdersList = tpslOrdersResponse.data.data?.entrustedList || [];
        const tpslOrders = Array.isArray(tpslOrdersList) ? tpslOrdersList : [];
        console.log(`📋 Found ${tpslOrders.length} TP/SL plan orders`);
        planOrders = [...tpslOrders];
      } catch (tpslError) {
        console.log('⚠️ Could not fetch TP/SL plan orders:', (tpslError as any).response?.data?.msg || (tpslError as any).message);
      }
      
      try {
        console.log('🎯 Fetching trailing stop plan orders...');
        const trailingOrdersResponse = await this.client.get('/api/v2/mix/order/orders-plan-pending', {
          params: { 
            productType: 'USDT-FUTURES',
            planType: 'track_plan'  // Required parameter for trailing stop orders
          }
        });
        
        const trailingOrdersList = trailingOrdersResponse.data.data?.entrustedList || [];
        const trailingOrders = Array.isArray(trailingOrdersList) ? trailingOrdersList : [];
        console.log(`📋 Found ${trailingOrders.length} trailing stop orders`);
        planOrders = [...planOrders, ...trailingOrders];
      } catch (trailingError) {
        console.log('⚠️ Could not fetch trailing stop orders:', (trailingError as any).response?.data?.msg || (trailingError as any).message);
      }
      
      // Add type identifiers
      const typedRegularOrders = regularOrders.map(order => ({ ...order, orderCategory: 'regular' }));
      const typedPlanOrders = planOrders.map(order => ({ ...order, orderCategory: 'plan' }));
      
      const allOrders = [...typedRegularOrders, ...typedPlanOrders];
      console.log(`📊 Total orders returned: ${allOrders.length} (${regularOrders.length} regular + ${planOrders.length} plan)`);
      
      return allOrders;
    } catch (error) {
      console.error('❌ Error fetching regular orders:', error);
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

  async setLeverage(symbol: string, leverage: number, marginMode: 'isolated' | 'crossed' = 'isolated'): Promise<any> {
    try {
      const leverageData = {
        symbol,
        productType: 'USDT-FUTURES',
        marginCoin: 'USDT',
        leverage: leverage.toString(),
        holdSide: 'long' // Set leverage for both long and short positions
      };

      console.log(`⚙️ Setting leverage for ${symbol}: ${leverage}x (${marginMode})`);
      const response = await this.client.post('/api/v2/mix/account/set-leverage', leverageData);
      
      // Also set for short side
      const leverageDataShort = { ...leverageData, holdSide: 'short' };
      await this.client.post('/api/v2/mix/account/set-leverage', leverageDataShort);
      
      console.log(`✅ Leverage set successfully for ${symbol}: ${leverage}x`);
      return response.data;
    } catch (error: any) {
      console.error(`❌ Failed to set leverage for ${symbol}:`, error.response?.data || error.message);
      throw error;
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
    trailingStop?: string;
  }): Promise<any> {
    try {
      // Set leverage BEFORE placing order if specified
      if (orderParams.leverage) {
        console.log(`🔧 Setting leverage to ${orderParams.leverage}x before placing order`);
        try {
          await this.setLeverage(orderParams.symbol, orderParams.leverage);
        } catch (leverageError) {
          console.log(`⚠️ Leverage setting failed (may already be set):`, leverageError);
          // Continue with order placement even if leverage setting fails
          // (it might already be set correctly)
        }
      }

      // Get contract config for proper formatting (needed for all orders)
      let sizePrecision = 6; // Default fallback
      try {
        const contractConfigs = await this.getContractConfig(orderParams.symbol);
        const symbolConfig = contractConfigs.find((config: any) => config.symbol === orderParams.symbol);
        if (symbolConfig && symbolConfig.volumePlace) {
          sizePrecision = parseInt(symbolConfig.volumePlace);
          console.log(`📏 Size precision for ${orderParams.symbol}: ${sizePrecision} decimal places`);
        }
      } catch (error) {
        console.log(`⚠️ Could not fetch contract config, using default precision: ${sizePrecision}`);
      }
      
      // Format the size with proper precision
      const formattedSize = parseFloat(orderParams.size).toFixed(sizePrecision);

      // ---------- ONE-POSITION GUARD START ----------
      const mappedSide: Side = orderParams.side === 'buy' ? 'long' : 'short';
      // 0) Fast de-dupe & ping-pong protection
      if (!positionGuard.canEnter(orderParams.symbol, mappedSide)) {
        console.log('⛔ blocked_by_guard (cooldown or active)');
        return { ok: false, reason: 'blocked_by_guard' };
      }
      if (!positionGuard.begin(orderParams.symbol, mappedSide)) {
        console.log('⛔ already_locked (another entry in-flight)');
        return { ok: false, reason: 'already_locked' };
      }
      // 1) Double-check live position to avoid duplicates/opposites
      const __pos = await this.getActivePositionForSymbol(orderParams.symbol);
      if (__pos && __pos.size) {
        const reason = __pos.side === mappedSide ? 'same_side_already_open' : 'opposite_side_open';
        console.log(`⛔ ${reason} — symbol=${orderParams.symbol}, holdSide=${__pos.side}, size=${__pos.size}`);
        positionGuard.end(orderParams.symbol, mappedSide, 7000);
        return { ok: false, reason };
      }
      // ---------- ONE-POSITION GUARD END ----------

      // STEP 1: Always place the main order first to open/close the position
      console.log('🚀 Placing main order...');
      const orderData = {
        symbol: orderParams.symbol,
        productType: 'USDT-FUTURES',
        marginMode: 'isolated', // Required: 'isolated' or 'crossed'
        marginCoin: 'USDT',
        side: orderParams.side, // Use 'buy' or 'sell' directly
        tradeSide: 'open', // Always 'open' for new positions
        orderType: orderParams.orderType || 'market',
        size: formattedSize,
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

      console.log('🔧 Main order data for Bitget:', JSON.stringify(orderData, null, 2));
      const mainOrderResponse = await this.client.post('/api/v2/mix/order/place-order', orderData);
      console.log('✅ Main order placed successfully:', JSON.stringify(mainOrderResponse.data, null, 2));

      // STEP 2: If trailing stop is requested, place a separate trailing stop plan order
      if (orderParams.trailingStop) {
        console.log('🎯 Adding trailing stop plan order...');
        
        // Get current market price for trigger price calculation
        const allTickers = await this.getAllFuturesTickers();
        const symbolTicker = allTickers.find(ticker => ticker.symbol === orderParams.symbol);
        
        if (!symbolTicker) {
          console.log('⚠️ Could not find current price for trailing stop, skipping...');
          const __main = mainOrderResponse.data;
      positionGuard.end(orderParams.symbol, mappedSide, 7000);
      return __main; // Return main order success
        }
        
        const currentPrice = parseFloat(symbolTicker.lastPr);
        
        // For hedge mode, to close a position we need to create an opposite position
        // For a LONG position (buy side), we need to create a SHORT position (sell side) to offset it
        const holdSideForClosing = orderParams.side === 'buy' ? 'short' : 'long';
        const oppositeSide = orderParams.side === 'buy' ? 'sell' : 'buy';
        
        // Create PROPER trailing stop according to Bitget API docs
        const trailingStopData = {
          planType: 'track_plan', // CORRECT: track_plan for trailing stops per API docs
          symbol: orderParams.symbol,
          productType: 'USDT-FUTURES',
          marginMode: 'isolated',
          marginCoin: 'USDT',
          side: oppositeSide, // Opposite side to close the position  
          tradeSide: 'close', // This closes the existing position
          orderType: 'market', // Required for track_plan - must be market
          size: formattedSize,
          callbackRatio: orderParams.trailingStop, // Required for track_plan, max 10%
          triggerPrice: currentPrice.toString(), // Required trigger price
          triggerType: 'mark_price', // mark_price or fill_price
          reduceOnly: 'YES', // Reduce existing position only
          holdSide: orderParams.side === 'buy' ? 'long' : 'short', // CRITICAL: Specify which position we're closing
          // DON'T include price for track_plan - must be empty per docs
          clientOid: `trail_${Date.now()}` // Optional client order ID
        };

        console.log('🔧 Trailing stop plan order data:', JSON.stringify(trailingStopData, null, 2));
        
        try {
          const trailingStopResponse = await this.client.post('/api/v2/mix/order/place-plan-order', trailingStopData);
          console.log('✅ Trailing stop plan order placed successfully:', JSON.stringify(trailingStopResponse.data, null, 2));
          
          // Return combined response indicating both orders were placed
          const __result = {
            ...mainOrderResponse.data,
            trailingStopAdded: true,
            trailingStopOrderId: trailingStopResponse.data.data?.orderId
          };
          positionGuard.end(orderParams.symbol, mappedSide, 7000);
          return __result;
        } catch (trailingError: any) {
          console.log('⚠️ Trailing stop plan order failed, but main order succeeded:', trailingError.response?.data?.msg || trailingError.message);
          return {
            ...mainOrderResponse.data,
            trailingStopWarning: 'Main order placed successfully, but trailing stop failed: ' + (trailingError.response?.data?.msg || trailingError.message)
          };
        }
      }

      const __main = mainOrderResponse.data;
      positionGuard.end(orderParams.symbol, mappedSide, 7000);
      return __main;
    } catch (error: any) {
      // ensure guard is released on error
      try { positionGuard.end(orderParams.symbol, mappedSide, 7000); } catch {}
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
      let closeResponse: any;
      try {
        const flashCloseData = {
          symbol: symbol,
          productType: 'USDT-FUTURES',
          holdSide: currentPosition.holdSide
        };
        console.log('🚀 Trying flash close first:', JSON.stringify(flashCloseData, null, 2));
        
        closeResponse = await this.client.post('/api/v2/mix/order/close-positions', flashCloseData);
        console.log('✅ Flash close successful:', JSON.stringify(closeResponse.data, null, 2));
      } catch (flashError: any) {
        console.log('⚠️ Flash close failed, trying regular order:', flashError.response?.data?.msg || flashError.message);
        
        // Fall back to regular order placement
        const response = await this.client.post('/api/v2/mix/order/place-order', orderData);
        closeResponse = response;
      }

      // CRITICAL: After closing position, cancel any associated trailing stop orders
      console.log('🧹 Cleaning up orphaned trailing stop orders...');
      try {
        // Get all plan orders for this symbol
        const planOrders = await this.client.get(`/api/v2/mix/order/orders-plan-pending?symbol=${symbol}&productType=USDT-FUTURES&planType=track_plan`);
        const trailingStops = planOrders.data?.data || [];
        
        console.log(`🔍 Found ${trailingStops.length} trailing stop orders for ${symbol}`);
        
        if (trailingStops.length > 0) {
          const cancelPromises = trailingStops.map(async (order: any) => {
            try {
              console.log(`🗑️ Canceling orphaned trailing stop: ${order.orderId}`);
              await this.cancelPlanOrder(order.orderId, symbol, 'track_plan');
              return { orderId: order.orderId, status: 'canceled' };
            } catch (cancelError: any) {
              console.error(`❌ Failed to cancel trailing stop ${order.orderId}:`, cancelError.message);
              return { orderId: order.orderId, status: 'failed', error: cancelError.message };
            }
          });
          
          const cancelResults = await Promise.all(cancelPromises);
          console.log(`✅ Trailing stop cleanup completed:`, cancelResults);
          
          // Add cleanup results to response
          closeResponse.data.trailingStopCleanup = cancelResults;
        }
      } catch (cleanupError: any) {
        console.error('⚠️ Error during trailing stop cleanup:', cleanupError.message);
        // Don't fail the position close due to cleanup errors
      }

      return closeResponse.data;
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

  async cancelPlanOrder(orderId: string, symbol: string, planType: string = 'track_plan'): Promise<any> {
    try {
      console.log(`🗑️ Canceling plan order: ${orderId} (${symbol})`);
      
      const cancelData = {
        symbol: symbol,
        productType: 'USDT-FUTURES',
        marginCoin: 'USDT',
        planType: planType,
        orderId: orderId
      };

      console.log(`🔧 Cancel plan order data:`, JSON.stringify(cancelData, null, 2));

      const response = await this.client.post('/api/v2/mix/order/cancel-plan-order', cancelData);
      
      console.log(`✅ Plan order canceled:`, JSON.stringify(response.data, null, 2));
      return response.data;
      
    } catch (error: any) {
      console.error('❌ Error canceling plan order:', error.response?.data || error.message);
      throw error;
    }
  }

  async setPositionTPSL(params: { 
    symbol: string; 
    takeProfit?: string; 
    stopLoss?: string;
  }): Promise<any> {
    try {
      const { symbol, takeProfit, stopLoss } = params;
      console.log(`🎯 Setting TP/SL for ${symbol}: TP=${takeProfit}, SL=${stopLoss}`);

      // Get current position to determine side and size
      const positions = await this.getPositions();
      const position = positions.find((p: any) => p.symbol === symbol && Number(p.total) > 0);
      
      if (!position || !position.total || parseFloat(position.total) === 0) {
        throw new Error(`No active position found for ${symbol}`);
      }

      const holdSide = position.holdSide; // 'long' or 'short'
      const positionSize = position.total;
      
      console.log(`📊 Position details: side=${holdSide}, size=${positionSize}`);

      const results: any = { success: true, takeProfit: null, stopLoss: null };

      // Get size precision for the symbol
      let sizePrecision = 6;
      try {
        const contractConfigs = await this.getContractConfig(symbol);
        const symbolConfig = contractConfigs.find((config: any) => config.symbol === symbol);
        if (symbolConfig && symbolConfig.volumePlace) {
          sizePrecision = parseInt(symbolConfig.volumePlace);
        }
      } catch (error) {
        console.log(`⚠️ Could not fetch contract config, using default precision: ${sizePrecision}`);
      }

      const formattedSize = parseFloat(positionSize).toFixed(sizePrecision);

      // Place Take Profit plan order
      if (takeProfit) {
        try {
          const tpOrderData = {
            planType: 'profit_loss',
            symbol: symbol,
            productType: 'USDT-FUTURES',
            marginMode: 'isolated',
            marginCoin: 'USDT',
            side: holdSide === 'long' ? 'sell' : 'buy', // Opposite side to close
            tradeSide: 'close',
            orderType: 'market',
            size: formattedSize,
            triggerPrice: takeProfit,
            triggerType: 'mark_price',
            executePrice: '0', // Market execution
            reduceOnly: 'YES',
            holdSide: holdSide,
            clientOid: `tp_${Date.now()}`
          };

          console.log(`🎯 Take Profit plan order:`, JSON.stringify(tpOrderData, null, 2));
          const tpResponse = await this.client.post('/api/v2/mix/order/place-plan-order', tpOrderData);
          console.log(`✅ Take Profit order placed:`, JSON.stringify(tpResponse.data, null, 2));
          results.takeProfit = tpResponse.data;
        } catch (tpError: any) {
          console.error(`❌ Failed to place Take Profit:`, tpError.response?.data || tpError.message);
          results.takeProfitError = tpError.response?.data?.msg || tpError.message;
        }
      }

      // Place Stop Loss plan order
      if (stopLoss) {
        try {
          const slOrderData = {
            planType: 'profit_loss',
            symbol: symbol,
            productType: 'USDT-FUTURES',
            marginMode: 'isolated',
            marginCoin: 'USDT',
            side: holdSide === 'long' ? 'sell' : 'buy', // Opposite side to close
            tradeSide: 'close',
            orderType: 'market',
            size: formattedSize,
            triggerPrice: stopLoss,
            triggerType: 'mark_price',
            executePrice: '0', // Market execution
            reduceOnly: 'YES',
            holdSide: holdSide,
            clientOid: `sl_${Date.now()}`
          };

          console.log(`🛑 Stop Loss plan order:`, JSON.stringify(slOrderData, null, 2));
          const slResponse = await this.client.post('/api/v2/mix/order/place-plan-order', slOrderData);
          console.log(`✅ Stop Loss order placed:`, JSON.stringify(slResponse.data, null, 2));
          results.stopLoss = slResponse.data;
        } catch (slError: any) {
          console.error(`❌ Failed to place Stop Loss:`, slError.response?.data || slError.message);
          results.stopLossError = slError.response?.data?.msg || slError.message;
        }
      }

      // Return success if at least one order was placed
      if ((takeProfit && results.takeProfit) || (stopLoss && results.stopLoss)) {
        return results;
      } else {
        throw new Error('Failed to place TP/SL orders');
      }
    } catch (error: any) {
      console.error('❌ Error setting TP/SL:', error.response?.data || error.message);
      throw error;
    }
  }
}
