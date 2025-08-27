import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { BitgetAPI } from "./services/bitgetApi";
import { insertBitgetCredentialsSchema, insertFuturesDataSchema, insertBotStrategySchema, insertBotExecutionSchema, insertScreenerSchema, insertAlertSettingSchema, insertAlertSchema } from "@shared/schema";

let bitgetAPI: BitgetAPI | null = null;
let updateInterval: NodeJS.Timeout | null = null;

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Debug ALL requests
  app.use((req, res, next) => {
    console.log('🔍 REQUEST:', req.method, req.url);
    if (req.method === 'POST') {
      console.log('🌐🌐🌐 POST REQUEST DETECTED:', req.method, req.url);
      console.log('🌐🌐🌐 POST BODY:', JSON.stringify(req.body, null, 2));
    }
    next();
  });

  // Simple test POST endpoint
  app.post('/api/test', (req, res) => {
    console.log('🧪 TEST POST endpoint hit!');
    res.json({ success: true, message: 'Test endpoint works!' });
  });



  // Catch-all middleware for positions endpoints
  app.use('/api/positions/*', (req, res, next) => {
    console.log('🎯🎯🎯 POSITIONS ROUTE INTERCEPTED:', req.method, req.url);
    console.log('🎯🎯🎯 POSITIONS BODY:', req.body);
    next();
  });

  // IMMEDIATE ORDER ENDPOINT - Define this FIRST to prevent catch-all interference
  console.log('🔧 Registering POST /api/orders endpoint...');
  
  // DELETE endpoint for canceling orders (especially plan orders like trailing stops)
  app.delete('/api/orders/:orderId', async (req, res) => {
    console.log('🗑️ ORDER DELETE ENDPOINT - Processing cancel request');
    const { orderId } = req.params;
    const { symbol, planType } = req.query;
    
    try {
      console.log(`🎯 Canceling order: ${orderId} (symbol: ${symbol}, planType: ${planType})`);
      
      if (!bitgetAPI) {
        return res.status(500).json({ 
          success: false,
          message: 'Trading API not connected. Please check API settings.' 
        });
      }

      if (!symbol) {
        return res.status(400).json({ 
          success: false,
          message: 'Symbol is required to cancel plan orders' 
        });
      }

      const result = await bitgetAPI.cancelPlanOrder(orderId, symbol as string, planType as string || 'track_plan');
      
      console.log('✅ Order canceled successfully:', result);
      res.json({
        success: true,
        message: 'Order canceled successfully',
        data: result
      });

    } catch (error: any) {
      console.error('❌ Error canceling order:', error.message);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to cancel order',
        orderId: orderId
      });
    }
  });

  app.post('/api/orders', async (req, res) => {
    console.log('🎯 ORDER ENDPOINT - Processing trade request');
    console.log('📦 Order Data:', JSON.stringify(req.body, null, 2));
    
    try {
      const orderData = req.body;
      
      // Validate required fields
      if (!orderData.symbol || !orderData.side || !orderData.size) {
        console.log('❌ Missing required fields');
        return res.status(400).json({ 
          success: false,
          message: 'Missing required fields: symbol, side, size' 
        });
      }

      // Additional validation for limit orders
      if (orderData.orderType === 'limit' && (!orderData.price || orderData.price === '')) {
        console.log('❌ Limit order missing price');
        return res.status(400).json({ 
          success: false,
          message: 'Limit orders require a valid price' 
        });
      }

      console.log('✅ Order validation passed');

      // Check if Bitget API is connected
      if (!bitgetAPI) {
        console.log('❌ Bitget API not connected');
        return res.status(500).json({ 
          success: false,
          message: 'Trading API not connected. Please check API settings.' 
        });
      }

      // Set leverage if provided (optional - some exchanges handle this automatically)
      if (orderData.leverage) {
        console.log(`⚙️ Setting leverage to ${orderData.leverage}x for ${orderData.symbol}`);
        // Note: Leverage setting might be handled per position in Bitget
      }

      console.log('🚀 Placing REAL order via Bitget API...');
      
      // Get current price for conversion and validation
      const allTickers = await bitgetAPI.getAllFuturesTickers();
      const symbolTicker = allTickers.find(ticker => ticker.symbol === orderData.symbol);
      
      if (!symbolTicker) {
        console.log(`❌ Could not find price for ${orderData.symbol}`);
        return res.status(400).json({ 
          success: false,
          message: `Could not find current price for ${orderData.symbol}` 
        });
      }
      
      const currentPrice = parseFloat(symbolTicker.lastPr);
      console.log(`💱 Current price for ${orderData.symbol}: ${currentPrice} (precision: ${symbolTicker.lastPr})`);
      
      // Get contract configuration to determine proper price precision
      let pricePrecision = 6; // Default fallback
      try {
        const contractConfigs = await bitgetAPI.getContractConfig(orderData.symbol);
        const symbolConfig = contractConfigs.find(config => config.symbol === orderData.symbol);
        if (symbolConfig && symbolConfig.pricePlace) {
          pricePrecision = parseInt(symbolConfig.pricePlace);
          console.log(`📏 Price precision for ${orderData.symbol}: ${pricePrecision} decimal places`);
        }
      } catch (error) {
        console.log(`⚠️ Could not fetch contract config, using default precision: ${pricePrecision}`);
      }
      
      const inputAmount = parseFloat(orderData.size);
      
      let adjustedSize: string;
      let usdValue: number;
      
      // Handle different amount types with leverage calculation
      const leverage = orderData.leverage || 1;
      
      // Get proper size precision from contract config
      let sizePrecision = 6; // Default fallback
      try {
        const contractConfigs = await bitgetAPI.getContractConfig(orderData.symbol);
        const symbolConfig = contractConfigs.find(config => config.symbol === orderData.symbol);
        if (symbolConfig && symbolConfig.volumePlace) {
          sizePrecision = parseInt(symbolConfig.volumePlace);
          console.log(`📏 Size precision for ${orderData.symbol}: ${sizePrecision} decimal places`);
        }
      } catch (error) {
        console.log(`⚠️ Could not fetch contract config, using default precision: ${sizePrecision}`);
      }
      
      if (orderData.amountType === 'tokens') {
        // User entered token quantity directly
        adjustedSize = inputAmount.toFixed(sizePrecision);
        usdValue = inputAmount * currentPrice;
      } else {
        // User entered USD margin amount - calculate leveraged position size
        const marginAmount = inputAmount;
        const leveragedAmount = marginAmount * leverage;
        usdValue = leveragedAmount; // This is the actual position value
        const contractQuantity = leveragedAmount / currentPrice;
        adjustedSize = contractQuantity.toFixed(sizePrecision);
        console.log(`💰 Margin $${marginAmount} × ${leverage}x = $${leveragedAmount} position`);
      }
      
      // Ensure minimum order value of 5 USDT for Bitget
      if (usdValue < 5) {
        console.log(`⚖️ Order value $${usdValue.toFixed(2)} below 5 USDT minimum`);
        return res.status(400).json({ 
          success: false,
          message: 'Minimum order value is 5 USDT. Please increase your order size.' 
        });
      }
      
      // Calculate TP/SL prices if provided
      let takeProfitPrice: string | undefined;
      let stopLossPrice: string | undefined;

      // Map side values for Bitget API compatibility FIRST
      let bitgetSide: 'buy' | 'sell';
      if (orderData.side === 'long' || orderData.side === 'buy') {
        bitgetSide = 'buy';
      } else if (orderData.side === 'short' || orderData.side === 'sell') {
        bitgetSide = 'sell';
      } else {
        console.log(`❌ Invalid side value: ${orderData.side}`);
        return res.status(400).json({ 
          success: false,
          message: `Invalid side value: ${orderData.side}. Use 'buy', 'sell', 'long', or 'short'` 
        });
      }
      console.log(`🔄 Mapped side ${orderData.side} → ${bitgetSide}`);

      if (orderData.takeProfit) {
        console.log('💰 Processing Take Profit:', orderData.takeProfit);
        // If it looks like a percentage, convert to price
        if (parseFloat(orderData.takeProfit) < 100) {
          // Assume percentage - calculate price using CORRECT side mapping
          const tpPercentage = parseFloat(orderData.takeProfit) / 100;
          const multiplier = bitgetSide === 'buy' ? (1 + tpPercentage) : (1 - tpPercentage);
          const calculatedPrice = currentPrice * multiplier;
          // Round to correct decimal places based on symbol's precision requirements
          takeProfitPrice = calculatedPrice.toFixed(pricePrecision);
        } else {
          // Assume absolute price - format to correct decimal places
          takeProfitPrice = parseFloat(orderData.takeProfit).toFixed(pricePrecision);
        }
        console.log('💰 Take Profit Price:', takeProfitPrice);
      }

      if (orderData.stopLoss) {
        console.log('🛑 Processing Stop Loss:', orderData.stopLoss);
        // If it looks like a percentage, convert to price
        if (parseFloat(orderData.stopLoss) < 100) {
          // Assume percentage - calculate price using CORRECT side mapping
          const slPercentage = parseFloat(orderData.stopLoss) / 100;
          const multiplier = bitgetSide === 'buy' ? (1 - slPercentage) : (1 + slPercentage);
          const calculatedPrice = currentPrice * multiplier;
          // Round to correct decimal places based on symbol's precision requirements
          stopLossPrice = calculatedPrice.toFixed(pricePrecision);
        } else {
          // Assume absolute price - format to correct decimal places
          stopLossPrice = parseFloat(orderData.stopLoss).toFixed(pricePrecision);
        }
        console.log('🛑 Stop Loss Price:', stopLossPrice);
      }

      // Process trailing stop if provided
      let trailingStopCallbackRatio: string | undefined;
      
      if (orderData.trailingStop) {
        console.log('🎯 Processing Trailing Stop:', orderData.trailingStop);
        // Convert trailing stop to callback ratio (required by Bitget API)
        // If percentage (e.g., "2" for 2%), use directly as callback ratio
        // If price, convert to percentage based on current price
        const trailingStopValue = parseFloat(orderData.trailingStop);
        
        if (trailingStopValue >= 1 && trailingStopValue <= 10) {
          // Assume percentage - Bitget accepts 1-10% callback ratio
          trailingStopCallbackRatio = trailingStopValue.toString();
        } else {
          console.log(`⚠️ Trailing stop value ${trailingStopValue}% out of range (1-10%), adjusting...`);
          // Clamp to valid range
          trailingStopCallbackRatio = Math.max(1, Math.min(10, trailingStopValue)).toString();
        }
        console.log('🎯 Trailing Stop Callback Ratio:', trailingStopCallbackRatio);
      }

      // Place the actual order using Bitget API
      const realOrderResponse = await bitgetAPI.placeOrder({
        symbol: orderData.symbol,
        side: bitgetSide,
        size: adjustedSize,
        orderType: orderData.orderType || 'market',
        leverage: orderData.leverage,
        takeProfit: takeProfitPrice,
        stopLoss: stopLossPrice,
        trailingStop: trailingStopCallbackRatio
      });

      console.log('📤 Bitget API response:', JSON.stringify(realOrderResponse));

      // Return success response with real order data
      const successResponse = {
        orderId: realOrderResponse.data?.orderId || realOrderResponse.orderId || 'unknown',
        symbol: orderData.symbol,
        side: orderData.side,
        size: orderData.size,
        status: realOrderResponse.data?.status || 'submitted',
        message: '🎯 Real order placed successfully via Bitget!',
        bitgetResponse: realOrderResponse
      };
      
      console.log('✅ Real order placed successfully!');

      // If this is an AI bot order, create a bot execution record
      if (orderData.source === 'ai_bot_test' && orderData.botName) {
        try {
          console.log('🤖 Creating bot execution record for AI bot:', orderData.botName);
          
          // Create a simple strategy record first
          let strategy;
          try {
            strategy = await storage.createBotStrategy({
              userId: 'default-user',
              name: orderData.botName,
              description: `AI Bot: ${orderData.botName}`,
              strategy: 'ai',
              riskLevel: 'medium',
              config: {
                positionDirection: 'long',
                timeframe: '1h',
                entryConditions: [],
                exitConditions: [],
                indicators: {},
                riskManagement: {}
              }
            });
            console.log('✅ Created bot strategy:', strategy.id);
          } catch (strategyError) {
            console.log('ℹ️ Strategy might already exist, finding existing...');
            const strategies = await storage.getBotStrategies('default-user');
            strategy = strategies.find(s => s.name === orderData.botName);
            if (!strategy) {
              console.log('⚠️ Could not find existing strategy, creating new one...');
              throw strategyError;
            }
          }

          // Create bot execution record
          const execution = await storage.createBotExecution({
            userId: 'default-user',
            strategyId: strategy.id,
            tradingPair: orderData.symbol,
            status: 'active',
            capital: orderData.size || '10',
            leverage: orderData.leverage || '1',
            botName: orderData.botName,
            startedAt: new Date()
          });
          
          console.log('✅ Created bot execution record:', execution.id);
        } catch (botError) {
          console.error('⚠️ Failed to create bot execution record:', botError.message);
          // Don't fail the order, just log the error
        }
      }

      res.json(successResponse);
      
    } catch (error: any) {
      console.error('❌ Order placement error:', error);
      
      const errorMessage = error.message || 'Failed to place order';
      res.status(500).json({ 
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Initialize Bitget API if credentials are available
  const initializeBitgetAPI = async () => {
    try {
      const apiKey = process.env.BITGET_API_KEY;
      const apiSecret = process.env.BITGET_API_SECRET;
      const apiPassphrase = process.env.BITGET_API_PASSPHRASE;

      if (apiKey && apiSecret && apiPassphrase) {
        bitgetAPI = new BitgetAPI({
          apiKey,
          apiSecret,
          apiPassphrase
        });

        const isConnected = await bitgetAPI.testConnection();
        if (isConnected) {
          console.log('Bitget API connection established');
          startDataUpdates();
        } else {
          console.error('Bitget API connection failed');
        }
      }
    } catch (error) {
      console.error('Failed to initialize Bitget API:', error);
    }
  };

  // Start periodic data updates
  const startDataUpdates = () => {
    if (updateInterval) {
      clearInterval(updateInterval);
    }

    updateInterval = setInterval(async () => {
      if (!bitgetAPI) return;

      try {
        // Fetch and update futures data
        const tickers = await bitgetAPI.getAllFuturesTickers();
        const futuresData = tickers.map(ticker => ({
          symbol: ticker.symbol,
          price: ticker.lastPr,
          change24h: ticker.change24h,
          volume24h: ticker.quoteVolume,
          fundingRate: ticker.fundingRate,
          openInterest: ticker.holdingAmount,
          contractType: 'Perpetual'
        }));

        await storage.updateFuturesData(futuresData);

        // Broadcast updates to all connected WebSocket clients
        const data = JSON.stringify({
          type: 'futuresUpdate',
          data: futuresData
        });

        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(data);
          }
        });

      } catch (error) {
        console.error('Error updating futures data:', error);
      }
    }, 5000); // Update every 5 seconds
  };

  // WebSocket connection handling
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'subscribe') {
          // Send initial data
          const futuresData = await storage.getAllFuturesData();
          ws.send(JSON.stringify({
            type: 'futuresUpdate',
            data: futuresData
          }));
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  // Technical indicators endpoint for signals
  app.get('/api/signals/:symbol', async (req, res) => {
    try {
      if (!bitgetAPI) {
        return res.status(400).json({ message: 'Bitget API not configured' });
      }

      const { symbol } = req.params;
      
      // Get recent candle data for technical analysis
      const candleResponse = await bitgetAPI.client.get(`/api/v2/mix/market/candles?symbol=${symbol}&productType=USDT-FUTURES&granularity=1m&limit=50`);
      const candles = candleResponse.data.data;
      
      if (!candles || candles.length < 50) {
        return res.json({
          rsi: { status: 'neutral', value: 50 },
          macd: { status: 'neutral', signal: 'hold' },
          volume: { status: 'neutral', trend: 'stable' },
          ema: { status: 'neutral', ema20: 0, ema50: 0 }
        });
      }

      // Calculate RSI (14-period)
      const closes = candles.map((c: any) => parseFloat(c[4])).reverse();
      const rsi = calculateRSI(closes, 14);
      
      let rsiStatus = 'neutral';
      if (rsi < 30) rsiStatus = 'oversold';
      else if (rsi > 70) rsiStatus = 'overbought';

      // Calculate simple MACD approximation
      const ema12 = calculateEMA(closes, 12);
      const ema26 = calculateEMA(closes, 26);
      const macdLine = ema12 - ema26;
      
      let macdStatus = 'neutral';
      if (macdLine > 0) macdStatus = 'bullish';
      else if (macdLine < 0) macdStatus = 'bearish';

      // Calculate volume trend
      const volumes = candles.map((c: any) => parseFloat(c[5])).reverse();
      const recentVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
      const previousVolume = volumes.slice(-15, -10).reduce((a, b) => a + b, 0) / 5;
      
      let volumeStatus = 'neutral';
      if (recentVolume > previousVolume * 1.2) volumeStatus = 'rising';
      else if (recentVolume < previousVolume * 0.8) volumeStatus = 'falling';

      // Calculate EMA 20 and EMA 50
      const ema20 = calculateEMA(closes, 20);
      const ema50 = calculateEMA(closes, 50);
      
      let emaStatus = 'neutral';
      if (ema20 > ema50) emaStatus = 'bullish';
      else if (ema20 < ema50) emaStatus = 'bearish';

      res.json({
        rsi: { status: rsiStatus, value: Math.round(rsi * 100) / 100 },
        macd: { status: macdStatus, signal: macdStatus === 'bullish' ? 'buy' : macdStatus === 'bearish' ? 'sell' : 'hold' },
        volume: { status: volumeStatus, trend: volumeStatus },
        ema: { status: emaStatus, ema20: Math.round(ema20 * 100) / 100, ema50: Math.round(ema50 * 100) / 100 }
      });

    } catch (error: any) {
      console.error('❌ Error fetching signals:', error);
      res.status(500).json({ message: 'Failed to fetch signals' });
    }
  });

  // Helper functions for technical indicators
  function calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  function calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  // API Routes
  app.post('/api/credentials', async (req, res) => {
    try {
      const credentials = insertBitgetCredentialsSchema.parse(req.body);
      
      // Test the credentials before saving
      const testAPI = new BitgetAPI({
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        apiPassphrase: credentials.apiPassphrase
      });

      const isValid = await testAPI.testConnection();
      if (!isValid) {
        return res.status(400).json({ 
          message: 'Invalid Bitget API credentials' 
        });
      }

      const savedCredentials = await storage.saveBitgetCredentials(credentials);
      
      // Initialize API with new credentials
      bitgetAPI = testAPI;
      startDataUpdates();

      res.json({ 
        message: 'Credentials saved successfully',
        id: savedCredentials.id 
      });
    } catch (error: any) {
      res.status(400).json({ 
        message: error.message || 'Failed to save credentials' 
      });
    }
  });

  app.get('/api/futures', async (req, res) => {
    try {
      const futuresData = await storage.getAllFuturesData();
      res.json(futuresData);
    } catch (error: any) {
      res.status(500).json({ 
        message: error.message || 'Failed to fetch futures data' 
      });
    }
  });

  // Cache for 5-minute movers data
  let fiveMinMoversCache: {
    data: any;
    lastCalculatedInterval: number;
  } | null = null;

  // Helper function to get current 5-minute interval
  function getCurrentFiveMinInterval(): number {
    const now = new Date();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    // Calculate which 5-minute interval we're in (0, 5, 10, 15, etc.)
    const interval = Math.floor(minutes / 5) * 5;
    // Return timestamp of the start of this interval
    const intervalStart = new Date(now);
    intervalStart.setMinutes(interval, 0, 0); // Set to start of interval (seconds = 0, ms = 0)
    return intervalStart.getTime();
  }

  // Function to calculate 5-minute movers
  async function calculate5MinMovers() {
    if (!bitgetAPI) {
      throw new Error('Bitget API not configured');
    }

    console.log('Calculating 5-minute movers...');
    
    // Get current tickers first
    const tickers = await bitgetAPI.getAllFuturesTickers();
    // Use all available pairs for AI opportunities analysis
    const selectedSymbols = tickers
      .filter(t => parseFloat(t.quoteVolume) > 50000) // Lower volume threshold for more pairs
      .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume)) // Sort by volume
      .slice(0, 150); // Increased from 80 to 150 for comprehensive AI analysis
    
    console.log(`Processing ${selectedSymbols.length} trading pairs for 5-minute movers (balanced approach for performance)`);

    const fiveMinMovers: any[] = [];

    // Get 5-minute data for each symbol (selected pairs)
    for (const ticker of selectedSymbols) {
      try {
        const candleData = await bitgetAPI.getCandlestickData(ticker.symbol, '5m', 2);
        if (candleData.length >= 2) {
          const current = parseFloat(candleData[0].close);
          const previous = parseFloat(candleData[1].close);
          const change5m = ((current - previous) / previous);
          
          fiveMinMovers.push({
            symbol: ticker.symbol,
            price: ticker.lastPr,
            change5m: change5m.toString(),
            volume24h: ticker.quoteVolume,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        // Skip this symbol if candlestick data fails
        console.log(`Skipping ${ticker.symbol} - candlestick data unavailable`);
      }
    }

    // Sort and get top gainer/loser
    const gainers = fiveMinMovers
      .filter(m => parseFloat(m.change5m) > 0)
      .sort((a, b) => parseFloat(b.change5m) - parseFloat(a.change5m));
    
    const losers = fiveMinMovers
      .filter(m => parseFloat(m.change5m) < 0)
      .sort((a, b) => parseFloat(a.change5m) - parseFloat(b.change5m));

    return {
      topGainer: gainers[0] || null,
      topLoser: losers[0] || null,
      allMovers: fiveMinMovers,
      calculatedAt: new Date().toISOString()
    };
  }

  // Get market insights using existing data (no heavy API calls needed)
  app.get('/api/futures/market-insights', async (req, res) => {
    try {
      if (!bitgetAPI) {
        return res.status(400).json({ 
          message: 'Bitget API not configured' 
        });
      }

      // Get current tickers (single API call)
      const tickers = await bitgetAPI.getAllFuturesTickers();
      const validTickers = tickers.filter(t => parseFloat(t.quoteVolume) > 0);

      // Calculate various insights from existing data
      const insights = {
        // Volume surge detection
        volumeSurge: validTickers
          .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
          .slice(0, 5)
          .map(t => ({
            symbol: t.symbol,
            price: t.lastPr,
            volume24h: t.quoteVolume,
            change24h: parseFloat(t.change24h || '0').toFixed(2) + '%'
          })),

        // High volatility pairs (biggest movers)
        highVolatility: validTickers
          .sort((a, b) => Math.abs(parseFloat(b.change24h || '0')) - Math.abs(parseFloat(a.change24h || '0')))
          .slice(0, 5)
          .map(t => ({
            symbol: t.symbol,
            price: t.lastPr,
            change24h: parseFloat(t.change24h || '0').toFixed(2) + '%',
            volume24h: t.quoteVolume
          })),

        // Price breakouts (pairs with significant moves + high volume)
        breakouts: validTickers
          .filter(t => Math.abs(parseFloat(t.change24h || '0')) > 0.05 && parseFloat(t.quoteVolume) > 1000000)
          .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
          .slice(0, 5)
          .map(t => ({
            symbol: t.symbol,
            price: t.lastPr,
            change24h: parseFloat(t.change24h || '0').toFixed(2) + '%',
            volume24h: t.quoteVolume,
            type: parseFloat(t.change24h || '0') > 0 ? 'bullish' : 'bearish'
          })),

        // Top gainers and losers
        topGainer: validTickers
          .filter(t => parseFloat(t.change24h || '0') > 0)
          .sort((a, b) => parseFloat(b.change24h || '0') - parseFloat(a.change24h || '0'))[0],
        
        topLoser: validTickers
          .filter(t => parseFloat(t.change24h || '0') < 0)
          .sort((a, b) => parseFloat(a.change24h || '0') - parseFloat(b.change24h || '0'))[0],

        calculatedAt: new Date().toISOString(),
        totalPairs: validTickers.length
      };

      res.json(insights);
      
    } catch (error: any) {
      console.error('Error fetching market insights:', error);
      res.status(500).json({ 
        message: error.message || 'Failed to fetch market insights' 
      });
    }
  });

  app.get('/api/account/:userId', async (req, res) => {
    try {
      if (!bitgetAPI) {
        return res.status(400).json({ 
          message: 'Bitget API not configured' 
        });
      }

      const { userId } = req.params;
      
      // Fetch account info from Bitget
      const [accountData, positions] = await Promise.all([
        bitgetAPI.getAccountInfo(),
        bitgetAPI.getPositions()
      ]);



      // Calculate total margin used from all positions
      const totalMarginUsed = positions.reduce((sum, pos) => {
        return sum + parseFloat(pos.marginSize || '0');
      }, 0);

      // Update local storage
      if (accountData.length > 0) {
        const account = accountData[0];
        const availableBalance = parseFloat(account.available || '0');
        const unrealizedPnl = parseFloat(account.unrealizedPL || '0');
        
        // Use Bitget's actual equity field which already includes unrealized P&L
        const actualTotalEquity = parseFloat(account.accountEquity || '0');
        // Total Balance should match Bitget's accountEquity as it represents complete account value
        // accountEquity = availableBalance + marginUsed + unrealizedPnL
        const calculatedTotalBalance = actualTotalEquity;
        

        
        await storage.updateAccountInfo(userId, {
          userId,
          availableBalance: account.available,
          marginUsed: totalMarginUsed.toString(),
          unrealizedPnl: account.unrealizedPL,
          totalEquity: actualTotalEquity.toString(),
          totalBalance: calculatedTotalBalance.toString(),
          marginRatio: account.crossRiskRate,
          maintenanceMargin: '0' // This would need to be calculated
        });
      }

      // Calculate total achieved profits (realized P&L from closed trades)
      const totalAchievedProfits = positions.reduce((sum, pos) => {
        return sum + parseFloat(pos.achievedProfits || '0');
      }, 0);

      // Update positions
      const userPositions = positions.map(pos => ({
        userId,
        symbol: pos.symbol,
        side: pos.holdSide,
        size: pos.total,
        entryPrice: pos.openPriceAvg, // Use actual entry price instead of break-even price
        markPrice: pos.markPrice,
        pnl: pos.unrealizedPL,
        achievedProfits: pos.achievedProfits,
        margin: pos.marginSize,
        leverage: pos.leverage
      }));

      await storage.updateUserPositions(userId, userPositions);

      const accountInfo = await storage.getAccountInfo(userId);
      const storedPositions = await storage.getUserPositions(userId);

      res.json({
        account: accountInfo,
        positions: storedPositions,
        dailyPnL: {
          achieved: totalAchievedProfits,
          unrealized: parseFloat(accountData[0]?.unrealizedPL || '0'),
          total: totalAchievedProfits + parseFloat(accountData[0]?.unrealizedPL || '0')
        }
      });
    } catch (error: any) {
      res.status(500).json({ 
        message: error.message || 'Failed to fetch account data' 
      });
    }
  });

  // Close position endpoint
  app.post('/api/positions/close', async (req, res) => {
    console.log('🚨🚨🚨 CLOSE POSITION ROUTE HIT! 🚨🚨🚨');
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('Request body raw:', req.body);
    try {
      if (!bitgetAPI) {
        return res.status(400).json({ 
          message: 'Bitget API not configured' 
        });
      }

      const { symbol, side } = req.body;
      
      if (!symbol || !side) {
        return res.status(400).json({ 
          message: 'Missing required fields: symbol, side' 
        });
      }

      console.log('🚀 CLOSE POSITION REQUEST RECEIVED');
      console.log(`🔥 Closing ${side} position for ${symbol}`);
      console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
      
      // Also fetch and show current positions for comparison
      const currentPositions = await bitgetAPI.getPositions();
      console.log('📊 Current positions when closing:', JSON.stringify(currentPositions, null, 2));
      console.log('🔍 Looking for position:', { symbol, side });
      
      const closeResponse = await bitgetAPI.closePosition(symbol, side);
      
      console.log('✅ Close position response:', JSON.stringify(closeResponse, null, 2));
      
      res.json({
        success: true,
        message: `Position ${symbol} ${side} closed successfully`,
        data: closeResponse
      });
    } catch (error: any) {
      console.error('❌ Error closing position:', error);
      console.error('❌ Error details:', error.response?.data || error.message || error);
      res.status(500).json({ 
        message: error.message || 'Failed to close position' 
      });
    }
  });

  // Get orders endpoint
  app.get('/api/orders/:userId', async (req, res) => {
    try {
      console.log(`🔍 REQUEST: GET /api/orders/${req.params.userId}`);
      
      if (!bitgetAPI) {
        console.log('❌ Bitget API not configured');
        return res.status(400).json({ 
          message: 'Bitget API not configured' 
        });
      }

      const orders = await bitgetAPI.getOrders();
      console.log(`✅ Orders fetched successfully: ${orders.length} total orders`);
      res.json(orders);
    } catch (error: any) {
      console.log('❌ Error in orders endpoint:', error.message);
      res.status(500).json({ 
        message: error.message || 'Failed to fetch orders' 
      });
    }
  });

  app.get('/api/status', async (req, res) => {
    try {
      const isConnected = bitgetAPI ? await bitgetAPI.testConnection() : false;
      res.json({
        apiConnected: isConnected,
        lastUpdate: new Date().toISOString()
      });
    } catch (error) {
      res.json({
        apiConnected: false,
        lastUpdate: new Date().toISOString()
      });
    }
  });

  // Screener API routes
  app.get('/api/screeners', async (req, res) => {
    try {
      const userId = 'user1'; // Default user for now
      const screeners = await storage.getUserScreeners(userId);
      res.json(screeners);
    } catch (error: any) {
      res.status(500).json({ 
        message: error.message || 'Failed to fetch screeners' 
      });
    }
  });

  app.get('/api/screeners/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const screeners = await storage.getUserScreeners(userId);
      res.json(screeners);
    } catch (error: any) {
      res.status(500).json({ 
        message: error.message || 'Failed to fetch screeners' 
      });
    }
  });

  app.post('/api/screeners', async (req, res) => {
    try {
      const screenerData = insertScreenerSchema.parse(req.body);
      const screener = await storage.createScreener(screenerData);
      res.json(screener);
    } catch (error: any) {
      res.status(400).json({ 
        message: error.message || 'Failed to create screener' 
      });
    }
  });

  app.put('/api/screeners/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const screenerData = insertScreenerSchema.parse(req.body);
      const screener = await storage.updateScreener(id, screenerData);
      res.json(screener);
    } catch (error: any) {
      res.status(400).json({ 
        message: error.message || 'Failed to update screener' 
      });
    }
  });

  app.delete('/api/screeners/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteScreener(id);
      res.json({ message: 'Screener deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ 
        message: error.message || 'Failed to delete screener' 
      });
    }
  });

  // Bot strategy management routes
  app.get('/api/bot-strategies', async (req, res) => {
    try {
      const userId = 'default-user'; // In a real app, get from authentication
      const strategies = await storage.getBotStrategies(userId);
      res.json(strategies);
    } catch (error) {
      console.error('Error fetching bot strategies:', error);
      res.status(500).json({ error: 'Failed to fetch bot strategies' });
    }
  });

  app.post('/api/bot-strategies', async (req, res) => {
    try {
      const validatedData = insertBotStrategySchema.parse(req.body);
      const userId = 'default-user'; // In a real app, get from authentication
      
      const strategy = await storage.createBotStrategy({
        ...validatedData,
        userId
      });
      
      res.json(strategy);
    } catch (error) {
      console.error('Error creating bot strategy:', error);
      res.status(400).json({ error: 'Failed to create bot strategy' });
    }
  });

  app.put('/api/bot-strategies/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const strategy = await storage.updateBotStrategy(id, updates);
      res.json(strategy);
    } catch (error) {
      console.error('Error updating bot strategy:', error);
      res.status(400).json({ error: 'Failed to update bot strategy' });
    }
  });

  app.delete('/api/bot-strategies/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteBotStrategy(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting bot strategy:', error);
      res.status(400).json({ error: 'Failed to delete bot strategy' });
    }
  });

  // Bot execution management routes
  app.get('/api/bot-executions', async (req, res) => {
    try {
      const userId = 'default-user';
      
      // Get current positions from Bitget API
      if (!bitgetAPI) {
        return res.json([]);
      }

      const positions = await bitgetAPI.getPositions();
      console.log(`🤖 Bot executions - Found ${positions.length} positions`);
      console.log('📊 Position details:', positions.slice(0, 2)); // Log first 2 positions for debugging
      
      // Get deployed bots from database
      const deployedBots = await storage.getBotExecutions(userId);
      console.log(`📋 Deployed bots from storage: ${deployedBots.length}`);
      
      // Initialize with demo waiting bots if none exist
      if (deployedBots.length === 0) {
        const demoBots = [
          { tradingPair: 'ETHUSDT', botName: 'Smart Momentum', leverage: '3' },
          { tradingPair: 'SOLUSDT', botName: 'Smart Scalping Bot', leverage: '5' },
        ];
        
        for (const demoBot of demoBots) {
          try {
            await storage.createBotExecution({
              userId,
              strategyId: `strategy-${demoBot.tradingPair}`,
              tradingPair: demoBot.tradingPair,
              status: 'active',
              capital: '10',
              leverage: demoBot.leverage,
              profit: '0',
              trades: '0',
              winRate: '0',
              roi: '0',
              runtime: '0',
              deploymentType: 'manual',
              botName: demoBot.botName,
              startedAt: new Date(),
            });
            console.log(`🔧 Created demo waiting bot: ${demoBot.botName}`);
          } catch (error) {
            console.log(`⚠️ Demo bot already exists: ${demoBot.tradingPair}`);
          }
        }
        
        // Refresh deployed bots after adding demos
        const updatedDeployedBots = await storage.getBotExecutions(userId);
        console.log(`📋 Updated deployed bots: ${updatedDeployedBots.length}`);
        deployedBots.splice(0, deployedBots.length, ...updatedDeployedBots);
      }
      
      // Define AI bot mappings with exit criteria
      const botMappings = [
        { 
          symbol: 'BTCUSDT', 
          botName: 'Grid Trading Pro', 
          leverage: '2', 
          riskLevel: 'Medium',
          exitCriteria: {
            stopLoss: -5.0, // -5% loss
            takeProfit: 8.0, // +8% profit
            maxRuntime: 240, // 4 hours max
            exitStrategy: 'grid_rebalancing'
          }
        },
        { 
          symbol: 'ETHUSDT', 
          botName: 'Smart Momentum', 
          leverage: '3', 
          riskLevel: 'High',
          exitCriteria: {
            stopLoss: -4.0, // -4% loss  
            takeProfit: 12.0, // +12% profit
            maxRuntime: 180, // 3 hours max
            exitStrategy: 'momentum_reversal'
          }
        },
        { 
          symbol: 'SOLUSDT', 
          botName: 'Smart Scalping Bot', 
          leverage: '5', 
          riskLevel: 'High',
          exitCriteria: {
            stopLoss: -2.0, // -2% loss (tight scalping)
            takeProfit: 3.0, // +3% profit (quick scalp)
            maxRuntime: 60, // 1 hour max
            exitStrategy: 'scalp_quick_exit'
          }
        },
        { 
          symbol: 'BNBUSDT', 
          botName: 'Smart Arbitrage', 
          leverage: '2', 
          riskLevel: 'Low',
          exitCriteria: {
            stopLoss: -3.0, // -3% loss
            takeProfit: 5.0, // +5% profit
            maxRuntime: 360, // 6 hours max
            exitStrategy: 'arbitrage_spread_close'
          }
        },
        { 
          symbol: 'ADAUSDT', 
          botName: 'AI Dollar Cost Average', 
          leverage: '1', 
          riskLevel: 'Low',
          exitCriteria: {
            stopLoss: -8.0, // -8% loss (wider tolerance)
            takeProfit: 15.0, // +15% profit (longer hold)
            maxRuntime: 720, // 12 hours max
            exitStrategy: 'dca_accumulation'
          }
        },
        { 
          symbol: 'AVAXUSDT', 
          botName: 'Smart Swing Trader', 
          leverage: '3', 
          riskLevel: 'Medium',
          exitCriteria: {
            stopLoss: -6.0, // -6% loss
            takeProfit: 10.0, // +10% profit
            maxRuntime: 480, // 8 hours max
            exitStrategy: 'swing_trend_reversal'
          }
        },
        { 
          symbol: 'LTCUSDT', 
          botName: 'Test AI Bot', 
          leverage: '2', 
          riskLevel: 'Medium',
          exitCriteria: {
            stopLoss: -5.0, // -5% loss
            takeProfit: 7.0, // +7% profit
            maxRuntime: 120, // 2 hours max for testing
            exitStrategy: 'test_exit'
          }
        }
      ];

      // Create a comprehensive list of all bots (deployed + active)
      const allBots = [];
      
      // Add deployed bots from database (may include waiting bots)
      for (const deployedBot of deployedBots) {
        const position = positions.find((pos: any) => pos.symbol === deployedBot.tradingPair);
        const mapping = botMappings.find(m => m.symbol === deployedBot.tradingPair);
        
        if (position && mapping) {
          // Bot has an active position
          const runtime = deployedBot.startedAt 
            ? Math.floor((Date.now() - new Date(deployedBot.startedAt).getTime()) / 1000 / 60)
            : 30;

          // Calculate trading cycles completed
          const cycleMinutes = {
            'arbitrage_spread_close': 5, 'dca_accumulation': 15, 'swing_trend_reversal': 30,
            'test_exit': 10, 'grid_rebalancing': 20
          };
          const strategyCycleTime = cycleMinutes[mapping.exitCriteria.exitStrategy as keyof typeof cycleMinutes] || 15;
          const cyclesCompleted = Math.floor(runtime / strategyCycleTime);

          // Calculate ROI percentage based on profit vs total capital invested
          const entryPrice = parseFloat(position.openPriceAvg || '0');
          const markPrice = parseFloat(position.markPrice || '0');
          const leverage = parseFloat(position.leverage || '10');
          const totalCapital = parseFloat(deployedBot.capital || '0');
          const unrealizedPL = parseFloat(position.unrealizedPL || '0');
          
          // ROI = (Profit / Total Capital Invested) * 100
          let roiPercent = 0;
          if (totalCapital > 0) {
            roiPercent = (unrealizedPL / totalCapital) * 100;
          }
          
          // For exit criteria, still use price-based calculation for consistency with trading logic
          let priceBasedRoiPercent = 0;
          if (entryPrice > 0) {
            if (position.holdSide === 'long') {
              priceBasedRoiPercent = ((markPrice - entryPrice) / entryPrice) * 100 * leverage;
            } else {
              priceBasedRoiPercent = ((entryPrice - markPrice) / entryPrice) * 100 * leverage;
            }
          }

          // Check exit criteria using price-based ROI for consistency with trading logic
          const exitCriteria = mapping.exitCriteria;
          let exitTriggered = false;
          let exitReason = '';
          
          if (priceBasedRoiPercent <= exitCriteria.stopLoss) {
            exitTriggered = true;
            exitReason = `Stop Loss triggered (${priceBasedRoiPercent.toFixed(2)}% <= ${exitCriteria.stopLoss}%)`;
          } else if (priceBasedRoiPercent >= exitCriteria.takeProfit) {
            exitTriggered = true;
            exitReason = `Take Profit triggered (${priceBasedRoiPercent.toFixed(2)}% >= ${exitCriteria.takeProfit}%)`;
          } else if (runtime >= exitCriteria.maxRuntime) {
            exitTriggered = true;
            exitReason = `Max runtime reached (${runtime}m >= ${exitCriteria.maxRuntime}m)`;
          }

          allBots.push({
            id: deployedBot.id,
            userId: userId,
            strategyId: deployedBot.strategyId,
            tradingPair: deployedBot.tradingPair,
            status: exitTriggered ? 'exit_pending' : 'active',
            capital: deployedBot.capital,
            leverage: position.leverage || deployedBot.leverage,
            profit: position.unrealizedPL || position.pnl || '0',
            trades: cyclesCompleted.toString(),
            cycles: cyclesCompleted,
            cycleTime: `${strategyCycleTime}m`,
            winRate: position.unrealizedPL && parseFloat(position.unrealizedPL) > 0 ? '100' : '0',
            roi: roiPercent.toFixed(2),
            runtime: `${runtime}m`,
            deploymentType: deployedBot.deploymentType || 'manual',
            botName: deployedBot.botName || mapping.botName,
            riskLevel: mapping.riskLevel,
            startedAt: deployedBot.startedAt || deployedBot.createdAt,
            createdAt: deployedBot.createdAt,
            updatedAt: new Date(),
            exitCriteria: {
              stopLoss: `${exitCriteria.stopLoss}%`,
              takeProfit: `${exitCriteria.takeProfit}%`,
              maxRuntime: `${exitCriteria.maxRuntime}m`,
              strategy: exitCriteria.exitStrategy
            },
            exitTriggered,
            exitReason: exitTriggered ? exitReason : null,
            positionData: {
              unrealizedPL: position.unrealizedPL,
              holdSide: position.holdSide,
              total: position.total,
              openPriceAvg: position.openPriceAvg,
              markPrice: position.markPrice
            }
          });
        } else {
          // Bot is deployed but waiting for entry signal
          const runtime = deployedBot.startedAt 
            ? Math.floor((Date.now() - new Date(deployedBot.startedAt).getTime()) / 1000 / 60)
            : 0;

          allBots.push({
            id: deployedBot.id,
            userId: userId,
            strategyId: deployedBot.strategyId,
            tradingPair: deployedBot.tradingPair,
            status: 'waiting_entry',
            capital: deployedBot.capital,
            leverage: deployedBot.leverage,
            profit: '0',
            trades: '0',
            cycles: 0,
            cycleTime: '0m',
            winRate: '0',
            roi: '0.00',
            runtime: `${runtime}m`,
            deploymentType: deployedBot.deploymentType || 'manual',
            botName: deployedBot.botName || `Bot ${deployedBot.tradingPair}`,
            riskLevel: mapping?.riskLevel || 'Medium',
            startedAt: deployedBot.startedAt || deployedBot.createdAt,
            createdAt: deployedBot.createdAt,
            updatedAt: new Date(),
            exitCriteria: mapping ? {
              stopLoss: `${mapping.exitCriteria.stopLoss}%`,
              takeProfit: `${mapping.exitCriteria.takeProfit}%`,
              maxRuntime: `${mapping.exitCriteria.maxRuntime}m`,
              strategy: mapping.exitCriteria.exitStrategy
            } : null,
            exitTriggered: false,
            exitReason: null,
            positionData: null
          });
        }
      }

      // Add any positions that don't have corresponding deployed bots (legacy positions)
      for (const position of positions) {
        const hasDeployedBot = deployedBots.some(bot => bot.tradingPair === position.symbol);
        if (!hasDeployedBot) {
          const mapping = botMappings.find(m => m.symbol === position.symbol);
          if (mapping) {
            // This is a legacy position, create bot record
            const startTime = new Date(Date.now() - 30 * 60 * 1000);
            const runtime = 30;
            const strategyCycleTime = 15;
            const cyclesCompleted = Math.floor(runtime / strategyCycleTime);

            const entryPrice = parseFloat(position.openPriceAvg || '0');
            const markPrice = parseFloat(position.markPrice || '0');
            const leverage = parseFloat(position.leverage || '10');
            
            let roiPercent = 0;
            if (entryPrice > 0) {
              if (position.holdSide === 'long') {
                roiPercent = ((markPrice - entryPrice) / entryPrice) * 100 * leverage;
              } else {
                roiPercent = ((entryPrice - markPrice) / entryPrice) * 100 * leverage;
              }
            }

            allBots.push({
              id: `bot-${position.symbol}`,
              userId: userId,
              strategyId: `strategy-${position.symbol}`,
              tradingPair: position.symbol,
              status: 'active',
              capital: '10',
              leverage: position.leverage || '10',
              profit: position.unrealizedPL || '0',
              trades: cyclesCompleted.toString(),
              cycles: cyclesCompleted,
              cycleTime: `${strategyCycleTime}m`,
              winRate: position.unrealizedPL && parseFloat(position.unrealizedPL) > 0 ? '100' : '0',
              roi: roiPercent.toFixed(2),
              runtime: `${runtime}m`,
              deploymentType: 'manual',
              botName: mapping.botName,
              riskLevel: mapping.riskLevel,
              startedAt: startTime,
              createdAt: startTime,
              updatedAt: new Date(),
              exitCriteria: {
                stopLoss: `${mapping.exitCriteria.stopLoss}%`,
                takeProfit: `${mapping.exitCriteria.takeProfit}%`,
                maxRuntime: `${mapping.exitCriteria.maxRuntime}m`,
                strategy: mapping.exitCriteria.exitStrategy
              },
              exitTriggered: false,
              exitReason: null,
              positionData: {
                unrealizedPL: position.unrealizedPL,
                holdSide: position.holdSide,
                total: position.total,
                openPriceAvg: position.openPriceAvg,
                markPrice: position.markPrice
              }
            });
          }
        }
      }

      // Check for positions that need to be closed and execute exits
      const exitPendingBots = allBots.filter(bot => bot.exitTriggered);
      if (exitPendingBots.length > 0) {
        console.log(`🚨 Found ${exitPendingBots.length} bots with exit criteria triggered`);
        
        // Process each exit (but don't block the response)
        setImmediate(async () => {
          for (const bot of exitPendingBots) {
            try {
              console.log(`🔄 Executing exit for ${bot.tradingPair}: ${bot.exitReason}`);
              
              // Close the position using Bitget API
              if (bot.positionData) {
                await bitgetAPI.closePosition(bot.tradingPair, bot.positionData.holdSide);
                console.log(`✅ Successfully closed position for ${bot.tradingPair}`);
              }
              
            } catch (closeError) {
              console.error(`❌ Failed to close position for ${bot.tradingPair}:`, closeError);
            }
          }
        });
      }

      res.json(allBots);
    } catch (error) {
      console.error('Error fetching bot executions:', error);
      res.status(500).json({ error: 'Failed to fetch bot executions' });
    }
  });

  // Deploy new bot endpoint
  app.post('/api/deploy-bot', async (req, res) => {
    try {
      const { tradingPair, botName, capital = '10', leverage = '1' } = req.body;
      const userId = 'default-user';
      
      if (!tradingPair) {
        return res.status(400).json({ error: 'Trading pair is required' });
      }

      // Check if bot is already deployed for this pair
      const existingBots = await storage.getBotExecutions(userId);
      const existingBot = existingBots.find(bot => bot.tradingPair === tradingPair && bot.status !== 'inactive');
      
      if (existingBot) {
        return res.status(400).json({ error: `Bot already deployed for ${tradingPair}` });
      }

      // Create new bot execution record
      const newBot = await storage.createBotExecution({
        userId,
        strategyId: `strategy-${tradingPair}`,
        tradingPair,
        status: 'active', // Will show as waiting_entry if no position
        capital,
        leverage,
        profit: '0',
        trades: '0',
        winRate: '0',
        roi: '0',
        runtime: '0',
        deploymentType: 'manual',
        botName: botName || `Bot ${tradingPair}`,
        startedAt: new Date(),
      });

      console.log(`🚀 Deployed new bot: ${botName || tradingPair}`);
      res.json(newBot);
    } catch (error) {
      console.error('Error deploying bot:', error);
      res.status(500).json({ error: 'Failed to deploy bot' });
    }
  });

  // Manual bot termination endpoint
  app.post('/api/terminate-bot/:tradingPair', async (req, res) => {
    try {
      const { tradingPair } = req.params;
      const { reason = 'Manual termination' } = req.body;
      
      if (!bitgetAPI) {
        return res.status(400).json({ error: 'Bitget API not available' });
      }

      console.log(`🛑 Manual termination requested for ${tradingPair}: ${reason}`);
      
      // Get current position to find hold side
      const positions = await bitgetAPI.getPositions();
      const position = positions.find(pos => pos.symbol === tradingPair);
      
      if (!position) {
        return res.status(404).json({ error: 'Position not found' });
      }

      // Close the position
      await bitgetAPI.closePosition(tradingPair, position.holdSide);
      
      console.log(`✅ Successfully terminated bot for ${tradingPair}`);
      
      res.json({ 
        success: true, 
        message: `Bot terminated for ${tradingPair}`,
        reason: reason
      });
    } catch (error) {
      console.error('Error terminating bot:', error);
      res.status(500).json({ error: 'Failed to terminate bot' });
    }
  });

  // Get exit criteria for all bots
  app.get('/api/bot-exit-criteria', async (req, res) => {
    try {
      const botMappings = [
        { 
          symbol: 'BTCUSDT', 
          botName: 'Grid Trading Pro', 
          exitCriteria: {
            stopLoss: -5.0,
            takeProfit: 8.0, 
            maxRuntime: 240,
            exitStrategy: 'grid_rebalance'
          }
        },
        { 
          symbol: 'ETHUSDT', 
          botName: 'Smart Momentum', 
          exitCriteria: {
            stopLoss: -4.0,
            takeProfit: 12.0,
            maxRuntime: 180,
            exitStrategy: 'momentum_reversal'
          }
        },
        { 
          symbol: 'SOLUSDT', 
          botName: 'Smart Scalping Bot', 
          exitCriteria: {
            stopLoss: -2.0,
            takeProfit: 3.0,
            maxRuntime: 60,
            exitStrategy: 'scalp_quick_exit'
          }
        },
        { 
          symbol: 'BNBUSDT', 
          botName: 'Smart Arbitrage', 
          exitCriteria: {
            stopLoss: -3.0,
            takeProfit: 5.0,
            maxRuntime: 360,
            exitStrategy: 'arbitrage_spread_close'
          }
        },
        { 
          symbol: 'ADAUSDT', 
          botName: 'AI Dollar Cost Average', 
          exitCriteria: {
            stopLoss: -8.0,
            takeProfit: 15.0,
            maxRuntime: 720,
            exitStrategy: 'dca_accumulation'
          }
        },
        { 
          symbol: 'AVAXUSDT', 
          botName: 'Smart Swing Trader', 
          exitCriteria: {
            stopLoss: -6.0,
            takeProfit: 10.0,
            maxRuntime: 480,
            exitStrategy: 'swing_trend_reversal'
          }
        },
        { 
          symbol: 'LTCUSDT', 
          botName: 'Test AI Bot', 
          exitCriteria: {
            stopLoss: -5.0,
            takeProfit: 7.0,
            maxRuntime: 120,
            exitStrategy: 'test_exit'
          }
        }
      ];
      
      res.json(botMappings);
    } catch (error) {
      console.error('Error fetching exit criteria:', error);
      res.status(500).json({ error: 'Failed to fetch exit criteria' });
    }
  });

  // Sync positions to bot executions (utility endpoint)
  app.post('/api/sync-bots', async (req, res) => {
    try {
      const userId = 'default-user';
      console.log('🔄 Syncing positions to bot executions...');

      // Get current positions
      const positions = await storage.getUserPositions(userId);
      console.log(`📊 Found ${positions.length} active positions`);

      // Define AI bot mappings based on our test data
      const botMappings = [
        { symbol: 'BTCUSDT', botName: 'Grid Trading Pro', leverage: '2' },
        { symbol: 'ETHUSDT', botName: 'Smart Momentum', leverage: '3' },
        { symbol: 'SOLUSDT', botName: 'Smart Scalping Bot', leverage: '5' },
        { symbol: 'BNBUSDT', botName: 'Smart Arbitrage', leverage: '2' },
        { symbol: 'ADAUSDT', botName: 'AI Dollar Cost Average', leverage: '1' },
        { symbol: 'AVAXUSDT', botName: 'Smart Swing Trader', leverage: '3' }
      ];

      const createdExecutions = [];

      for (const position of positions) {
        const mapping = botMappings.find(m => m.symbol === position.symbol);
        if (mapping) {
          try {
            // Create simple strategy first
            let strategy;
            try {
              strategy = await storage.createBotStrategy({
                userId: userId,
                name: mapping.botName,
                description: `AI Bot: ${mapping.botName}`,
                strategy: 'ai',
                riskLevel: 'medium',
                config: {
                  positionDirection: 'long',
                  timeframe: '1h',
                  entryConditions: [],
                  exitConditions: [],
                  indicators: {},
                  riskManagement: {}
                }
              });
            } catch (strategyError) {
              // Try to find existing strategy
              const strategies = await storage.getBotStrategies(userId);
              strategy = strategies.find(s => s.name === mapping.botName);
              if (!strategy) {
                console.log(`⚠️ Could not create strategy for ${mapping.botName}, skipping...`);
                continue;
              }
            }

            // Create bot execution
            const execution = await storage.createBotExecution({
              userId: userId,
              strategyId: strategy.id,
              tradingPair: position.symbol,
              status: 'active',
              capital: '10',
              leverage: mapping.leverage,
              botName: mapping.botName,
              startedAt: new Date()
            });

            createdExecutions.push(execution);
            console.log(`✅ Created bot execution for ${mapping.botName} on ${position.symbol}`);
          } catch (error) {
            console.error(`❌ Failed to create bot execution for ${position.symbol}:`, error.message);
          }
        }
      }

      res.json({
        success: true,
        message: `Created ${createdExecutions.length} bot executions`,
        executions: createdExecutions
      });
    } catch (error) {
      console.error('Error syncing bots:', error);
      res.status(500).json({ error: 'Failed to sync bots' });
    }
  });

  app.post('/api/bot-executions', async (req, res) => {
    try {
      console.log('🤖 Creating bot execution with data:', JSON.stringify(req.body, null, 2));
      const validatedData = insertBotExecutionSchema.parse(req.body);
      console.log('✅ Validated bot execution data:', JSON.stringify(validatedData, null, 2));
      const userId = 'default-user'; // In a real app, get from authentication
      
      const execution = await storage.createBotExecution({
        ...validatedData,
        userId
      });
      
      console.log('🚀 Created bot execution:', JSON.stringify(execution, null, 2));
      res.json(execution);
    } catch (error) {
      console.error('Error creating bot execution:', error);
      res.status(400).json({ error: 'Failed to create bot execution' });
    }
  });

  app.put('/api/bot-executions/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const execution = await storage.updateBotExecution(id, updates);
      res.json(execution);
    } catch (error) {
      console.error('Error updating bot execution:', error);
      res.status(400).json({ error: 'Failed to update bot execution' });
    }
  });

  app.post('/api/bot-executions/:id/terminate', async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log(`🛑 Terminating bot execution: ${id}`);
      
      // First get the execution details
      const executions = await storage.getBotExecutions('default-user');
      const execution = executions.find(e => e.id === id);
      
      if (!execution) {
        return res.status(404).json({ error: 'Bot execution not found' });
      }
      
      // If we have bitget API, try to close any open position
      if (bitgetAPI && execution.tradingPair) {
        try {
          console.log(`🔄 Attempting to close position for ${execution.tradingPair}`);
          
          // Get current positions to check if there's an open position
          const positions = await bitgetAPI.getPositions();
          const openPosition = positions.find(p => 
            p.symbol === execution.tradingPair && 
            parseFloat(p.total) !== 0
          );
          
          if (openPosition) {
            console.log(`📊 Found open position for ${execution.tradingPair}, attempting to close`);
            
            // Close the position by placing an opposite order
            const closeOrderSide = openPosition.holdSide === 'long' ? 'close_long' : 'close_short';
            const closeSize = Math.abs(parseFloat(openPosition.total));
            
            if (closeSize > 0) {
              console.log(`🔄 Closing ${closeOrderSide} position of size ${closeSize} for ${execution.tradingPair}`);
              
              await bitgetAPI.placeOrder({
                symbol: execution.tradingPair,
                productType: 'usdt-futures',
                marginMode: 'isolated',
                marginCoin: 'USDT',
                size: closeSize.toString(),
                price: '', // Market order
                side: closeOrderSide,
                orderType: 'market',
                force: 'gtc',
                reduceOnly: 'YES'
              });
              
              console.log(`✅ Successfully closed position for ${execution.tradingPair}`);
            }
          } else {
            console.log(`ℹ️ No open position found for ${execution.tradingPair}`);
          }
        } catch (positionError) {
          console.error(`❌ Failed to close position for ${execution.tradingPair}:`, positionError.message);
          // Continue with termination even if position closing fails
        }
      }
      
      // Update the execution status to terminated
      const updatedExecution = await storage.updateBotExecution(id, { 
        status: 'terminated',
        pausedAt: new Date()
      });
      
      console.log(`✅ Bot execution ${id} terminated successfully`);
      res.json(updatedExecution);
    } catch (error) {
      console.error('Error terminating bot execution:', error);
      res.status(500).json({ error: 'Failed to terminate bot execution' });
    }
  });

  // Terminate all bots in a folder
  app.post('/api/bot-executions/terminate-folder/:folderName', async (req, res) => {
    try {
      const { folderName } = req.params;
      const { userId = 'default-user' } = req.body;
      
      console.log(`Terminating all bots in folder: ${folderName} for user: ${userId}`);
      
      // Get all executions for this folder that are currently active
      const allExecutions = await storage.getBotExecutions(userId);
      const folderExecutions = allExecutions.filter(ex => 
        ex.folderName === folderName && ex.status === 'active'
      );
      
      console.log(`Found ${folderExecutions.length} active executions to terminate`);
      
      // Terminate all executions in the folder
      const updatedExecutions = [];
      for (const execution of folderExecutions) {
        const updated = await storage.updateBotExecution(execution.id, { status: 'terminated' });
        updatedExecutions.push(updated);
        console.log(`Terminated execution ${execution.id} for pair ${execution.tradingPair}`);
      }
      
      res.json({ 
        message: `Terminated ${updatedExecutions.length} bots in folder ${folderName}`,
        executions: updatedExecutions 
      });
    } catch (error) {
      console.error('Error terminating folder bots:', error);
      res.status(500).json({ error: 'Failed to terminate folder bots' });
    }
  });

  app.delete('/api/bot-executions/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteBotExecution(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting bot execution:', error);
      res.status(400).json({ error: 'Failed to delete bot execution' });
    }
  });

  // Alert System API Routes
  app.get('/api/alert-settings/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const settings = await storage.getUserAlertSettings(userId);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ 
        message: error.message || 'Failed to fetch alert settings' 
      });
    }
  });

  app.post('/api/alert-settings', async (req, res) => {
    try {
      const settingData = insertAlertSettingSchema.parse(req.body);
      const setting = await storage.createAlertSetting(settingData);
      res.json(setting);
    } catch (error: any) {
      res.status(400).json({ 
        message: error.message || 'Failed to create alert setting' 
      });
    }
  });

  app.put('/api/alert-settings/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const setting = await storage.updateAlertSetting(id, updates);
      res.json(setting);
    } catch (error: any) {
      res.status(400).json({ 
        message: error.message || 'Failed to update alert setting' 
      });
    }
  });

  app.delete('/api/alert-settings/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAlertSetting(id);
      res.json({ message: 'Alert setting deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ 
        message: error.message || 'Failed to delete alert setting' 
      });
    }
  });

  app.get('/api/alerts/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const alerts = await storage.getUserAlerts(userId);
      res.json(alerts);
    } catch (error: any) {
      res.status(500).json({ 
        message: error.message || 'Failed to fetch alerts' 
      });
    }
  });

  app.post('/api/alerts', async (req, res) => {
    try {
      const alertData = insertAlertSchema.parse(req.body);
      const alert = await storage.createAlert(alertData);
      
      // Broadcast alert to WebSocket clients for real-time notifications
      const data = JSON.stringify({
        type: 'newAlert',
        data: alert
      });

      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });

      res.json(alert);
    } catch (error: any) {
      res.status(400).json({ 
        message: error.message || 'Failed to create alert' 
      });
    }
  });

  app.put('/api/alerts/:id/read', async (req, res) => {
    try {
      const { id } = req.params;
      await storage.markAlertAsRead(id);
      res.json({ message: 'Alert marked as read' });
    } catch (error: any) {
      res.status(500).json({ 
        message: error.message || 'Failed to mark alert as read' 
      });
    }
  });

  app.put('/api/alerts/:userId/read-all', async (req, res) => {
    try {
      const { userId } = req.params;
      await storage.markAllAlertsAsRead(userId);
      res.json({ message: 'All alerts marked as read' });
    } catch (error: any) {
      res.status(500).json({ 
        message: error.message || 'Failed to mark all alerts as read' 
      });
    }
  });

  app.delete('/api/alerts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAlert(id);
      res.json({ message: 'Alert deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ 
        message: error.message || 'Failed to delete alert' 
      });
    }
  });

  // Personalized Strategy Recommender API Routes
  
  // Trading Preferences
  app.get('/api/trading-preferences/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const preferences = await storage.getUserTradingPreferences(userId);
      
      if (!preferences) {
        // Return default preferences if none exist
        const defaultPrefs = {
          userId,
          riskTolerance: 'moderate',
          tradingExperience: 'intermediate',
          preferredTimeframes: ['4h', '1d'],
          tradingStyle: 'swing',
          preferredStrategies: ['momentum', 'trend_following'],
          maxLeverage: 3,
          maxPositionSize: 10,
          stopLossPreference: 2,
          takeProfitPreference: 5,
          preferredMarkets: ['major_pairs'],
          avoidPatterns: [],
          tradingHours: {
            timezone: 'UTC',
            activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            activeHours: [{ start: '09:00', end: '17:00' }],
            pauseDuringNews: false
          }
        };
        res.json(defaultPrefs);
        return;
      }
      
      res.json(preferences);
    } catch (error: any) {
      res.status(500).json({ 
        message: error.message || 'Failed to fetch trading preferences' 
      });
    }
  });

  app.put('/api/trading-preferences/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const preferences = await storage.updateUserTradingPreferences(userId, req.body);
      res.json(preferences);
    } catch (error: any) {
      res.status(400).json({ 
        message: error.message || 'Failed to update trading preferences' 
      });
    }
  });

  // Strategy Recommendations
  app.get('/api/strategy-recommendations/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const recommendations = await storage.getStrategyRecommendations(userId);
      res.json(recommendations);
    } catch (error: any) {
      res.status(500).json({ 
        message: error.message || 'Failed to fetch strategy recommendations' 
      });
    }
  });

  app.post('/api/strategy-recommendations/generate', async (req, res) => {
    try {
      const { userId } = req.body;
      
      // Generate sample recommendations based on current market conditions
      const futuresData = await storage.getAllFuturesData();
      const userPrefs = await storage.getUserTradingPreferences(userId);
      
      // Create sample recommendations
      const recommendations = await generateSampleRecommendations(userId, futuresData, userPrefs);
      
      for (const rec of recommendations) {
        await storage.createStrategyRecommendation(rec);
      }
      
      res.json({ message: `Generated ${recommendations.length} new recommendations`, count: recommendations.length });
    } catch (error: any) {
      res.status(500).json({ 
        message: error.message || 'Failed to generate recommendations' 
      });
    }
  });

  app.post('/api/strategy-recommendations/:id/accept', async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateStrategyRecommendation(id, { 
        status: 'accepted',
        implementedAt: new Date()
      });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ 
        message: error.message || 'Failed to accept recommendation' 
      });
    }
  });

  // Market Opportunities
  app.get('/api/market-opportunities', async (req, res) => {
    try {
      const { userId } = req.query;
      const opportunities = await storage.getMarketOpportunities(userId as string);
      res.json(opportunities);
    } catch (error: any) {
      res.status(500).json({ 
        message: error.message || 'Failed to fetch market opportunities' 
      });
    }
  });

  // Strategy Performance
  app.get('/api/strategy-performance/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { strategyId } = req.query;
      const performance = await storage.getStrategyPerformance(userId, strategyId as string);
      res.json(performance);
    } catch (error: any) {
      res.status(500).json({ 
        message: error.message || 'Failed to fetch strategy performance' 
      });
    }
  });

  // Initialize sample data on startup
  await initializeBitgetAPI();
  await initializeSampleData();

  return httpServer;

  // Helper function to generate sample recommendations
  async function generateSampleRecommendations(userId: string, marketData: any[], userPrefs: any) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    
    const recommendations = [];
    
    // High-performance momentum opportunity
    if (marketData && marketData.length > 0) {
      const strongPair = marketData.find(p => Math.abs(parseFloat(p.change24h || '0')) > 0.05);
      if (strongPair) {
        recommendations.push({
          userId,
          recommendationType: 'market_opportunity',
          title: `Momentum Strategy: ${strongPair.symbol}`,
          description: `Strong momentum detected in ${strongPair.symbol} with ${(parseFloat(strongPair.change24h || '0') * 100).toFixed(2)}% 24h change. Recommended for experienced traders.`,
          confidenceScore: 85,
          priority: 'high',
          strategyConfig: {
            strategyType: 'momentum',
            tradingPairs: [strongPair.symbol],
            timeframes: ['1h', '4h'],
            capitalAllocation: 15,
            leverage: userPrefs?.maxLeverage || 3,
            riskManagement: {
              stopLoss: 2.5,
              takeProfit: 6.0,
              maxPositionSize: userPrefs?.maxPositionSize || 10
            },
            indicators: {
              primary: ['RSI', 'MACD'],
              secondary: ['Volume', 'MA_20']
            },
            entryConditions: [
              { indicator: 'RSI', operator: '<', value: 30, weight: 0.4 },
              { indicator: 'MACD', operator: '>', value: 0, weight: 0.6 }
            ],
            exitConditions: [
              { indicator: 'RSI', operator: '>', value: 70, weight: 0.5 },
              { indicator: 'Stop_Loss', operator: 'trigger', value: 2.5, weight: 1.0 }
            ]
          },
          reasoning: {
            marketAnalysis: [
              `${strongPair.symbol} showing strong directional momentum`,
              'High volume confirming price movement',
              'Technical indicators aligned with trend'
            ],
            userProfileMatch: [
              'Matches your preferred momentum strategy',
              'Suitable for your risk tolerance level',
              'Fits your maximum leverage preference'
            ],
            historicalPerformance: [
              'Similar setups showed 68% win rate historically',
              'Average return: +12.4% over 3-7 days',
              'Low correlation with other positions'
            ],
            riskAssessment: [
              'Moderate risk due to volatility',
              'Protected by tight stop loss',
              'Position sizing limits exposure'
            ],
            opportunityFactors: [
              'Fresh breakout with volume confirmation',
              'Support/resistance levels clearly defined',
              'Market sentiment aligned with direction'
            ]
          },
          expectedOutcome: {
            expectedROI: 8.5,
            expectedWinRate: 68,
            estimatedDuration: 120,
            riskLevel: 'medium',
            confidenceInterval: { min: 4.2, max: 15.8 }
          },
          status: 'pending',
          expiresAt
        });
      }
    }

    // Portfolio rebalancing recommendation
    recommendations.push({
      userId,
      recommendationType: 'portfolio_rebalance',
      title: 'Portfolio Diversification Opportunity',
      description: 'Consider diversifying across different market sectors to reduce correlation risk and improve risk-adjusted returns.',
      confidenceScore: 72,
      priority: 'medium',
      strategyConfig: {
        strategyType: 'diversification',
        tradingPairs: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT'],
        timeframes: ['4h', '1d'],
        capitalAllocation: 40,
        leverage: 2,
        riskManagement: {
          stopLoss: 3.0,
          takeProfit: 8.0,
          maxPositionSize: 8
        },
        indicators: {
          primary: ['Trend_Strength', 'Correlation'],
          secondary: ['Volume_Profile', 'Support_Resistance']
        },
        entryConditions: [
          { indicator: 'Trend_Strength', operator: '>', value: 0.6, weight: 0.5 },
          { indicator: 'Correlation', operator: '<', value: 0.5, weight: 0.5 }
        ],
        exitConditions: [
          { indicator: 'Trend_Strength', operator: '<', value: 0.3, weight: 0.4 },
          { indicator: 'Take_Profit', operator: 'trigger', value: 8.0, weight: 0.6 }
        ]
      },
      reasoning: {
        marketAnalysis: [
          'Different sectors showing varying performance',
          'Low correlation between selected assets',
          'Market regime favors diversified approach'
        ],
        userProfileMatch: [
          'Aligns with your swing trading style',
          'Matches moderate risk tolerance',
          'Suitable for your available capital'
        ],
        historicalPerformance: [
          'Diversified portfolios outperformed by 23%',
          'Reduced maximum drawdown by 31%',
          'More consistent returns over time'
        ],
        riskAssessment: [
          'Lower overall portfolio volatility',
          'Reduced single-asset concentration risk',
          'Better risk-adjusted returns'
        ],
        opportunityFactors: [
          'Current market conditions favor diversification',
          'Multiple sectors showing strength',
          'Correlation levels are optimal for diversification'
        ]
      },
      expectedOutcome: {
        expectedROI: 12.3,
        expectedWinRate: 74,
        estimatedDuration: 240,
        riskLevel: 'low',
        confidenceInterval: { min: 8.1, max: 18.7 }
      },
      status: 'pending',
      expiresAt
    });

    return recommendations;
  }

  // Duplicate order endpoint removed - using the one defined at the top

  // Initialize sample market opportunities
  async function initializeSampleData() {
    try {
      const existingOpportunities = await storage.getMarketOpportunities();
      
      if (existingOpportunities.length === 0) {
        const futuresData = await storage.getAllFuturesData();
        
        if (futuresData && futuresData.length > 0) {
          const sampleOpportunities = [
            {
              symbol: 'BTCUSDT',
              opportunityType: 'breakout',
              timeframe: '4h',
              strength: 78,
              confidence: 85,
              description: 'Bitcoin approaching resistance level with strong volume. Potential breakout setup with good risk/reward ratio.',
              analysis: {
                technicalFactors: [
                  { indicator: 'RSI', value: 65, signal: 'bullish', weight: 0.3 },
                  { indicator: 'MACD', value: 0.02, signal: 'bullish', weight: 0.25 },
                  { indicator: 'Volume', value: 1.8, signal: 'bullish', weight: 0.2 }
                ],
                fundamentalFactors: ['Institutional adoption increasing', 'Regulatory clarity improving'],
                marketContext: {
                  volume: 1.8,
                  volatility: 0.65,
                  trend: 'bullish',
                  sentiment: 'bullish'
                },
                entryZone: { min: 114800, max: 115200, optimal: 115000 },
                targets: [116500, 118000, 120000],
                stopLoss: 113500
              },
              recommendedStrategies: ['momentum', 'breakout'],
              suitableForUsers: ['moderate', 'aggressive'],
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              isActive: true
            },
            {
              symbol: 'ETHUSDT',
              opportunityType: 'reversal',
              timeframe: '1h',
              strength: 72,
              confidence: 78,
              description: 'Ethereum showing oversold conditions with potential for reversal. Good opportunity for contrarian traders.',
              analysis: {
                technicalFactors: [
                  { indicator: 'RSI', value: 28, signal: 'bullish', weight: 0.35 },
                  { indicator: 'Stochastic', value: 15, signal: 'bullish', weight: 0.25 },
                  { indicator: 'Support', value: 4180, signal: 'bullish', weight: 0.3 }
                ],
                fundamentalFactors: ['Network upgrades scheduled', 'DeFi activity increasing'],
                marketContext: {
                  volume: 1.2,
                  volatility: 0.45,
                  trend: 'bearish',
                  sentiment: 'neutral'
                },
                entryZone: { min: 4180, max: 4220, optimal: 4200 },
                targets: [4350, 4500, 4680],
                stopLoss: 4120
              },
              recommendedStrategies: ['mean_reversion', 'scalping'],
              suitableForUsers: ['aggressive', 'high_risk'],
              expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
              isActive: true
            }
          ];

          for (const opp of sampleOpportunities) {
            await storage.createMarketOpportunity(opp);
          }
        }
      }
    } catch (error) {
      console.log('Failed to initialize sample data:', error);
    }
  }
}
