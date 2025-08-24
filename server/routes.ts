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

  // IMMEDIATE ORDER ENDPOINT - Define this FIRST to prevent catch-all interference
  console.log('🔧 Registering POST /api/orders endpoint...');
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
      
      // Place the actual order using Bitget API
      const realOrderResponse = await bitgetAPI.placeOrder({
        symbol: orderData.symbol,
        side: orderData.side,
        size: orderData.size,
        orderType: orderData.orderType || 'market',
        leverage: orderData.leverage
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
    // Use a balanced approach: more diverse than before but not overwhelming
    const selectedSymbols = tickers
      .filter(t => parseFloat(t.quoteVolume) > 100000) // Filter for reasonable volume (was 1M before)
      .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume)) // Sort by volume
      .slice(0, 80); // Increased from 20 to 80 for more diversity while keeping performance reasonable
    
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

      // Update local storage
      if (accountData.length > 0) {
        const account = accountData[0];
        await storage.updateAccountInfo(userId, {
          userId,
          availableBalance: account.available,
          marginUsed: (parseFloat(account.equity) - parseFloat(account.available)).toString(),
          unrealizedPnl: account.unrealizedPL,
          totalEquity: account.equity,
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
        entryPrice: pos.breakEvenPrice,
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
      const userId = 'default-user'; // In a real app, get from authentication
      const executions = await storage.getBotExecutions(userId);
      res.json(executions);
    } catch (error) {
      console.error('Error fetching bot executions:', error);
      res.status(500).json({ error: 'Failed to fetch bot executions' });
    }
  });

  app.post('/api/bot-executions', async (req, res) => {
    try {
      const validatedData = insertBotExecutionSchema.parse(req.body);
      const userId = 'default-user'; // In a real app, get from authentication
      
      const execution = await storage.createBotExecution({
        ...validatedData,
        userId
      });
      
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
      const execution = await storage.updateBotExecution(id, { status: 'terminated' });
      res.json(execution);
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
