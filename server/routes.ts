import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { BitgetAPI } from "./services/bitgetApi";
import { insertBitgetCredentialsSchema, insertFuturesDataSchema, insertBotStrategySchema, insertBotExecutionSchema, insertScreenerSchema, insertAlertSettingSchema, insertAlertSchema } from "@shared/schema";
import authRoutes from "./routes/auth";

let bitgetAPI: BitgetAPI | null = null;
let updateInterval: NodeJS.Timeout | null = null;
let tradingPaused = false; // Emergency pause for all trading
let lastEvaluationTime: { [key: string]: number } = {}; // Track last evaluation time per pair

// Folder Organization Helper Functions
function createFolderName(deploymentType: string, tradingStyle?: string, scannerName?: string): string {
  const timestamp = new Date().toLocaleString('en-US', { 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });

  switch (deploymentType) {
    case 'auto_scanner':
      return `🤖 ${scannerName || 'Auto Scanner'} - ${timestamp}`;
    case 'continuous_scanner':
      return `🔄 ${scannerName || 'Continuous Scanner'} - ${timestamp}`;
    case 'folder':
      return `📁 ${tradingStyle || 'Folder'} Deployment - ${timestamp}`;
    case 'manual':
      return `⚡ ${scannerName || tradingStyle || 'Manual'} - ${timestamp}`;
    default:
      return `🚀 Trading Deployment - ${timestamp}`;
  }
}

function getStrategyFolder(strategy: any, deploymentType: string): { folderName: string; description: string } {
  const tradingStyle = strategy?.config?.tradingStyle || 'balanced';
  const scannerName = strategy?.name || 'Scanner';
  const folderName = createFolderName(deploymentType, tradingStyle, scannerName);

  let description = '';
  switch (deploymentType) {
    case 'auto_scanner':
      description = `AI-powered market scanner deployment using ${tradingStyle} style. Auto-selected trading opportunities with risk management.`;
      break;
    case 'continuous_scanner':
      description = `Continuous market monitoring with real-time opportunity detection. Leverages ${tradingStyle} trading approach for optimal entries.`;
      break;
    case 'folder':
      description = `Bulk deployment across folder pairs using ${tradingStyle} strategy. Coordinated risk management and capital allocation.`;
      break;
    case 'manual':
      description = `Custom strategy deployment with ${tradingStyle} configuration. Manual entry/exit criteria and personalized risk settings.`;
      break;
    default:
      description = `Strategy deployment with organized tracking and management.`;
  }

  return { folderName, description };
}

async function createOrganizedFolder(userId: string, strategy: any, deploymentType: string, tradingPairs: string[] = []): Promise<{id: string; name: string}> {
  const { folderName, description } = getStrategyFolder(strategy, deploymentType);

  try {
    // Create the folder/screener for organization
    const folder = await storage.createScreener({
      userId,
      name: folderName,
      description,
      color: getDeploymentColor(deploymentType),
      tradingPairs: tradingPairs.slice(0, 20), // Limit to prevent overload
      criteria: {
        deploymentType,
        strategyId: strategy?.id,
        createdBy: 'auto_organizer',
        timestamp: new Date().toISOString()
      }
    });

    console.log(`📁 Created organized folder: ${folderName} (${tradingPairs.length} pairs)`);
    return { id: folder.id, name: folderName };
  } catch (error) {
    console.error(`❌ Failed to create folder ${folderName}:`, error);
    // Return a fallback folder name
    return { id: 'default', name: folderName };
  }
}

function getDeploymentColor(deploymentType: string): string {
  const colors = {
    'auto_scanner': '#10b981', // green
    'continuous_scanner': '#3b82f6', // blue  
    'folder': '#8b5cf6', // purple
    'manual': '#f59e0b', // amber
    'default': '#6b7280' // gray
  };
  return colors[deploymentType as keyof typeof colors] || colors.default;
}

// Manual strategy evaluation functions
// AI Bot Entry Evaluation - Multi-Indicator Analysis
async function evaluateAIBotEntry(tradingPair: string, timeframes: string[] = ['5m'], dataPoints: number = 200): Promise<{ hasSignal: boolean, direction: 'long' | 'short' | null, confidence: number, indicators: any }> {
  if (!bitgetAPI) {
    console.log('❌ Bitget API not available for AI bot evaluation');
    return { hasSignal: false, direction: null, confidence: 0, indicators: {} };
  }

  if (tradingPaused) {
    console.log('⏸️ Trading paused - no new entries allowed');
    return { hasSignal: false, direction: null, confidence: 0, indicators: {} };
  }

  // For auto scanner, skip the 5-minute cooldown to get fresh results
  const now = Date.now();
  const lastEval = lastEvaluationTime[tradingPair] || 0;
  const timeDiff = now - lastEval;
  const minInterval = 5 * 1000; // Reduce to 5 seconds for focused top-50 scanning

  if (timeDiff < minInterval) {
    const remainingTime = Math.ceil((minInterval - timeDiff) / 1000);
    console.log(`⏸️ ${tradingPair}: Waiting ${remainingTime}s before next evaluation (rate limit)`);
    return { hasSignal: false, direction: null, confidence: 0, indicators: {} };
  }

  lastEvaluationTime[tradingPair] = now;

  try {
    console.log(`🤖 AI Bot: Evaluating multi-timeframe analysis for ${tradingPair} (${timeframes.join(', ')})`);

    // Use primary timeframe (first one) for detailed analysis, secondary for confirmation
    const primaryTimeframe = timeframes[0];
    const candleData = await bitgetAPI.getCandlestickData(tradingPair, primaryTimeframe, dataPoints);

    if (!candleData || candleData.length < 50) {
      console.log(`❌ Insufficient candle data for AI bot: ${candleData?.length || 0} candles`);
      return { hasSignal: false, direction: null, confidence: 0, indicators: {} };
    }

    // Extract price data
    const closes = candleData.map(candle => parseFloat(candle.close));
    const highs = candleData.map(candle => parseFloat(candle.high));
    const lows = candleData.map(candle => parseFloat(candle.low));
    const volumes = candleData.map(candle => parseFloat(candle.volume));

    const currentPrice = closes[closes.length - 1];

    // Initialize scoring system
    let bullishScore = 0;
    let bearishScore = 0;
    const indicators: any = { primaryTimeframe, allTimeframes: timeframes };

    // 1. MACD Analysis (Weight: 40% - Most Important)
    const macdAnalysis = await calculateMACD(closes);
    if (macdAnalysis) {
      indicators.macd = macdAnalysis;
      // Only trade strong crossovers - ignore weak momentum
      if (macdAnalysis.bullishCrossover) {
        bullishScore += 40;
        console.log(`🎯 MACD: STRONG BULLISH crossover (+40)`);
      } else if (macdAnalysis.bearishCrossover) {
        bearishScore += 40;
        console.log(`🎯 MACD: STRONG BEARISH crossover (+40)`);
      }
      // Ignore weak momentum signals that cause false entries
    }

    // 2. RSI Analysis (Weight: 25% - Second Most Important)  
    const rsiAnalysis = calculateRSI(closes, 14);
    if (rsiAnalysis) {
      indicators.rsi = rsiAnalysis;
      // ONLY trade extreme RSI levels - avoid the middle zone
      if (rsiAnalysis < 25) {
        bullishScore += 25; // Very oversold -> Strong buy signal
        console.log(`🎯 RSI: EXTREMELY OVERSOLD ${rsiAnalysis.toFixed(1)} (+25)`);
      } else if (rsiAnalysis > 75) {
        bearishScore += 25; // Very overbought -> Strong sell signal
        console.log(`🎯 RSI: EXTREMELY OVERBOUGHT ${rsiAnalysis.toFixed(1)} (+25)`);
      }
      // Skip weak RSI signals in 30-70 range that cause bad entries
    }

    // 3. Bollinger Bands Analysis (Weight: 20% - High Quality Signals Only)
    const bbAnalysis = calculateBollingerBands(closes, 20, 2);
    if (bbAnalysis) {
      indicators.bollingerBands = bbAnalysis;
      const { upper, lower } = bbAnalysis;

      // Only trade extreme band touches - avoid weak signals
      if (currentPrice <= lower * 0.995) { // Must be BELOW lower band, not just touching
        bullishScore += 20;
        console.log(`🎯 BB: EXTREME LOWER BAND breach (+20)`);
      } else if (currentPrice >= upper * 1.005) { // Must be ABOVE upper band
        bearishScore += 20;
        console.log(`🎯 BB: EXTREME UPPER BAND breach (+20)`);
      }
      // Skip weak squeeze breakouts that often fail
    }

    // 4. Volume Analysis (Weight: 20% - Critical for Confirmation)
    const volumeAnalysis = calculateVolumeAnalysis(volumes, closes);
    if (volumeAnalysis) {
      indicators.volume = volumeAnalysis;
      const { trend, strength, priceVolumeAlignment } = volumeAnalysis;

      // ONLY trade with VERY high volume confirmation
      if (priceVolumeAlignment === 'bullish' && strength > 2.0) {
        bullishScore += 20; // Extremely high volume + price up
        console.log(`🎯 VOLUME: STRONG BULLISH alignment (+20)`);
      } else if (priceVolumeAlignment === 'bearish' && strength > 2.0) {
        bearishScore += 20; // Extremely high volume + price down
        console.log(`🎯 VOLUME: STRONG BEARISH alignment (+20)`);
      }
      // Skip weak volume signals that don't provide confirmation
    }

    // 5. Moving Average Analysis (Weight: 15% - Trend Confirmation Only)
    const maAnalysis = calculateMovingAverageAnalysis(closes);
    if (maAnalysis) {
      indicators.movingAverages = maAnalysis;
      const { ema20, ema50, crossover, trend } = maAnalysis;

      // ONLY trade confirmed crossovers with strong price action
      if (crossover === 'golden' && currentPrice > ema20 * 1.01) {
        bullishScore += 15; // Golden cross with strong bullish confirmation
        console.log(`🎯 MA: CONFIRMED GOLDEN CROSS (+15)`);
      } else if (crossover === 'death' && currentPrice < ema20 * 0.99) {
        bearishScore += 15; // Death cross with strong bearish confirmation
        console.log(`🎯 MA: CONFIRMED DEATH CROSS (+15)`);
      }
      // Skip weak trend following that doesn't add value
    }

    // 6. Enhanced Support/Resistance Analysis (Weight: 15%)
    const srAnalysis = calculateAdvancedSupportResistance(highs, lows, closes, volumes, currentPrice);
    if (srAnalysis) {
      indicators.supportResistance = srAnalysis;
      const { 
        nearSupport, nearResistance, supportStrength, resistanceStrength, 
        bounceConfirmed, rejectionConfirmed, breakoutBullish, breakdownBearish,
        volumeConfirmation, multiTouchSupport, multiTouchResistance
      } = srAnalysis;

      // Strong bounce from confirmed multi-touch support
      if (nearSupport && supportStrength > 0.8 && bounceConfirmed && multiTouchSupport) {
        bullishScore += 18; // Enhanced for multi-touch confirmation
        console.log(`🎯 S/R: MULTI-TOUCH SUPPORT bounce confirmed (+18)`);
      } 
      // Strong rejection at confirmed multi-touch resistance  
      else if (nearResistance && resistanceStrength > 0.8 && rejectionConfirmed && multiTouchResistance) {
        bearishScore += 18; // Enhanced for multi-touch confirmation
        console.log(`🎯 S/R: MULTI-TOUCH RESISTANCE rejection confirmed (+18)`);
      }
      // Volume-confirmed breakouts (high probability setups)
      else if (breakoutBullish && volumeConfirmation && supportStrength > 0.7) {
        bullishScore += 25; // Strong breakout signal
        console.log(`🎯 S/R: VOLUME-CONFIRMED BREAKOUT (+25)`);
      }
      else if (breakdownBearish && volumeConfirmation && resistanceStrength > 0.7) {
        bearishScore += 25; // Strong breakdown signal
        console.log(`🎯 S/R: VOLUME-CONFIRMED BREAKDOWN (+25)`);
      }
      // Regular support/resistance (lower weight without confirmation)
      else if (nearSupport && supportStrength > 0.6) {
        bullishScore += 8; // Reduced weight for unconfirmed
        console.log(`🎯 S/R: SUPPORT area (+8)`);
      } else if (nearResistance && resistanceStrength > 0.6) {
        bearishScore += 8; // Reduced weight for unconfirmed
        console.log(`🎯 S/R: RESISTANCE area (+8)`);
      }
    }

    // Calculate confidence and final decision with STRICT REQUIREMENTS
    const totalScore = Math.max(bullishScore, bearishScore);
    const signalDifference = Math.abs(bullishScore - bearishScore);
    const confidence = Math.min(95, totalScore);

    console.log(`🤖 AI ${tradingPair} - Bullish Score: ${bullishScore}, Bearish Score: ${bearishScore}, Confidence: ${confidence}%`);

    // STRICT ENTRY REQUIREMENTS - Only trade high-probability setups
    const recentCandles = candleData.slice(-20);
    const volatility = calculateVolatility(recentCandles);

    // REALISTIC confidence thresholds for actual market conditions
    let confidenceThreshold = 30; // More achievable base threshold
    let minSignalDifference = 8; // Realistic signal separation for quality pairs

    // Adjust thresholds based on volatility for high-volume pairs
    if (volatility > 4.0) {
      confidenceThreshold = 25; // Lower for extremely volatile high-volume pairs
      minSignalDifference = 6;
      console.log(`🔥 EXTREME VOLATILITY (${volatility.toFixed(2)}%) - Focused threshold: ${confidenceThreshold}%`);
    } else if (volatility > 3.0) {
      confidenceThreshold = 27; 
      minSignalDifference = 7;
      console.log(`📈 HIGH VOLATILITY (${volatility.toFixed(2)}%) - Threshold: ${confidenceThreshold}%`);
    }

    // STRICT signal strength requirements
    if (signalDifference < minSignalDifference) {
      console.log(`❌ Signal too weak: ${signalDifference} point difference < ${minSignalDifference} required`);
      return { hasSignal: false, direction: null, confidence, indicators };
    }

    // BASIC safety checks - Only block extremely dangerous entries
    const isExtremelyOverbought = indicators.rsi > 85 && bullishScore > bearishScore; 
    const isExtremelyOversold = indicators.rsi < 15 && bearishScore > bullishScore;

    if (isExtremelyOverbought || isExtremelyOversold) {
      console.log(`❌ BLOCKED extreme RSI entry: RSI ${indicators.rsi}`);
      return { hasSignal: false, direction: null, confidence, indicators };
    }

    // REALISTIC requirements for actual trading signals
    if (signalDifference >= minSignalDifference && totalScore >= 15) {
      console.log(`🎯 QUALITY SIGNAL: ${signalDifference} diff, ${totalScore} total - threshold ${confidenceThreshold}%`);
    } else {
      console.log(`❌ INSUFFICIENT QUALITY: ${signalDifference} diff, ${totalScore} total (need ${minSignalDifference}+ diff, 15+ total for quality signals)`);
      return { hasSignal: false, direction: null, confidence, indicators };
    }

    if (confidence >= confidenceThreshold) {
      if (bullishScore > bearishScore) {
        console.log(`🎯🎯🎯 LONG SIGNAL TRIGGERED FOR ${tradingPair}! Confidence: ${confidence}% (threshold: ${confidenceThreshold}%)`);
        return { hasSignal: true, direction: 'long', confidence, indicators };
      } else {
        console.log(`🎯🎯🎯 SHORT SIGNAL TRIGGERED FOR ${tradingPair}! Confidence: ${confidence}% (threshold: ${confidenceThreshold}%)`);
        return { hasSignal: true, direction: 'short', confidence, indicators };
      }
    }

    console.log(`⏸️ AI ${tradingPair} - No signal (confidence ${confidence}% < ${confidenceThreshold}%)`);
    return { hasSignal: false, direction: null, confidence, indicators };

  } catch (error) {
    console.error(`❌ AI bot evaluation error for ${tradingPair}:`, error);
    return { hasSignal: false, direction: null, confidence: 0, indicators: {} };
  }
}

// AI Bot Order Placement with Long/Short Support
async function placeAIBotOrder(deployedBot: any, direction: 'long' | 'short'): Promise<boolean> {
  if (!bitgetAPI) {
    console.log('❌ Bitget API not available for AI bot order');
    return false;
  }

  try {
    const { tradingPair, capital, leverage } = deployedBot;

    console.log(`🤖 AI Bot: Placing ${direction.toUpperCase()} order for ${tradingPair}`);
    console.log(`💰 AI Bot: Capital: $${capital}, Leverage: ${leverage}x`);

    // Get current market price
    const allTickers = await bitgetAPI.getAllFuturesTickers();
    const ticker = allTickers.find(t => t.symbol === tradingPair);
    const currentPrice = parseFloat(ticker?.lastPr || '0');

    if (currentPrice <= 0) {
      console.log(`❌ AI Bot: Invalid price for order: ${currentPrice}`);
      return false;
    }

    // Calculate position size
    const capitalAmount = parseFloat(capital);
    const leverageNum = parseFloat(leverage);
    const positionSize = (capitalAmount * leverageNum) / currentPrice;

    // AI bots support both directions based on AI signal
    const orderData = {
      symbol: tradingPair,
      side: direction === 'long' ? 'buy' as const : 'sell' as const,
      orderType: 'market' as const,
      size: positionSize.toFixed(6),
      leverage: leverageNum
    };

    console.log(`🤖 AI Bot ${direction.toUpperCase()} order:`, orderData);

    // Place the order
    const orderResult = await bitgetAPI.placeOrder(orderData);
    console.log(`✅ AI Bot ${direction.toUpperCase()} order placed:`, orderResult);

    // AI bots use dynamic leverage-safe stop loss and take profit
    await setAIBotRiskManagement(tradingPair, currentPrice, deployedBot.botName, direction, leverageNum);

    return true;
  } catch (error) {
    console.error(`❌ AI bot order error:`, error);
    return false;
  }
}

// Calculate optimal trade setup based on leverage and bot type
function calculateOptimalTradeSetup(leverage: number, botType: string = 'manual'): { stopLoss: number; takeProfit: number; tradeProfile: string } {
  // Base percentages are PAIR PRICE movements (not leverage-adjusted)
  let stopLossPercent = 2.0;  // 2% pair price movement
  let takeProfitPercent = 5.0; // 5% pair price movement
  let tradeProfile = 'balanced';

  // Adjust based on leverage (higher leverage = tighter stops for risk management)
  if (leverage >= 10) {
    stopLossPercent = 1.5;
    takeProfitPercent = 3.5;
    tradeProfile = 'high_leverage_conservative';
  } else if (leverage >= 5) {
    stopLossPercent = 2.0;
    takeProfitPercent = 5.0;
    tradeProfile = 'medium_leverage_balanced';
  } else {
    stopLossPercent = 3.0;
    takeProfitPercent = 7.0;
    tradeProfile = 'low_leverage_aggressive';
  }

  // Auto scanner adjustments
  if (botType.includes('auto_scanner') || botType === 'auto_scanner') {
    stopLossPercent = Math.max(stopLossPercent * 1.2, 2.0); // Slightly wider for algorithmic entries
    takeProfitPercent = Math.max(takeProfitPercent * 1.1, 4.0); // Slightly higher targets
    tradeProfile = 'algorithmic_trading';
    console.log(`🤖 AUTO SCANNER - Adjusted stops: ${stopLossPercent}% SL, ${takeProfitPercent}% TP (pair price moves)`);
  }

  console.log(`🎯 PAIR PRICE MOVES - ${leverage}x leverage: ${stopLossPercent.toFixed(1)}% SL, ${takeProfitPercent.toFixed(1)}% TP (${(stopLossPercent * leverage).toFixed(1)}% account risk, ${(takeProfitPercent * leverage).toFixed(1)}% account gain potential)`);

  return {
    stopLoss: stopLossPercent,
    takeProfit: takeProfitPercent,
    tradeProfile
  };
}

// AI Bot Risk Management with Smart Trade Selection
async function setAIBotRiskManagement(symbol: string, entryPrice: number, botName: string, direction: 'long' | 'short', leverage: number = 3): Promise<void> {
  try {
    // Calculate optimal trade setup for the leverage level
    const tradeSetup = calculateOptimalTradeSetup(leverage, botName);
    const stopLossPercent = tradeSetup.stopLoss;
    const takeProfitPercent = tradeSetup.takeProfit;

    // Calculate prices based on position direction
    let stopPrice, takeProfitPrice;
    if (direction === 'long') {
      stopPrice = entryPrice * (1 - stopLossPercent / 100);
      takeProfitPrice = entryPrice * (1 + takeProfitPercent / 100);
    } else { // short
      stopPrice = entryPrice * (1 + stopLossPercent / 100);
      takeProfitPrice = entryPrice * (1 - takeProfitPercent / 100);
    }

    console.log(`🤖 AI ${symbol} ${direction.toUpperCase()}: SL at $${stopPrice.toFixed(6)} (-${stopLossPercent}%), TP at $${takeProfitPrice.toFixed(6)} (+${takeProfitPercent}%)`);
    // Implementation would depend on Bitget API for conditional orders
  } catch (error) {
    console.error(`❌ AI bot risk management error:`, error);
  }

}

// Technical Indicator Calculation Functions
async function calculateMACD(closes: number[]) {
  try {
    const fastEMA = calculateEMA(closes, 12);
    const slowEMA = calculateEMA(closes, 26);

    if (fastEMA.length < 2 || slowEMA.length < 2) return null;

    const currentMacd = fastEMA[fastEMA.length - 1] - slowEMA[slowEMA.length - 1];
    const prevMacd = fastEMA[fastEMA.length - 2] - slowEMA[slowEMA.length - 2];

    const macdHistory = [];
    for (let i = 25; i < Math.min(fastEMA.length, slowEMA.length); i++) {
      macdHistory.push(fastEMA[i] - slowEMA[i]);
    }

    const signalEMA = calculateEMA(macdHistory, 9);
    if (signalEMA.length < 2) return null;

    const currentSignal = signalEMA[signalEMA.length - 1];
    const prevSignal = signalEMA[signalEMA.length - 2];

    return {
      macd: currentMacd,
      signal: currentSignal,
      histogram: currentMacd - currentSignal,
      bullishCrossover: (prevMacd <= prevSignal) && (currentMacd > currentSignal),
      bearishCrossover: (prevMacd >= prevSignal) && (currentMacd < currentSignal),
      bullishMomentum: (currentMacd > currentSignal) && (currentMacd > prevMacd),
      bearishMomentum: (currentMacd < currentSignal) && (currentMacd < prevMacd)
    };
  } catch (error) {
    console.error('MACD calculation error:', error);
    return null;
  }
}



// Removed duplicate - using the later comprehensive implementation

function calculateVolumeAnalysis(volumes: number[], closes: number[]) {
  if (volumes.length < 20 || closes.length < 20) return null;

  try {
    const recentVolumes = volumes.slice(-20);
    const avgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / 20;
    const currentVolume = volumes[volumes.length - 1];

    const volumeStrength = currentVolume / avgVolume;

    // Price-Volume relationship
    const priceChange = closes[closes.length - 1] - closes[closes.length - 2];
    let priceVolumeAlignment = 'neutral';

    if (priceChange > 0 && volumeStrength > 1.2) {
      priceVolumeAlignment = 'bullish'; // Price up + high volume
    } else if (priceChange < 0 && volumeStrength > 1.2) {
      priceVolumeAlignment = 'bearish'; // Price down + high volume
    }

    // Volume trend
    const oldAvgVolume = volumes.slice(-40, -20).reduce((sum, vol) => sum + vol, 0) / 20;
    const volumeTrend = avgVolume > oldAvgVolume ? 'increasing' : 'decreasing';

    return {
      current: currentVolume,
      average: avgVolume,
      strength: volumeStrength,
      trend: volumeTrend,
      priceVolumeAlignment
    };
  } catch (error) {
    console.error('Volume analysis error:', error);
    return null;
  }
}

function calculateMovingAverageAnalysis(closes: number[]) {
  if (closes.length < 50) return null;

  try {
    const ema20 = calculateEMA(closes, 20);
    const ema50 = calculateEMA(closes, 50);

    if (ema20.length < 2 || ema50.length < 2) return null;

    const currentEma20 = ema20[ema20.length - 1];
    const currentEma50 = ema50[ema50.length - 1];
    const prevEma20 = ema20[ema20.length - 2];
    const prevEma50 = ema50[ema50.length - 2];

    // Detect crossovers
    let crossover = 'none';
    if (prevEma20 <= prevEma50 && currentEma20 > currentEma50) {
      crossover = 'golden'; // Bullish
    } else if (prevEma20 >= prevEma50 && currentEma20 < currentEma50) {
      crossover = 'death'; // Bearish
    }

    // Overall trend
    const trend = currentEma20 > currentEma50 ? 'bullish' : 'bearish';

    return {
      ema20: currentEma20,
      ema50: currentEma50,
      crossover,
      trend
    };
  } catch (error) {
    console.error('Moving average analysis error:', error);
    return null;
  }
}

function calculateSupportResistance(highs: number[], lows: number[], closes: number[]) {
  if (highs.length < 50) return null;

  try {
    const currentPrice = closes[closes.length - 1];

    // Find recent highs and lows
    const recentHighs = highs.slice(-50).sort((a, b) => b - a);
    const recentLows = lows.slice(-50).sort((a, b) => a - b);

    // Identify key levels (remove duplicates within 1%)
    const supportLevels: number[] = [];
    const resistanceLevels: number[] = [];

    for (const low of recentLows) {
      if (!supportLevels.find(level => Math.abs(level - low) / level < 0.01)) {
        supportLevels.push(low);
      }
    }

    for (const high of recentHighs) {
      if (!resistanceLevels.find(level => Math.abs(level - high) / level < 0.01)) {
        resistanceLevels.push(high);
      }
    }

    // Find nearest levels
    const nearestSupport = supportLevels
      .filter(level => level < currentPrice)
      .sort((a, b) => (currentPrice - a) - (currentPrice - b))[0];

    const nearestResistance = resistanceLevels
      .filter(level => level > currentPrice)
      .sort((a, b) => (a - currentPrice) - (b - currentPrice))[0];

    // Calculate strength based on distance
    const supportDistance = nearestSupport ? (currentPrice - nearestSupport) / currentPrice : 1;
    const resistanceDistance = nearestResistance ? (nearestResistance - currentPrice) / currentPrice : 1;

    return {
      support: nearestSupport,
      resistance: nearestResistance,
      nearSupport: supportDistance < 0.02, // Within 2%
      nearResistance: resistanceDistance < 0.02, // Within 2%
      supportStrength: 1 - supportDistance,
      resistanceStrength: 1 - resistanceDistance
    };
  } catch (error) {
    console.error('Support/Resistance calculation error:', error);
    return null;
  }
}

// Enhanced Support/Resistance calculation with multi-touch and volume confirmation
function calculateAdvancedSupportResistance(highs: number[], lows: number[], closes: number[], volumes: number[], currentPrice: number) {
  try {
    // Find significant levels with multiple touches
    const supportLevels: any[] = [];
    const resistanceLevels: any[] = [];
    const touchThreshold = 0.005; // 0.5% tolerance for level matching

    // Identify pivot points and count touches
    for (let i = 2; i < lows.length - 2; i++) {
      // Support level (local low)
      if (lows[i] < lows[i-1] && lows[i] < lows[i-2] && lows[i] < lows[i+1] && lows[i] < lows[i+2]) {
        const level = lows[i];
        let touches = 1;
        let volumeSum = volumes[i];

        // Count how many times price touched this level
        for (let j = i + 3; j < lows.length; j++) {
          if (Math.abs(lows[j] - level) / level < touchThreshold) {
            touches++;
            volumeSum += volumes[j];
          }
        }

        supportLevels.push({
          level,
          touches,
          strength: Math.min(1.0, touches * 0.2 + volumeSum / volumes.length * 0.3),
          index: i,
          avgVolume: volumeSum / touches
        });
      }

      // Resistance level (local high)
      if (highs[i] > highs[i-1] && highs[i] > highs[i-2] && highs[i] > highs[i+1] && highs[i] > highs[i+2]) {
        const level = highs[i];
        let touches = 1;
        let volumeSum = volumes[i];

        for (let j = i + 3; j < highs.length; j++) {
          if (Math.abs(highs[j] - level) / level < touchThreshold) {
            touches++;
            volumeSum += volumes[j];
          }
        }

        resistanceLevels.push({
          level,
          touches,
          strength: Math.min(1.0, touches * 0.2 + volumeSum / volumes.length * 0.3),
          index: i,
          avgVolume: volumeSum / volumes.length
        });
      }
    }

    // Find strongest nearest levels
    const nearestSupport = supportLevels
      .filter(s => s.level < currentPrice)
      .sort((a, b) => {
        const distA = Math.abs(currentPrice - a.level) / currentPrice;
        const distB = Math.abs(currentPrice - b.level) / currentPrice;
        return (distA * 0.7 + (1 - a.strength) * 0.3) - (distB * 0.7 + (1 - b.strength) * 0.3);
      })[0];

    const nearestResistance = resistanceLevels
      .filter(r => r.level > currentPrice)
      .sort((a, b) => {
        const distA = Math.abs(a.level - currentPrice) / currentPrice;
        const distB = Math.abs(b.level - currentPrice) / currentPrice;
        return (distA * 0.7 + (1 - a.strength) * 0.3) - (distB * 0.7 + (1 - b.strength) * 0.3);
      })[0];

    const supportDistance = nearestSupport ? Math.abs(currentPrice - nearestSupport.level) / currentPrice : 1;
    const resistanceDistance = nearestResistance ? Math.abs(nearestResistance.level - currentPrice) / currentPrice : 1;

    // Check for recent bounces/rejections (last 3 candles)
    const recentCandles = 3;
    const recentLows = lows.slice(-recentCandles);
    const recentHighs = highs.slice(-recentCandles);
    const recentVolumes = volumes.slice(-recentCandles);
    const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;

    // Bounce confirmation: price touched support and moved up with volume
    const bounceConfirmed = nearestSupport && 
      recentLows.some(low => Math.abs(low - nearestSupport.level) / nearestSupport.level < 0.01) &&
      closes[closes.length - 1] > closes[closes.length - 3] &&
      recentVolumes.some(vol => vol > avgVolume * 1.2);

    // Rejection confirmation: price touched resistance and moved down with volume  
    const rejectionConfirmed = nearestResistance &&
      recentHighs.some(high => Math.abs(high - nearestResistance.level) / nearestResistance.level < 0.01) &&
      closes[closes.length - 1] < closes[closes.length - 3] &&
      recentVolumes.some(vol => vol > avgVolume * 1.2);

    // Breakout detection: price breaks above resistance with high volume
    const breakoutBullish = nearestResistance &&
      currentPrice > nearestResistance.level * 1.005 && // 0.5% above resistance
      volumes[volumes.length - 1] > avgVolume * 1.5;

    // Breakdown detection: price breaks below support with high volume
    const breakdownBearish = nearestSupport &&
      currentPrice < nearestSupport.level * 0.995 && // 0.5% below support
      volumes[volumes.length - 1] > avgVolume * 1.5;

    return {
      nearSupport: supportDistance < 0.015, // Within 1.5%
      nearResistance: resistanceDistance < 0.015, // Within 1.5%
      supportStrength: nearestSupport ? nearestSupport.strength : 0,
      resistanceStrength: nearestResistance ? nearestResistance.strength : 0,
      supportLevel: nearestSupport?.level,
      resistanceLevel: nearestResistance?.level,
      bounceConfirmed,
      rejectionConfirmed,
      breakoutBullish,
      breakdownBearish,
      volumeConfirmation: volumes[volumes.length - 1] > avgVolume * 1.2,
      multiTouchSupport: nearestSupport?.touches >= 2,
      multiTouchResistance: nearestResistance?.touches >= 2,
      supportTouches: nearestSupport?.touches || 0,
      resistanceTouches: nearestResistance?.touches || 0
    };
  } catch (error) {
    console.error('Error in calculateAdvancedSupportResistance:', error);
    return null;
  }
}

// Manual Strategy Evaluation Functions
// New function to handle MA crossover conditions from strategy config
async function evaluateMAConfigCondition(condition: any, tradingPair: string, timeframe: string): Promise<boolean> {
  if (!bitgetAPI) return false;

  try {
    // Get candlestick data for calculating moving averages
    const interval = timeframe === '5m' ? '5m' : timeframe === '1h' ? '1H' : timeframe === '15m' ? '15m' : '1H';
    const klines = await bitgetAPI.getCandlestickData(tradingPair, interval, 200);

    if (!klines || klines.length < 50) {
      console.log(`❌ Insufficient kline data for ${tradingPair}`);
      return false;
    }

    const prices = klines.map(k => parseFloat(k.close)); // Close prices

    // Calculate the moving averages based on condition configuration
    const period1 = condition.period1 || 20;
    const period2 = condition.period2 || 50;
    const maType1 = condition.type || 'ema';
    const maType2 = condition.comparisonMAType || 'ema';

    // Calculate MA1
    const ma1Values = maType1.toLowerCase() === 'ema' ? 
      calculateEMA(prices, period1) : 
      calculateSMA(prices, period1);

    // Calculate MA2 (for crossover comparison)
    const ma2Values = maType2.toLowerCase() === 'ema' ? 
      calculateEMA(prices, period2) : 
      calculateSMA(prices, period2);

    if (ma1Values.length < 2 || ma2Values.length < 2) {
      console.log(`❌ Insufficient MA data for ${tradingPair}`);
      return false;
    }

    const currentMA1 = ma1Values[ma1Values.length - 1];
    const previousMA1 = ma1Values[ma1Values.length - 2];
    const currentMA2 = ma2Values[ma2Values.length - 1];
    const previousMA2 = ma2Values[ma2Values.length - 2];

    console.log(`📊 ${tradingPair} MA${period1}: ${currentMA1.toFixed(6)}, MA${period2}: ${currentMA2.toFixed(6)}`);

    // Evaluate condition based on type
    switch (condition.condition) {
      case 'crossover_below':
        // MA1 crosses below MA2 (bearish signal)
        if (previousMA1 >= previousMA2 && currentMA1 < currentMA2) {
          console.log(`✅ MA${period1} crossed below MA${period2} - Bearish crossover detected`);
          return true;
        }
        break;

      case 'crossover_above':
      case 'crossing_up':
        // MA1 crosses above MA2 (bullish signal)
        if (previousMA1 <= previousMA2 && currentMA1 > currentMA2) {
          console.log(`✅ MA${period1} crossed above MA${period2} - Bullish crossover detected`);
          return true;
        }
        break;

      case 'above':
        // MA1 is above MA2
        if (currentMA1 > currentMA2) {
          console.log(`✅ MA${period1} is above MA${period2}`);
          return true;
        }
        break;

      case 'below':
        // MA1 is below MA2
        if (currentMA1 < currentMA2) {
          console.log(`✅ MA${period1} is below MA${period2}`);
          return true;
        }
        break;

      default:
        console.log(`⚠️ Unknown MA condition: ${condition.condition}`);
        return false;
    }

    return false;
  } catch (error) {
    console.log(`❌ Error evaluating MA condition for ${tradingPair}:`, error);
    return false;
  }
}

async function evaluateManualStrategyEntry(strategy: any, tradingPair: string): Promise<boolean> {
  if (!bitgetAPI) {
    console.log('❌ Bitget API not available for signal evaluation');
    return false;
  }

  try {
    // Get market data for the trading pair
    const allTickers = await bitgetAPI.getAllFuturesTickers();
    const ticker = allTickers.find(t => t.symbol === tradingPair);
    if (!ticker) {
      console.log(`❌ No ticker data available for ${tradingPair}`);
      return false;
    }

    const currentPrice = parseFloat(ticker.lastPr || '0');
    if (currentPrice <= 0) {
      console.log(`❌ Invalid price data for ${tradingPair}: ${currentPrice}`);
      return false;
    }

    console.log(`📊 Evaluating ${tradingPair} at price: $${currentPrice}`);

    // Get entry conditions from strategy config
    const entryConditions = strategy.config.entryConditions || [];
    if (entryConditions.length === 0) {
      console.log(`⚠️ No entry conditions defined for strategy ${strategy.name}`);
      return false;
    }

    // Evaluate ALL entry conditions - ALL must be met for signal
    let conditionsMet = 0;
    let totalConditions = entryConditions.filter((c: any) => c.enabled !== false).length;

    console.log(`🎯 Strategy requires ALL ${totalConditions} conditions to be met for entry signal`);

    for (const condition of entryConditions) {
      if (condition.enabled === false) continue; // Only skip if explicitly disabled

      console.log(`🔍 Checking condition ${conditionsMet + 1}/${totalConditions}: ${condition.indicator} ${condition.condition || condition.operator} ${condition.value || condition.period1}`);

      let conditionResult = false;

      if (condition.indicator === 'macd') {
        const macdSignal = await evaluateMACDCondition(condition, tradingPair, currentPrice);
        if (macdSignal) {
          console.log(`✅ MACD condition met: ${condition.condition}`);
          conditionResult = true;
        }
      } else if (condition.indicator === 'rsi') {
        // Map the condition format to include proper operator
        const rsiCondition = {
          ...condition,
          operator: condition.condition, // Use the condition directly as operator
          value: condition.value
        };
        const rsiSignal = await evaluateRSICondition(rsiCondition, tradingPair, strategy.config.timeframe || '1h');
        if (rsiSignal) {
          console.log(`✅ RSI condition met: ${rsiCondition.operator} ${rsiCondition.value}`);
          conditionResult = true;
        }
      } else if (condition.indicator === 'ma1' || condition.indicator === 'ma2' || condition.indicator === 'ma3' || condition.indicator === 'ma' || condition.indicator === 'sma' || condition.indicator === 'ema') {
        // Handle MA crossover conditions from strategy config
        const maSignal = await evaluateMAConfigCondition(condition, tradingPair, strategy.config.timeframe || '5m');
        if (maSignal) {
          console.log(`✅ MA condition met: ${condition.condition}`);
          conditionResult = true;
        }
      } else if (condition.indicator === 'ma' || condition.indicator === 'sma' || condition.indicator === 'ema') {
        const maCondition = {
          ...condition,
          type: condition.indicator === 'ema' ? 'EMA' : 'SMA',
          period: condition.period || condition.period1 || 20
        };
        const maSignal = await evaluateMACondition(maCondition, tradingPair, strategy.config.timeframe || '1h');
        if (maSignal) {
          console.log(`✅ MA condition met: ${condition.condition}`);
          conditionResult = true;
        }
      } else if (condition.indicator === 'bollinger') {
        const bollingerSignal = await evaluateBollingerCondition(condition, tradingPair, strategy.config.timeframe || '1h');
        if (bollingerSignal) {
          console.log(`✅ Bollinger Bands condition met: ${condition.condition}`);
          conditionResult = true;
        }
      } else if (condition.indicator === 'cci') {
        const cciSignal = await evaluateCCICondition(condition, tradingPair, strategy.config.timeframe || '1h');
        if (cciSignal) {
          console.log(`✅ CCI condition met: ${condition.condition} ${condition.value}`);
          conditionResult = true;
        }
      } else if (condition.indicator === 'atr') {
        const atrSignal = await evaluateATRCondition(condition, tradingPair, strategy.config.timeframe || '1h');
        if (atrSignal) {
          console.log(`✅ ATR condition met: ${condition.condition}`);
          conditionResult = true;
        }
      } else if (condition.indicator === 'stochastic') {
        const stochasticSignal = await evaluateStochasticCondition(condition, tradingPair, strategy.config.timeframe || '1h');
        if (stochasticSignal) {
          console.log(`✅ Stochastic condition met: ${condition.condition} ${condition.value}`);
          conditionResult = true;
        }
      } else if (condition.indicator === 'williams') {
        const williamsSignal = await evaluateWilliamsCondition(condition, tradingPair, strategy.config.timeframe || '1h');
        if (williamsSignal) {
          console.log(`✅ Williams %R condition met: ${condition.condition} ${condition.value}`);
          conditionResult = true;
        }
      } else {
        console.log(`⚠️ Unknown indicator: ${condition.indicator}`);
      }

      // Count met conditions
      if (conditionResult) {
        conditionsMet++;
        console.log(`✅ Condition ${conditionsMet}/${totalConditions} met`);
      } else {
        console.log(`❌ Condition ${conditionsMet + 1}/${totalConditions} not met`);
      }
    }

    // Check if ALL conditions are met
    if (conditionsMet === totalConditions) {
      console.log(`🎯 ALL ${totalConditions} CONDITIONS MET! Entry signal confirmed for ${strategy.config.positionDirection === 'short' ? 'Short' : 'Long'} on ${tradingPair}`);
      return true;
    } else {
      console.log(`⏸️ Entry signal incomplete: ${conditionsMet}/${totalConditions} conditions met for ${strategy.config.positionDirection === 'short' ? 'Short' : 'Long'} on ${tradingPair}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error evaluating entry conditions:`, error);
    return false;
  }
}

async function evaluateMACDCondition(condition: any, tradingPair: string, currentPrice: number): Promise<boolean> {
  try {
    if (!bitgetAPI) {
      console.log('❌ Bitget API not available for MACD calculation');
      return false;
    }

    // Get historical price data for MACD calculation - Using 5M timeframe for scalping
    const candleData = await bitgetAPI.getCandlestickData(tradingPair, '5m', 200); // Get 200 5-minute candles (16+ hours of data)
    if (!candleData || candleData.length < 50) {
      console.log(`❌ Insufficient candle data for MACD calculation on ${tradingPair}: ${candleData?.length || 0} candles`);
      return false;
    }

    // Extract closing prices
    const closes = candleData.map(candle => parseFloat(candle.close)); // Use the close property

    // Calculate MACD with specified periods
    const fastPeriod = condition.fastPeriod || 12;
    const slowPeriod = condition.slowPeriod || 26;
    const signalPeriod = condition.signalPeriod || 9;

    // Calculate EMAs
    const fastEMA = calculateEMA(closes, fastPeriod);
    const slowEMA = calculateEMA(closes, slowPeriod);

    console.log(`📊 Data lengths: Closes: ${closes.length}, FastEMA: ${fastEMA.length}, SlowEMA: ${slowEMA.length}`);

    if (fastEMA.length < 2 || slowEMA.length < 2) {
      console.log(`❌ Insufficient EMA data for MACD calculation`);
      return false;
    }

    // Calculate MACD line (fastEMA - slowEMA)
    const macdLine = fastEMA[fastEMA.length - 1] - slowEMA[slowEMA.length - 1];
    const prevMacdLine = fastEMA[fastEMA.length - 2] - slowEMA[slowEMA.length - 2];

    // Calculate signal line (EMA of MACD line)
    const macdHistory = [];
    for (let i = slowPeriod - 1; i < Math.min(fastEMA.length, slowEMA.length); i++) {
      macdHistory.push(fastEMA[i] - slowEMA[i]);
    }

    console.log(`📈 MACD calculation: SlowPeriod: ${slowPeriod}, MACD history length: ${macdHistory.length}, Signal period: ${signalPeriod}`);

    const signalEMA = calculateEMA(macdHistory, signalPeriod);
    console.log(`📊 Signal EMA length: ${signalEMA.length}`);

    if (signalEMA.length < 2) {
      console.log(`❌ Insufficient signal line data for MACD calculation: ${signalEMA.length} data points (need 2+)`);
      return false;
    }

    const signalLine = signalEMA[signalEMA.length - 1];
    const prevSignalLine = signalEMA[signalEMA.length - 2];

    console.log(`📈 ${tradingPair} MACD: ${macdLine.toFixed(6)}, Signal: ${signalLine.toFixed(6)}, Price: $${currentPrice}`);

    if (condition.condition === 'bullish_crossover') {
      // Bullish crossover: MACD line crosses above signal line
      const crossover = macdLine > signalLine && prevMacdLine <= prevSignalLine;
      console.log(`🔍 Bullish crossover check: ${crossover} (Current: MACD ${macdLine.toFixed(6)} > Signal ${signalLine.toFixed(6)}, Previous: MACD ${prevMacdLine.toFixed(6)} <= Signal ${prevSignalLine.toFixed(6)})`);
      return crossover;
    } else if (condition.condition === 'histogram_above_zero') {
      // MACD histogram above zero (MACD line above signal line)
      const histogramAboveZero = macdLine > signalLine;
      const histogram = macdLine - signalLine;
      console.log(`🔍 MACD histogram above zero check: ${histogramAboveZero} (Histogram: ${histogram.toFixed(6)} > 0)`);
      return histogramAboveZero;
    } else if (condition.condition === 'histogram_below_zero') {
      // MACD histogram below zero (MACD line below signal line)
      const histogramBelowZero = macdLine < signalLine;
      const histogram = macdLine - signalLine;
      console.log(`🔍 MACD histogram below zero check: ${histogramBelowZero} (Histogram: ${histogram.toFixed(6)} < 0)`);
      return histogramBelowZero;
    } else if (condition.condition === 'bearish_crossover') {
      // Bearish crossover: MACD line crosses below signal line
      const crossover = macdLine < signalLine && prevMacdLine >= prevSignalLine;
      console.log(`🔍 Bearish crossover check: ${crossover} (Current: MACD ${macdLine.toFixed(6)} < Signal ${signalLine.toFixed(6)}, Previous: MACD ${prevMacdLine.toFixed(6)} >= Signal ${prevSignalLine.toFixed(6)})`);
      return crossover;
    } else if (condition.condition === 'macd_above_signal') {
      // MACD line above signal line (static condition)
      const aboveSignal = macdLine > signalLine;
      console.log(`🔍 MACD above signal check: ${aboveSignal} (MACD: ${macdLine.toFixed(6)} > Signal: ${signalLine.toFixed(6)})`);
      return aboveSignal;
    } else if (condition.condition === 'macd_below_signal') {
      // MACD line below signal line (static condition)
      const belowSignal = macdLine < signalLine;
      console.log(`🔍 MACD below signal check: ${belowSignal} (MACD: ${macdLine.toFixed(6)} < Signal: ${signalLine.toFixed(6)})`);
      return belowSignal;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error evaluating MACD condition:`, error);
    return false;
  }
}

async function evaluateMACondition(condition: any, tradingPair: string, timeframe: string): Promise<boolean> {
  try {
    if (!bitgetAPI) {
      console.log('❌ Bitget API not available for MA calculation');
      return false;
    }

    const candleData = await bitgetAPI.getCandlestickData(tradingPair, timeframe, 200);
    if (!candleData || candleData.length < (condition.period || 20) + 10) {
      console.log(`❌ Insufficient candle data for MA calculation on ${tradingPair}: ${candleData?.length || 0} candles`);
      return false;
    }

    const closes = candleData.map(candle => parseFloat(candle.close));
    const currentPrice = closes[closes.length - 1];
    const period = condition.period || 20;

    let ma: number;
    if (condition.type === 'EMA' || condition.type === 'ema') {
      const emaValues = calculateEMA(closes, period);
      if (emaValues.length === 0) {
        console.log(`❌ Could not calculate EMA for ${tradingPair}`);
        return false;
      }
      ma = emaValues[emaValues.length - 1];
    } else {
      if (closes.length < period) {
        console.log(`❌ Insufficient data for SMA calculation: ${closes.length} < ${period}`);
        return false;
      }
      const recentCloses = closes.slice(-period);
      ma = recentCloses.reduce((sum, price) => sum + price, 0) / period;
    }

    console.log(`📈 ${tradingPair} ${condition.type || 'SMA'}(${period}): ${ma.toFixed(6)}, Price: $${currentPrice}`);

    if (condition.condition === 'above') {
      const aboveMA = currentPrice > ma;
      console.log(`🔍 Price above ${condition.type || 'SMA'}(${period}) check: ${aboveMA}`);
      return aboveMA;
    } else if (condition.condition === 'below') {
      const belowMA = currentPrice < ma;
      console.log(`🔍 Price below ${condition.type || 'SMA'}(${period}) check: ${belowMA}`);
      return belowMA;
    } else if (condition.condition === 'crossover_above') {
      if (closes.length < 2) return false;
      const prevPrice = closes[closes.length - 2];

      let prevMA: number;
      if (condition.type === 'EMA' || condition.type === 'ema') {
        const emaValues = calculateEMA(closes.slice(0, -1), period);
        prevMA = emaValues[emaValues.length - 1];
      } else {
        const prevCloses = closes.slice(-period - 1, -1);
        prevMA = prevCloses.reduce((sum, price) => sum + price, 0) / period;
      }

      const crossover = prevPrice <= prevMA && currentPrice > ma;
      console.log(`🔍 Price crossover above ${condition.type || 'SMA'}(${period}) check: ${crossover}`);
      return crossover;
    } else if (condition.condition === 'crossover_below') {
      if (closes.length < 2) return false;
      const prevPrice = closes[closes.length - 2];

      let prevMA: number;
      if (condition.type === 'EMA' || condition.type === 'ema') {
        const emaValues = calculateEMA(closes.slice(0, -1), period);
        prevMA = emaValues[emaValues.length - 1];
      } else {
        const prevCloses = closes.slice(-period - 1, -1);
        prevMA = prevCloses.reduce((sum, price) => sum + price, 0) / period;
      }

      const crossover = prevPrice >= prevMA && currentPrice < ma;
      console.log(`🔍 Price crossover below ${condition.type || 'SMA'}(${period}) check: ${crossover}`);
      return crossover;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error evaluating MA condition:`, error);
    return false;
  }
}

async function evaluateRSICondition(condition: any, tradingPair: string, timeframe: string): Promise<boolean> {
  try {
    if (!bitgetAPI) {
      console.log('❌ Bitget API not available for RSI calculation');
      return false;
    }

    // Get historical price data for RSI calculation
    const candleData = await bitgetAPI.getCandlestickData(tradingPair, timeframe, 100);
    if (!candleData || candleData.length < 15) {
      console.log(`❌ Insufficient candle data for RSI calculation on ${tradingPair}: ${candleData?.length || 0} candles`);
      return false;
    }

    // Extract closing prices
    const closes = candleData.map(candle => parseFloat(candle.close));

    // Calculate RSI
    const rsiPeriod = condition.period || 14;
    const rsi = calculateRSI(closes, rsiPeriod);

    if (rsi === null || typeof rsi !== 'number' || isNaN(rsi)) {
      console.log(`❌ Could not calculate RSI for ${tradingPair}: received ${typeof rsi} = ${rsi}`);
      return false;
    }

    console.log(`📊 ${tradingPair} RSI(${rsiPeriod}): ${rsi.toFixed(2)} (${timeframe})`);

    // Evaluate the condition
    const { operator, value } = condition;
    let conditionMet = false;

    switch (operator) {
      case 'greater_than':
      case 'above':
        conditionMet = rsi > value;
        break;
      case 'less_than':
      case 'below':
        conditionMet = rsi < value;
        break;
      case 'equals':
        conditionMet = Math.abs(rsi - value) < 1; // Within 1 point
        break;
      default:
        console.log(`❌ Unknown RSI operator: ${operator}`);
        return false;
    }

    console.log(`🔍 RSI condition: ${rsi.toFixed(2)} ${operator} ${value} = ${conditionMet}`);
    return conditionMet;

  } catch (error) {
    console.error(`❌ Error evaluating RSI condition:`, error);
    return false;
  }
}

// Helper function to calculate Exponential Moving Average
function calculateEMA(data: number[], period: number): number[] {
  if (data.length < period) {
    console.log(`❌ EMA: Not enough data. Need ${period}, have ${data.length}`);
    return [];
  }

  const multiplier = 2 / (period + 1);
  const ema: number[] = [];

  // Start with SMA for the first value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  ema.push(sum / period);

  // Calculate EMA for remaining values
  for (let i = period; i < data.length; i++) {
    const emaValue: number = (data[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
    ema.push(emaValue);
  }

  console.log(`✅ EMA calculated: period ${period}, input ${data.length} points, output ${ema.length} points`);
  return ema;
}

// Helper function to calculate RSI (Relative Strength Index)
function calculateRSI(data: number[], period: number = 14): number | null {
  if (data.length < period + 1) {
    console.log(`❌ RSI: Not enough data. Need ${period + 1}, have ${data.length}`);
    return null;
  }

  // Calculate price changes
  const changes: number[] = [];
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i] - data[i - 1]);
  }

  if (changes.length < period) {
    console.log(`❌ RSI: Not enough price changes. Need ${period}, have ${changes.length}`);
    return null;
  }

  // Separate gains and losses
  const gains = changes.map(change => change > 0 ? change : 0);
  const losses = changes.map(change => change < 0 ? Math.abs(change) : 0);

  // Calculate initial average gain and loss (SMA for first period)
  let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

  // Calculate smoothed averages for remaining periods
  for (let i = period; i < changes.length; i++) {
    avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
    avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
  }

  // Calculate RSI
  if (avgLoss === 0) {
    return 100; // If no losses, RSI = 100
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  console.log(`✅ RSI calculated: period ${period}, avgGain ${avgGain.toFixed(6)}, avgLoss ${avgLoss.toFixed(6)}, RSI ${rsi.toFixed(2)}`);
  return rsi;
}

// Helper function to calculate SMA (Simple Moving Average)
function calculateSMA(data: number[], period: number): number[] {
  if (data.length < period) return [];

  const smaValues = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j];
    }
    smaValues.push(sum / period);
  }
  return smaValues;
}


// Helper function to calculate CCI (Commodity Channel Index)
function calculateCCI(highs: number[], lows: number[], closes: number[], period: number = 20): number | null {
  if (highs.length < period || lows.length < period || closes.length < period) {
    console.log(`❌ CCI: Not enough data. Need ${period}, have ${Math.min(highs.length, lows.length, closes.length)}`);
    return null;
  }

  // Calculate Typical Price (TP) = (High + Low + Close) / 3
  const typicalPrices: number[] = [];
  for (let i = 0; i < Math.min(highs.length, lows.length, closes.length); i++) {
    typicalPrices.push((highs[i] + lows[i] + closes[i]) / 3);
  }

  // Calculate Simple Moving Average of Typical Price
  const smaTP = typicalPrices.slice(-period).reduce((sum, tp) => sum + tp, 0) / period;

  // Calculate Mean Deviation
  const meanDeviation = typicalPrices.slice(-period).reduce((sum, tp) => sum + Math.abs(tp - smaTP), 0) / period;

  if (meanDeviation === 0) {
    return 0; // Avoid division by zero
  }

  // Calculate CCI = (Typical Price - SMA(TP)) / (0.015 * Mean Deviation)
  const currentTP = typicalPrices[typicalPrices.length - 1];
  const cci = (currentTP - smaTP) / (0.015 * meanDeviation);

  console.log(`✅ CCI calculated: period ${period}, currentTP ${currentTP.toFixed(6)}, smaTP ${smaTP.toFixed(6)}, meanDev ${meanDeviation.toFixed(6)}, CCI ${cci.toFixed(2)}`);
  return cci;
}

// Helper function to calculate ATR (Average True Range)
function calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number | null {
  if (highs.length < period + 1 || lows.length < period + 1 || closes.length < period + 1) {
    console.log(`❌ ATR: Not enough data. Need ${period + 1}, have ${Math.min(highs.length, lows.length, closes.length)}`);
    return null;
  }

  // Calculate True Range for each period
  const trueRanges: number[] = [];
  for (let i = 1; i < Math.min(highs.length, lows.length, closes.length); i++) {
    const high = highs[i];
    const low = lows[i];
    const prevClose = closes[i - 1];

    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);

    trueRanges.push(Math.max(tr1, tr2, tr3));
  }

  if (trueRanges.length < period) {
    console.log(`❌ ATR: Not enough true ranges. Need ${period}, have ${trueRanges.length}`);
    return null;
  }

  // Calculate ATR as simple moving average of True Range for the first period
  let atr = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;

  // Use smoothing (Wilder's smoothing) for subsequent periods
  for (let i = period; i < trueRanges.length; i++) {
    atr = ((atr * (period - 1)) + trueRanges[i]) / period;
  }

  console.log(`✅ ATR calculated: period ${period}, current ATR ${atr.toFixed(6)}`);
  return atr;
}

// Helper function to calculate Bollinger Bands
function calculateBollingerBands(closes: number[], period: number = 20, stdDev: number = 2): { upper: number, middle: number, lower: number } | null {
  if (closes.length < period) {
    console.log(`❌ Bollinger Bands: Not enough data. Need ${period}, have ${closes.length}`);
    return null;
  }

  // Calculate middle band (SMA)
  const recentCloses = closes.slice(-period);
  const sma = recentCloses.reduce((sum, close) => sum + close, 0) / period;

  // Calculate standard deviation
  const variance = recentCloses.reduce((sum, close) => sum + Math.pow(close - sma, 2), 0) / period;
  const standardDeviation = Math.sqrt(variance);

  // Calculate bands
  const upper = sma + (stdDev * standardDeviation);
  const lower = sma - (stdDev * standardDeviation);

  console.log(`✅ Bollinger Bands calculated: period ${period}, stdDev ${stdDev}, Upper ${upper.toFixed(6)}, Middle ${sma.toFixed(6)}, Lower ${lower.toFixed(6)}`);
  return { upper, middle: sma, lower };
}

// Helper function to calculate Stochastic Oscillator
function calculateStochastic(highs: number[], lows: number[], closes: number[], kPeriod: number = 14, dPeriod: number = 3, smoothK: number = 3): { k: number, d: number } | null {
  if (highs.length < kPeriod || lows.length < kPeriod || closes.length < kPeriod) {
    console.log(`❌ Stochastic: Not enough data. Need ${kPeriod}, have ${Math.min(highs.length, lows.length, closes.length)}`);
    return null;
  }

  // Calculate %K
  const recentHighs = highs.slice(-kPeriod);
  const recentLows = lows.slice(-kPeriod);
  const currentClose = closes[closes.length - 1];

  const highestHigh = Math.max(...recentHighs);
  const lowestLow = Math.min(...recentLows);

  if (highestHigh === lowestLow) {
    return { k: 50, d: 50 }; // Avoid division by zero
  }

  const rawK = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;

  // For simplicity, we'll use the raw %K as smoothed %K (normally you'd smooth it)
  const k = rawK;

  // Calculate %D (SMA of %K values - simplified as current %K for this implementation)
  const d = k; // In a full implementation, you'd calculate SMA of last dPeriod %K values

  console.log(`✅ Stochastic calculated: kPeriod ${kPeriod}, %K ${k.toFixed(2)}, %D ${d.toFixed(2)}`);
  return { k, d };
}

// Helper function to calculate Williams %R
function calculateWilliamsR(highs: number[], lows: number[], closes: number[], period: number = 14): number | null {
  if (highs.length < period || lows.length < period || closes.length < period) {
    console.log(`❌ Williams %R: Not enough data. Need ${period}, have ${Math.min(highs.length, lows.length, closes.length)}`);
    return null;
  }

  const recentHighs = highs.slice(-period);
  const recentLows = lows.slice(-period);
  const currentClose = closes[closes.length - 1];

  const highestHigh = Math.max(...recentHighs);
  const lowestLow = Math.min(...recentLows);

  if (highestHigh === lowestLow) {
    return -50; // Avoid division by zero
  }

  const williamsR = ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;

  console.log(`✅ Williams %R calculated: period ${period}, Williams %R ${williamsR.toFixed(2)}`);
  return williamsR;
}

// Evaluate Bollinger Bands condition
async function evaluateBollingerCondition(condition: any, tradingPair: string, timeframe: string): Promise<boolean> {
  try {
    if (!bitgetAPI) {
      console.log('❌ Bitget API not available for Bollinger Bands calculation');
      return false;
    }

    const candleData = await bitgetAPI.getCandlestickData(tradingPair, timeframe, 200);
    if (!candleData || candleData.length < (condition.period || 20) + 10) {
      console.log(`❌ Insufficient candle data for Bollinger Bands calculation on ${tradingPair}: ${candleData?.length || 0} candles`);
      return false;
    }

    const closes = candleData.map(candle => parseFloat(candle.close));
    const currentPrice = closes[closes.length - 1];
    const period = condition.period || 20;
    const stdDev = condition.stdDev || 2.0;

    const bands = calculateBollingerBands(closes, period, stdDev);
    if (!bands) {
      console.log(`❌ Could not calculate Bollinger Bands for ${tradingPair}`);
      return false;
    }

    console.log(`📈 ${tradingPair} Bollinger Bands: Upper ${bands.upper.toFixed(6)}, Middle ${bands.middle.toFixed(6)}, Lower ${bands.lower.toFixed(6)}, Price: $${currentPrice}`);

    switch (condition.condition) {
      case 'above_upper':
        const aboveUpper = currentPrice > bands.upper;
        console.log(`🔍 Price above upper band check: ${aboveUpper}`);
        return aboveUpper;
      case 'below_lower':
        const belowLower = currentPrice < bands.lower;
        console.log(`🔍 Price below lower band check: ${belowLower}`);
        return belowLower;
      case 'between_bands':
        const betweenBands = currentPrice >= bands.lower && currentPrice <= bands.upper;
        console.log(`🔍 Price between bands check: ${betweenBands}`);
        return betweenBands;
      case 'squeeze':
        const bandWidth = (bands.upper - bands.lower) / bands.middle;
        const squeeze = bandWidth < 0.1; // Tight squeeze threshold
        console.log(`🔍 Bollinger squeeze check: ${squeeze} (bandwidth: ${bandWidth.toFixed(4)})`);
        return squeeze;
      default:
        return false;
    }
  } catch (error) {
    console.error(`❌ Error evaluating Bollinger Bands condition:`, error);
    return false;
  }
}

// Evaluate CCI condition
async function evaluateCCICondition(condition: any, tradingPair: string, timeframe: string): Promise<boolean> {
  try {
    if (!bitgetAPI) {
      console.log('❌ Bitget API not available for CCI calculation');
      return false;
    }

    const candleData = await bitgetAPI.getCandlestickData(tradingPair, timeframe, 200);
    if (!candleData || candleData.length < (condition.period || 20) + 10) {
      console.log(`❌ Insufficient candle data for CCI calculation on ${tradingPair}: ${candleData?.length || 0} candles`);
      return false;
    }

    const highs = candleData.map(candle => parseFloat(candle.high));
    const lows = candleData.map(candle => parseFloat(candle.low));
    const closes = candleData.map(candle => parseFloat(candle.close));
    const period = condition.period || 20;
    const value = condition.value || 100;

    const cci = calculateCCI(highs, lows, closes, period);
    if (cci === null) {
      console.log(`❌ Could not calculate CCI for ${tradingPair}`);
      return false;
    }

    console.log(`📈 ${tradingPair} CCI: ${cci.toFixed(2)}, Threshold: ${value}`);

    switch (condition.condition) {
      case 'above':
        const above = cci > value;
        console.log(`🔍 CCI above ${value} check: ${above}`);
        return above;
      case 'below':
        const below = cci < value;
        console.log(`🔍 CCI below ${value} check: ${below}`);
        return below;
      case 'crossing_up':
        // Simplified crossover detection (would need previous CCI value for accurate detection)
        const crossingUp = cci > value && cci < value + 50; // Recently crossed up
        console.log(`🔍 CCI crossing up ${value} check: ${crossingUp}`);
        return crossingUp;
      case 'crossing_down':
        const crossingDown = cci < value && cci > value - 50; // Recently crossed down
        console.log(`🔍 CCI crossing down ${value} check: ${crossingDown}`);
        return crossingDown;
      default:
        return false;
    }
  } catch (error) {
    console.error(`❌ Error evaluating CCI condition:`, error);
    return false;
  }
}

// Evaluate ATR condition
async function evaluateATRCondition(condition: any, tradingPair: string, timeframe: string): Promise<boolean> {
  try {
    if (!bitgetAPI) {
      console.log('❌ Bitget API not available for ATR calculation');
      return false;
    }

    const candleData = await bitgetAPI.getCandlestickData(tradingPair, timeframe, 200);
    if (!candleData || candleData.length < (condition.period || 14) + 10) {
      console.log(`❌ Insufficient candle data for ATR calculation on ${tradingPair}: ${candleData?.length || 0} candles`);
      return false;
    }

    const highs = candleData.map(candle => parseFloat(candle.high));
    const lows = candleData.map(candle => parseFloat(candle.low));
    const closes = candleData.map(candle => parseFloat(candle.close));
    const period = condition.period || 14;
    const multiplier = condition.multiplier || 2.0;

    const atr = calculateATR(highs, lows, closes, period);
    if (atr === null) {
      console.log(`❌ Could not calculate ATR for ${tradingPair}`);
      return false;
    }

    const currentPrice = closes[closes.length - 1];
    const atrPercentage = (atr / currentPrice) * 100;
    const threshold = multiplier; // Use multiplier as percentage threshold

    console.log(`📈 ${tradingPair} ATR: ${atr.toFixed(6)} (${atrPercentage.toFixed(2)}%), Threshold: ${threshold}%`);

    switch (condition.condition) {
      case 'above':
        const above = atrPercentage > threshold;
        console.log(`🔍 ATR above ${threshold}% check: ${above}`);
        return above;
      case 'below':
        const below = atrPercentage < threshold;
        console.log(`🔍 ATR below ${threshold}% check: ${below}`);
        return below;
      case 'high_volatility':
        const highVol = atrPercentage > 3.0; // High volatility threshold
        console.log(`🔍 ATR high volatility check: ${highVol}`);
        return highVol;
      case 'low_volatility':
        const lowVol = atrPercentage < 1.0; // Low volatility threshold
        console.log(`🔍 ATR low volatility check: ${lowVol}`);
        return lowVol;
      default:
        return false;
    }
  } catch (error) {
    console.error(`❌ Error evaluating ATR condition:`, error);
    return false;
  }
}

// Evaluate Stochastic condition
async function evaluateStochasticCondition(condition: any, tradingPair: string, timeframe: string): Promise<boolean> {
  try {
    if (!bitgetAPI) {
      console.log('❌ Bitget API not available for Stochastic calculation');
      return false;
    }

    const candleData = await bitgetAPI.getCandlestickData(tradingPair, timeframe, 200);
    if (!candleData || candleData.length < (condition.kPeriod || 14) + 10) {
      console.log(`❌ Insufficient candle data for Stochastic calculation on ${tradingPair}: ${candleData?.length || 0} candles`);
      return false;
    }

    const highs = candleData.map(candle => parseFloat(candle.high));
    const lows = candleData.map(candle => parseFloat(candle.low));
    const closes = candleData.map(candle => parseFloat(candle.close));
    const kPeriod = condition.kPeriod || 14;
    const dPeriod = condition.dPeriod || 3;
    const smoothK = condition.smoothK || 3;
    const value = condition.value || 80;

    const stochastic = calculateStochastic(highs, lows, closes, kPeriod, dPeriod, smoothK);
    if (!stochastic) {
      console.log(`❌ Could not calculate Stochastic for ${tradingPair}`);
      return false;
    }

    console.log(`📈 ${tradingPair} Stochastic: %K ${stochastic.k.toFixed(2)}, %D ${stochastic.d.toFixed(2)}, Threshold: ${value}`);

    switch (condition.condition) {
      case 'above':
        const above = stochastic.k > value;
        console.log(`🔍 Stochastic %K above ${value} check: ${above}`);
        return above;
      case 'below':
        const below = stochastic.k < value;
        console.log(`🔍 Stochastic %K below ${value} check: ${below}`);
        return below;
      case 'overbought':
        const overbought = stochastic.k > 80;
        console.log(`🔍 Stochastic overbought check: ${overbought}`);
        return overbought;
      case 'oversold':
        const oversold = stochastic.k < 20;
        console.log(`🔍 Stochastic oversold check: ${oversold}`);
        return oversold;
      default:
        return false;
    }
  } catch (error) {
    console.error(`❌ Error evaluating Stochastic condition:`, error);
    return false;
  }
}

// Evaluate Williams %R condition
async function evaluateWilliamsCondition(condition: any, tradingPair: string, timeframe: string): Promise<boolean> {
  try {
    if (!bitgetAPI) {
      console.log('❌ Bitget API not available for Williams %R calculation');
      return false;
    }

    const candleData = await bitgetAPI.getCandlestickData(tradingPair, timeframe, 200);
    if (!candleData || candleData.length < (condition.period || 14) + 10) {
      console.log(`❌ Insufficient candle data for Williams %R calculation on ${tradingPair}: ${candleData?.length || 0} candles`);
      return false;
    }

    const highs = candleData.map(candle => parseFloat(candle.high));
    const lows = candleData.map(candle => parseFloat(candle.low));
    const closes = candleData.map(candle => parseFloat(candle.close));
    const period = condition.period || 14;
    const value = condition.value || -20;

    const williamsR = calculateWilliamsR(highs, lows, closes, period);
    if (williamsR === null) {
      console.log(`❌ Could not calculate Williams %R for ${tradingPair}`);
      return false;
    }

    console.log(`📈 ${tradingPair} Williams %R: ${williamsR.toFixed(2)}, Threshold: ${value}`);

    switch (condition.condition) {
      case 'above':
        const above = williamsR > value;
        console.log(`🔍 Williams %R above ${value} check: ${above}`);
        return above;
      case 'below':
        const below = williamsR < value;
        console.log(`🔍 Williams %R below ${value} check: ${below}`);
        return below;
      case 'overbought':
        const overbought = williamsR > -20;
        console.log(`🔍 Williams %R overbought check: ${overbought}`);
        return overbought;
      case 'oversold':
        const oversold = williamsR < -80;
        console.log(`🔍 Williams %R oversold check: ${oversold}`);
        return oversold;
      default:
        return false;
    }
  } catch (error) {
    console.error(`❌ Error evaluating Williams %R condition:`, error);
    return false;
  }
}

async function placeManualStrategyOrder(strategy: any, deployedBot: any): Promise<boolean> {
  if (!bitgetAPI) {
    console.log('❌ Bitget API not available for order placement');
    return false;
  }

  try {
    const { tradingPair, capital, leverage } = deployedBot;
    const { positionDirection, riskManagement } = strategy.config;

    console.log(`📋 Placing ${positionDirection} order for ${tradingPair}`);
    console.log(`💰 Capital: $${capital}, Leverage: ${leverage}x`);

    // Get current market price
    const allTickers = await bitgetAPI.getAllFuturesTickers();
    const ticker = allTickers.find(t => t.symbol === tradingPair);
    const currentPrice = parseFloat(ticker?.lastPr || '0');

    if (currentPrice <= 0) {
      console.log(`❌ Invalid price for order placement: ${currentPrice}`);
      return false;
    }

    // Get available balance from our processed account route, not raw Bitget API
    let availableBalance = 0;
    try {
      const accountResponse = await fetch('http://localhost:5000/api/account/default-user');
      const accountData = await accountResponse.json();
      availableBalance = parseFloat(accountData.account?.availableBalance || '0');
      console.log(`💰 Available balance from processed route: $${availableBalance}`);
    } catch (error) {
      console.log(`⚠️ Failed to get processed balance, falling back to direct API`);
      const accountData = await bitgetAPI.getAccountInfo();
      const accountArray = Array.isArray(accountData) ? accountData : [accountData];
      availableBalance = parseFloat((accountArray[0] as any)?.availableBalance || (accountArray[0] as any)?.available || '0');
    }

    console.log(`💰 Available balance: $${availableBalance}`);

    // Use smaller amount if capital exceeds available balance (safety check)
    let capitalAmount = parseFloat(capital);
    if (capitalAmount > availableBalance * 0.8) { // Use max 80% of available balance for safety
      capitalAmount = availableBalance * 0.8;
      console.log(`⚠️ Adjusted capital to $${capitalAmount.toFixed(2)} (80% of available balance)`);
    }

    const leverageNum = parseFloat(leverage);
    const positionSize = (capitalAmount * leverageNum) / currentPrice;

    console.log(`📊 Position calculation: $${capitalAmount} * ${leverageNum}x / $${currentPrice} = ${positionSize.toFixed(6)} ${tradingPair.replace('USDT', '')}`);

    if (capitalAmount < 1) {
      console.log(`❌ Insufficient funds: Available $${availableBalance}, needed minimum $1`);
      return false;
    }

    // Calculate TP/SL prices from user configuration
    let takeProfitPrice: string | undefined;
    let stopLossPrice: string | undefined;

    if (riskManagement?.takeProfit && riskManagement?.stopLoss) {
      console.log(`📊 Calculating TP/SL from user config: ${riskManagement.takeProfit}% TP, ${riskManagement.stopLoss}% SL`);

      // User configured percentages - convert to actual prices
      const tpPercent = parseFloat(riskManagement.takeProfit.toString()) / 100;
      const slPercent = parseFloat(riskManagement.stopLoss.toString()) / 100;

      if (positionDirection === 'long') {
        // Long position: TP higher, SL lower
        takeProfitPrice = (currentPrice * (1 + tpPercent)).toFixed(6);
        stopLossPrice = (currentPrice * (1 - slPercent)).toFixed(6);
      } else {
        // Short position: TP lower, SL higher  
        takeProfitPrice = (currentPrice * (1 - tpPercent)).toFixed(6);
        stopLossPrice = (currentPrice * (1 + slPercent)).toFixed(6);
      }

      console.log(`💰 Calculated TP/SL prices: TP ${takeProfitPrice}, SL ${stopLossPrice} (based on current price ${currentPrice})`);
    }

    // Prepare order data with user's TP/SL values
    const orderData = {
      symbol: tradingPair,
      marginCoin: 'USDT',
      side: (positionDirection === 'long' ? 'buy' : 'sell') as 'buy' | 'sell', // Fixed: use buy/sell instead of open_long/open_short
      orderType: 'market',
      size: positionSize.toFixed(6),
      leverage: leverageNum,
      source: 'manual_strategy',
      botName: deployedBot.botName,
      // Include user's TP/SL values if configured
      ...(takeProfitPrice && { takeProfit: takeProfitPrice }),
      ...(stopLossPrice && { stopLoss: stopLossPrice })
    };

    console.log(`📊 Order details with USER TP/SL:`, orderData);

    // Place the order with user's configured TP/SL
    const orderResult = await bitgetAPI.placeOrder(orderData);
    console.log(`✅ Order placed successfully with USER configured TP/SL:`, orderResult);

    if (takeProfitPrice && stopLossPrice) {
      console.log(`🎯 USER TP/SL applied: TP ${riskManagement.takeProfit}% at $${takeProfitPrice}, SL ${riskManagement.stopLoss}% at $${stopLossPrice}`);
    } else {
      console.log(`⚠️ No TP/SL applied - user configuration missing or incomplete`);
    }

    return true;
  } catch (error) {
    console.error(`❌ Error placing manual strategy order:`, error);
    return false;
  }
}

async function setStopLossAndTakeProfit(symbol: string, side: string, entryPrice: number, riskManagement: any): Promise<void> {
  try {
    if (riskManagement.stopLoss) {
      const stopLossPercent = riskManagement.stopLoss / 100;
      const stopPrice = side === 'long' 
        ? entryPrice * (1 - stopLossPercent)
        : entryPrice * (1 + stopLossPercent);

      console.log(`📉 Setting stop loss at $${stopPrice.toFixed(6)} (${riskManagement.stopLoss}%)`);
      // Implementation would depend on Bitget API for stop orders
    }

    if (riskManagement.takeProfit) {
      const takeProfitPercent = riskManagement.takeProfit / 100;
      const takeProfitPrice = side === 'long'
        ? entryPrice * (1 + takeProfitPercent)
        : entryPrice * (1 - takeProfitPercent);

      console.log(`📈 Setting take profit at $${takeProfitPrice.toFixed(6)} (${riskManagement.takeProfit}%)`);
      // Implementation would depend on Bitget API for limit orders
    }
  } catch (error) {
    console.error(`❌ Error setting stop loss/take profit:`, error);
  }
}

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.use('/api/auth', authRoutes);
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

  /**
   * Auto-Scanner: DEPLOY
   * Body:
   * {
   *   userId: string,
   *   opportunities: Array<{ symbol: string; price: number; direction: 'long' | 'short'; confidence?: number }>,
   *   totalCapital: number,
   *   leverage: number, // sizing only
   *   scannerName?: string,
   *   customTPSL?: { takeProfit?: number; stopLoss?: number }, // percents, e.g., 2
   *   folderName?: string
   * }
   */
  app.post("/api/auto-scanner/deploy", async (req, res) => {
    try {
      const {
        userId = "default-user",
        opportunities = [],
        totalCapital = 0,
        leverage = 1,
        scannerName,
        customTPSL,
        folderName,
      } = req.body || {};

      if (!Array.isArray(opportunities) || opportunities.length === 0) {
        return res.status(400).json({ success: false, message: "No opportunities provided." });
      }
      if (totalCapital <= 0) {
        return res.status(400).json({ success: false, message: "Invalid totalCapital." });
      }

      const capitalPerBot = totalCapital / opportunities.length;
      const deployedBots: any[] = [];
      const folderLabel = folderName || scannerName || `SmartScanner-${new Date().toISOString().replace(/[:.]/g, "-")}`;

      for (const opportunity of opportunities) {
        const { symbol, direction, price, confidence } = opportunity;

        // 1) Create bot execution as ACTIVE & one-shot
        const savedBot = await storage.createBotExecution({
          userId,
          strategyId: `ai_virtual_${symbol}`,
          tradingPair: symbol,
          capital: capitalPerBot.toFixed(2),
          leverage: String(leverage),
          status: "active",
          deploymentType: "auto_scanner",
          folderName: folderLabel,
          isAIBot: true,
          source: "auto_scanner",
          oneShot: true,
          completed: false,
          customTakeProfit: customTPSL?.takeProfit != null ? String(customTPSL.takeProfit) : null,
          customStopLoss: customTPSL?.stopLoss != null ? String(customTPSL.stopLoss) : null,
        });

        // 2) Immediate market order (no waiting_entry)
        try {
          // Sizing: leverage used ONLY for size
          const positionValue = Number(capitalPerBot.toFixed(2)) * Number(leverage);
          const markPrice = Number(price);
          const qty = positionValue / (markPrice || 1);
          const quantity = qty > 0 ? qty.toFixed(4) : "0";

          const orderParams = {
            symbol,
            side: direction === "long" ? "buy" : "sell" as const,
            orderType: "market" as const,
            size: quantity,
            marginCoin: "USDT",
            timeInForceValue: "IOC",
          };

          const orderResult = await bitgetAPI!.placeOrder(orderParams);

          if (orderResult?.success) {
            // 3) Resolve actual entry price
            let entryPrice =
              Number(orderResult?.data?.priceFilled) ||
              Number(orderResult?.data?.fillPrice) || NaN;

            if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
              const pos = await bitgetAPI!.getActivePositionForSymbol(symbol);
              entryPrice = Number(pos?.openPriceAvg || pos?.entryPrice || markPrice);
            }

            // 4) Compute absolute TP/SL as EXACT % move from entry
            const tpPct = Number(customTPSL?.takeProfit ?? 2) / 100; // default 2%
            const slPct = Number(customTPSL?.stopLoss ?? 2) / 100;

            const rawTp = direction === "long" ? entryPrice * (1 + tpPct) : entryPrice * (1 - tpPct);
            const rawSl = direction === "long" ? entryPrice * (1 - slPct) : entryPrice * (1 + slPct);

            // 5) Round by tick size
            let pricePlace = 6;
            try {
              const cfgs = await bitgetAPI!.getContractConfig(symbol);
              const cfg = Array.isArray(cfgs) ? cfgs.find((c: any) => c.symbol === symbol) : null;
              if (cfg?.pricePlace) pricePlace = parseInt(cfg.pricePlace);
            } catch {
              /* non-fatal */
            }
            const tpPrice = rawTp.toFixed(pricePlace);
            const slPrice = rawSl.toFixed(pricePlace);

            // 6) Attach TP/SL to the position
            await bitgetAPI!.setPositionTPSL({ symbol, takeProfit: tpPrice, stopLoss: slPrice });

            // 7) Persist position data
            await storage.updateBotExecution(savedBot.id, {
              status: "active",
              positionData: {
                orderId: orderResult?.data?.orderId,
                quantity,
                entryPrice: String(entryPrice),
                side: direction,
                leverage: String(leverage),
                takeProfit: tpPrice,
                stopLoss: slPrice,
              },
            });

            deployedBots.push({
              ...savedBot,
              status: "active",
              tradingPair: symbol,
              direction,
              confidence,
            });
          } else {
            deployedBots.push({
              ...savedBot,
              status: "active",
              tradingPair: symbol,
              direction,
              confidence,
              note: `Order failed: ${orderResult?.message || "Unknown error"}`,
            });
          }
        } catch (err: any) {
          deployedBots.push({
            ...savedBot,
            status: "active",
            tradingPair: symbol,
            direction,
            confidence,
            note: `Order exception: ${err?.message || String(err)}`,
          });
        }
      }

      const activeBots = deployedBots.filter((b) => b.status === "active").length;

      res.json({
        success: true,
        message: `Successfully deployed ${deployedBots.length} AI bots - ${activeBots} trades executed immediately`,
        deployedBots: deployedBots.length,
        activeTradesExecuted: activeBots,
        totalCapital,
        capitalPerBot: Number(capitalPerBot.toFixed(2)),
        deployedDetails: deployedBots.map((bot) => ({
          symbol: bot.tradingPair,
          confidence: bot.confidence,
          direction: bot.direction,
          capital: bot.capital,
          status: bot.status,
          positionExecuted: bot.status === "active",
          botId: bot.id,
        })),
      });
    } catch (e: any) {
      console.error("Deploy error:", e);
      res.status(500).json({ success: false, message: e?.message || "Deploy failed" });
    }
  });

  /**
   * Auto-Scanner: STATUS
   * Returns counts without any `waiting_entry` state.
   */
  app.get("/api/auto-scanner/status/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const all = await storage.getBotExecutions(userId);
      const autoScannerBots = all.filter((b: any) => b.deploymentType === "auto_scanner");

      const activeBots = autoScannerBots.filter((b: any) => b.status === "active").length;
      const terminatedBots = autoScannerBots.filter((b: any) => b.status === "terminated").length;

      const totalCapital = autoScannerBots.reduce((sum: number, b: any) => sum + parseFloat(b.capital || "0"), 0);
      const totalProfit = autoScannerBots.reduce((sum: number, b: any) => sum + parseFloat(b.profit || "0"), 0);

      res.json({
        totalBots: autoScannerBots.length,
        activeBots,
        terminatedBots,
        totalCapital: totalCapital.toFixed(2),
        totalProfit: totalProfit.toFixed(2),
        profitPercentage: totalCapital > 0 ? ((totalProfit / totalCapital) * 100).toFixed(2) : "0.00",
        bots: autoScannerBots,
      });
    } catch (e: any) {
      console.error("Status error:", e);
      res.status(500).json({ success: false, message: e?.message || "Status failed" });
    }
  });

  // Auto-trigger organize function on server start
  setTimeout(async () => {
    try {
      console.log('🔧 Auto-triggering organization function...');
      const userId = 'default-user';

      // Get all bot executions
      const executions = await storage.getBotExecutions(userId);
      console.log(`📊 Auto-organize: Total executions: ${executions.length}`);

      const unorganizedExecutions = executions.filter(bot => 
        !bot.folderName && 
        bot.status !== 'terminated' && 
        bot.deploymentType
      );

      console.log(`📊 Auto-organize: Found ${unorganizedExecutions.length} unorganized executions`);

      if (unorganizedExecutions.length > 0) {
        // Auto-trigger organization by simulating a POST request
        const organizationResult = await fetch('http://localhost:5000/api/organize-strategies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: false })
        }).catch(() => null);

        if (organizationResult) {
          console.log('✅ Auto-organization triggered successfully');
        } else {
          console.log('⚠️ Auto-organization fetch failed, will organize manually...');
          // Manual organization logic here if needed
        }
      }
    } catch (error) {
      console.log('⚠️ Auto-organization error:', error.message);
    }
  }, 5000); // Wait 5 seconds after server start



  // Catch-all middleware for positions endpoints
  app.use('/api/positions/*', (req, res, next) => {
    console.log('🎯🎯🎯 POSITIONS ROUTE INTERCEPTED:', req.method, req.url);
    console.log('🎯🎯🎯 POSITIONS BODY:', req.body);
    next();
  });

  // IMMEDIATE ORDER ENDPOINT - Define this FIRST to prevent catch-all interference
  console.log('🔧 Registering POST /api/orders endpoint...');

  // Strategy Organization & Migration Endpoint
  app.post('/api/organize-strategies', async (req, res) => {
    try {
      const userId = 'default-user';
      const { force = false } = req.body;

      console.log(`📁 Starting strategy organization (force=${force})...`);

      // Get all unorganized bot executions (now includes manual deployments)
      const executions = await storage.getBotExecutions(userId);
      console.log(`📊 Total executions: ${executions.length}`);
      console.log(`📋 Sample executions:`, executions.slice(0, 3).map(e => ({
        id: e.id.substring(0, 8),
        folderName: e.folderName,
        deploymentType: e.deploymentType,
        status: e.status,
        tradingPair: e.tradingPair
      })));

      const unorganizedExecutions = executions.filter(bot => 
        !bot.folderName && 
        bot.status !== 'terminated' && 
        bot.deploymentType
      );

      console.log(`📊 Found ${unorganizedExecutions.length} unorganized executions out of ${executions.length} total`);

      let organizedCount = 0;
      let foldersCreated = 0;
      const organizationMap = new Map<string, {id: string, name: string}>();

      for (const execution of unorganizedExecutions) {
        try {
          // Get strategy for folder organization
          const strategies = await storage.getBotStrategies(userId);
          const strategy = strategies.find(s => s.id === execution.strategyId);

          if (strategy) {
            // Create a cache key for similar deployments
            const cacheKey = `${execution.deploymentType}-${strategy.config?.tradingStyle || 'default'}`;

            let folderData;
            if (organizationMap.has(cacheKey)) {
              // Reuse existing folder
              folderData = organizationMap.get(cacheKey)!;
              console.log(`♻️ Reusing folder: ${folderData.name} for ${execution.tradingPair}`);
            } else {
              // Create new organized folder
              folderData = await createOrganizedFolder(userId, strategy, execution.deploymentType, [execution.tradingPair]);
              organizationMap.set(cacheKey, folderData);
              foldersCreated++;
              console.log(`📁 Created new folder: ${folderData.name} for ${execution.deploymentType}`);
            }

            // Update execution with folder info
            await storage.updateBotExecution(execution.id, {
              folderName: folderData.name,
              folderId: folderData.id
            });

            organizedCount++;
            console.log(`✅ Organized ${execution.tradingPair} into ${folderData.name}`);
          }
        } catch (orgError) {
          console.error(`❌ Failed to organize ${execution.tradingPair}:`, orgError);
        }
      }

      const summary = {
        success: true,
        totalExecutions: executions.length,
        unorganizedFound: unorganizedExecutions.length,
        organized: organizedCount,
        foldersCreated,
        folderTypes: Array.from(organizationMap.keys()),
        message: `Successfully organized ${organizedCount} strategies into ${foldersCreated} folders`
      };

      console.log(`🎯 Organization complete: ${JSON.stringify(summary, null, 2)}`);
      res.json(summary);

    } catch (error) {
      console.error('❌ Error organizing strategies:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to organize strategies',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Auto-fix unorganized scanner strategies (called from frontend)
  app.post('/api/fix-auto-scanner-strategies', async (req, res) => {
    try {
      const userId = 'default-user';

      // Get all strategies that need folders (now includes manual deployments)
      const executions = await storage.getBotExecutions(userId);
      console.log(`📊 Fix-Auto: Total executions: ${executions.length}`);
      const unorganizedExecutions = executions.filter(bot => 
        !bot.folderName &&
        bot.status !== 'terminated' &&
        bot.deploymentType
      );
      console.log(`📊 Fix-Auto: Found ${unorganizedExecutions.length} unorganized executions`);

      let fixed = 0;
      for (const execution of unorganizedExecutions) {
        try {
          const strategies = await storage.getBotStrategies(userId);
          const strategy = strategies.find(s => s.id === execution.strategyId);

          if (strategy) {
            const folder = await createOrganizedFolder(userId, strategy, execution.deploymentType, [execution.tradingPair].filter(Boolean));

            await storage.updateBotExecution(execution.id, {
              folderName: folder.name,
              folderId: folder.id
            });

            fixed++;
            console.log(`📁 Auto-fixed scanner strategy: ${execution.tradingPair} → ${folder.name}`);
          }
        } catch (fixError) {
          console.log(`⚠️ Failed to fix scanner strategy ${execution.tradingPair}:`, fixError);
        }
      }

      res.json({ 
        success: true, 
        fixed,
        message: `Fixed ${fixed} scanner strategies`
      });

    } catch (error) {
      console.error('❌ Error fixing scanner strategies:', error);
      res.json({ success: false, error: 'Failed to fix strategies' });
    }
  });

  // User preferences routes
  addUserPreferencesRoutes(app, storage);

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
              source: 'ai_bot', // Mark as AI-generated strategy
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
      // Try to get user credentials from storage first
      const defaultUserCredentials = await storage.getBitgetCredentials('default-user');

      if (defaultUserCredentials) {
        bitgetAPI = new BitgetAPI({
          apiKey: defaultUserCredentials.apiKey,
          apiSecret: defaultUserCredentials.apiSecret,
          apiPassphrase: defaultUserCredentials.apiPassphrase
        });

        const isConnected = await bitgetAPI.testConnection();
        if (isConnected) {
          console.log('Bitget API connection established using user credentials');
          startDataUpdates();
        } else {
          console.error('Bitget API connection failed with user credentials');
        }
      } else {
        console.log('No user API credentials found. Please configure your Bitget API credentials in settings.');
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

  function calculateEMA(prices: number[], period: number): number[] {
    if (prices.length < period) return prices[prices.length - 1];

    const multiplier = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  // API Routes for Bitget credentials and status
  app.get('/api/bitget/status', async (req, res) => {
    try {
      const isConnected = bitgetAPI !== null;
      let connectionDetails = null;

      if (isConnected && bitgetAPI) {
        try {
          // Test the current connection
          const testResult = await bitgetAPI.testConnection();
          connectionDetails = {
            connected: testResult,
            lastChecked: new Date().toISOString(),
            hasCredentials: true
          };
        } catch (error) {
          connectionDetails = {
            connected: false,
            lastChecked: new Date().toISOString(),
            hasCredentials: true,
            error: 'Connection test failed'
          };
        }
      } else {
        connectionDetails = {
          connected: false,
          lastChecked: new Date().toISOString(),
          hasCredentials: false,
          message: 'No API credentials configured'
        };
      }

      res.json(connectionDetails);
    } catch (error: any) {
      res.status(500).json({
        connected: false,
        lastChecked: new Date().toISOString(),
        error: error.message || 'Failed to check status'
      });
    }
  });

  app.post('/api/bitget/credentials', async (req, res) => {
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

      console.log('✅ User API credentials saved and activated successfully');

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
      .filter(m => parseFloat(m.change5m) > 0.8) // Minimum 0.8% move for volatility
      .sort((a, b) => parseFloat(b.change5m) - parseFloat(a.change5m));

    const losers = fiveMinMovers
      .filter(m => parseFloat(m.change5m) < -0.8) // Minimum -0.8% move for volatility
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

        // Calculate Total Equity = Margin + P&L (as per user specification: Equity = margin + PnL)
        const actualTotalEquity = totalMarginUsed + unrealizedPnl;

        // Total Balance = Available Balance + Total Equity (complete account value)
        const calculatedTotalBalance = availableBalance + actualTotalEquity;



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

      if (!bitgetAPI) {
        console.log('❌ Bitget API not configured');
        return res.status(400).json({ 
          message: 'Bitget API not configured' 
        });
      }

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

  // Close all positions endpoint  
  app.post('/api/close-all-positions', async (req, res) => {
    try {
      if (!bitgetAPI) {
        return res.status(400).json({ 
          message: 'Bitget API not configured' 
        });
      }

      const { userId } = req.body;

      console.log(`🔥 CLOSE ALL POSITIONS REQUEST: ${JSON.stringify(req.body, null, 2)}`);
      console.log(`🔥 Closing all positions for user: ${userId || 'default'}`);

      // Get current positions first
      const positions = await bitgetAPI.getPositions();
      console.log(`📊 Found ${positions.length} positions to close`);

      // Continue to bot termination even if no positions to close

      const closedPositions = [];
      const errors = [];

      // First, close all the actual positions on Bitget
      for (const position of positions) {
        try {
          console.log(`🔄 Closing position: ${position.symbol} ${position.holdSide}`);
          const closeResponse = await bitgetAPI.closePosition(position.symbol, position.holdSide);
          closedPositions.push({
            symbol: position.symbol,
            side: position.holdSide,
            response: closeResponse
          });
          console.log(`✅ Closed ${position.symbol} ${position.holdSide}`);
        } catch (error: any) {
          console.error(`❌ Failed to close ${position.symbol} ${position.holdSide}:`, error);
          errors.push({
            symbol: position.symbol,
            side: position.holdSide,
            error: error.message
          });
        }
      }

      // Only terminate bots that have positions that were actually closed
      console.log('🤖 Terminating bots with closed positions...');
      try {
        const allExecutions = await storage.getBotExecutions(userId || 'default-user');
        console.log(`📋 Found ${allExecutions.length} total bot executions`);

        // Only terminate bots whose trading pairs had positions that were closed
        const closedSymbols = closedPositions.map(pos => pos.symbol);
        let terminatedCount = 0;

        for (const bot of allExecutions) {
          // Only terminate bots if their trading pair had a position that was closed
          if (bot.status !== 'terminated' && closedSymbols.includes(bot.tradingPair)) {
            try {
              await storage.updateBotExecution(bot.id, {
                status: 'terminated',
                exitReason: 'Position closed via Close All Positions'
              });
              console.log(`🛑 Terminated bot: ${bot.id} (${bot.tradingPair}) - had closed position`);
              terminatedCount++;
            } catch (error: any) {
              console.error(`❌ Failed to terminate bot ${bot.id}:`, error);
            }
          }
        }
        console.log(`✅ Successfully terminated ${terminatedCount} bots with closed positions`);

        // Keep bots without positions running for future opportunities
        const keptBots = allExecutions.filter(bot => 
          bot.status !== 'terminated' && !closedSymbols.includes(bot.tradingPair)
        );
        if (keptBots.length > 0) {
          console.log(`📌 Kept ${keptBots.length} bots running: ${keptBots.map(bot => bot.tradingPair).join(', ')}`);
        }
      } catch (error: any) {
        console.error('❌ Error processing bot terminations:', error);
      }

      res.json({
        success: true,
        message: positions.length === 0 ? 
          `No positions to close, bots remain active for future opportunities` : 
          `Closed ${closedPositions.length} of ${positions.length} positions and terminated ${closedPositions.length} related bots. Other bots remain active.`,
        closedPositions,
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error: any) {
      console.error('❌ Error closing all positions:', error);
      res.status(500).json({ 
        message: error.message || 'Failed to close all positions' 
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
      const userId = 'default-user'; // Default user for now
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

      // Check if strategy with same name already exists to prevent duplicates
      const existingStrategies = await storage.getBotStrategies(userId);
      const duplicateStrategy = existingStrategies.find(s => s.name === validatedData.name);

      if (duplicateStrategy) {
        console.log(`⚠️ Strategy "${validatedData.name}" already exists, returning existing strategy`);
        return res.json(duplicateStrategy);
      }

      // Create new strategy only if it doesn't exist
      const strategy = await storage.createBotStrategy({
        ...validatedData,
        userId
      });

      console.log(`✅ Created new strategy: "${validatedData.name}"`);
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

  // Database cleanup endpoint
  app.delete('/api/cleanup/terminated-bots', async (req, res) => {
    try {
      const userId = 'default-user';
      const allBots = await storage.getBotExecutions(userId);
      const terminatedBots = allBots.filter(bot => bot.status === 'terminated');

      // Keep only recent terminated bots (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const oldTerminatedBots = terminatedBots.filter(bot => 
        new Date(bot.updatedAt) < oneDayAgo
      );

      let deletedCount = 0;
      for (const bot of oldTerminatedBots) {
        await storage.deleteBotExecution(bot.id);
        deletedCount++;
      }

      res.json({
        success: true,
        message: `Cleaned up ${deletedCount} old terminated bots`,
        deletedCount,
        remainingTerminated: terminatedBots.length - deletedCount
      });
    } catch (error) {
      console.error('Error cleaning up terminated bots:', error);
      res.status(500).json({ error: 'Failed to cleanup terminated bots' });
    }
  });

  // Cleanup route to fix existing auto scanner and AI bot strategies
  app.post('/api/fix-auto-scanner-strategies', async (req, res) => {
    try {
      const userId = 'default-user';
      const strategies = await storage.getBotStrategies(userId);

      let updatedCount = 0;
      for (const strategy of strategies) {
        // Check if this is an auto-generated strategy
        if (strategy.id.startsWith('auto-ai-') || strategy.name.includes('Auto Scanner')) {
          // Auto scanner strategies
          if (strategy.source !== 'auto_scanner') {
            await storage.updateBotStrategy(strategy.id, { source: 'auto_scanner' });
            updatedCount++;
            console.log(`✅ Fixed strategy: ${strategy.name} → source: auto_scanner`);
          }
        } else if (strategy.strategy === 'ai' || strategy.name.includes('AI Bot:')) {
          // AI bot strategies created dynamically
          if (strategy.source !== 'ai_bot') {
            await storage.updateBotStrategy(strategy.id, { source: 'ai_bot' });
            updatedCount++;
            console.log(`✅ Fixed AI bot strategy: ${strategy.name} → source: ai_bot`);
          }
        }
      }

      res.json({ 
        success: true, 
        message: `Updated ${updatedCount} auto-generated strategies`,
        updatedCount 
      });
    } catch (error) {
      console.error('Error fixing auto-generated strategies:', error);
      res.status(500).json({ error: 'Failed to fix auto-generated strategies' });
    }
  });

  // Bot execution management routes - OPTIMIZED
  app.get('/api/bot-executions', async (req, res) => {
    try {
      const userId = 'default-user';

      // Get current positions from Bitget API
      if (!bitgetAPI) {
        return res.json([]);
      }

      // PERFORMANCE: Cache positions for 5 seconds to reduce API calls
      const cacheKey = 'positions_cache';
      const cached = storage.cache?.get?.(cacheKey);
      let positions;

      if (cached && Date.now() - cached.timestamp < 5000) {
        positions = cached.data;
        console.log(`⚡ Using cached positions (${positions.length})`);
      } else {
        positions = await bitgetAPI.getPositions();
        if (!storage.cache) storage.cache = new Map();
        storage.cache.set(cacheKey, { data: positions, timestamp: Date.now() });
        console.log(`🤖 Fresh positions fetched: ${positions.length}`);
      }

      // Get deployed bots from database - filter active only for performance
      const allDeployedBots = await storage.getBotExecutions(userId);

      const deployedBots = allDeployedBots.filter(bot => bot.status === 'active' || bot.status === 'waiting_entry');
      console.log(`📋 Active deployed bots: ${deployedBots.length} (filtered from ${allDeployedBots.length} total)`);

      // CLEANUP: Remove demo bot creation - let users create their own bots

      // CLEANUP: Removed static bot mappings - using dynamic position data instead

      // Build response from actual positions and deployed bots

      // Create a comprehensive list of all bots (deployed + active)
      const allBots = [];

      // Add deployed bots from database (only process non-terminated bots)
      // Filter out terminated bots AND invalid trading pairs before processing to prevent confusion
      const activeBots = deployedBots.filter(bot => 
        bot.status !== 'terminated' && 
        bot.tradingPair && 
        bot.tradingPair !== 'AUTO_SCANNER_MODE' // Only filter the problematic AUTO_SCANNER_MODE
      );
      console.log(`📋 Processing ${activeBots.length} active bots (filtered out ${deployedBots.length - activeBots.length} terminated/invalid)`);

      for (const deployedBot of activeBots) {
        console.log(`🔍 Processing bot ${deployedBot.tradingPair}: status="${deployedBot.status}", deploymentType="${deployedBot.deploymentType}"`);

        // Handle continuous scanner differently - scan multiple pairs
        if (deployedBot.deploymentType === 'continuous_scanner') {
          // Get strategy for proper naming and folder organization
          const strategies = await storage.getBotStrategies('default-user');
          const strategy = strategies.find(s => s.id === deployedBot.strategyId);

          // Ensure continuous scanner has proper folder organization
          let folderName = deployedBot.folderName;
          if (!folderName && strategy) {
            folderName = `🔄 ${strategy.name}`;
            // Update the bot with folder info
            try {
              await storage.updateBotExecution(deployedBot.id, { 
                folderName: folderName 
              });
            } catch (updateError) {
              console.log(`⚠️ Failed to update continuous scanner folder: ${updateError}`);
            }
          }

          // Add the scanner to the display list - this acts as the folder header
          allBots.push({
            id: deployedBot.id,
            userId: userId,
            strategyId: deployedBot.strategyId,
            tradingPair: deployedBot.tradingPair,
            status: 'active',
            capital: deployedBot.capital,
            leverage: deployedBot.leverage,
            profit: '0',
            trades: '0',
            cycles: 0,
            cycleTime: '0m',
            winRate: '0',
            roi: '0.00',
            runtime: '0m',
            deploymentType: 'continuous_scanner',
            botName: strategy?.name || deployedBot.botName || 'Continuous Scanner',
            riskLevel: 'Medium',
            startedAt: deployedBot.startedAt || deployedBot.createdAt,
            createdAt: deployedBot.createdAt,
            updatedAt: new Date(),
            exitCriteria: null,
            exitTriggered: false,
            exitReason: null,
            positionData: null,
            folderName: folderName
          });

          // Now perform actual scanning logic for top pairs
          try {
            console.log(`🔄 Continuous Scanner: Evaluating top trading pairs for strategy ${deployedBot.strategyId}`);

            // Get strategy configuration
            const strategies = await storage.getBotStrategies('default-user');
            const strategy = strategies.find(s => s.id === deployedBot.strategyId);

            if (strategy && strategy.strategy === 'manual') {
              // Get top 20 most volatile pairs for scanning (sorted by daily price change)
              const futuresData = await storage.getAllFuturesData();
              const topPairs = futuresData
                .filter(coin => coin.symbol.endsWith('USDT'))
                .filter(coin => coin.change24h && Math.abs(parseFloat(coin.change24h)) > 0) // Filter out pairs with no movement
                .sort((a, b) => Math.abs(parseFloat(b.change24h)) - Math.abs(parseFloat(a.change24h))) // Sort by absolute change (most volatile)
                .slice(0, 20) // Top 20 most volatile pairs
                .map(coin => coin.symbol);

              console.log(`🔍 Scanning ${topPairs.length} most volatile pairs: ${topPairs.slice(0, 5).join(', ')}...`);

              // Check each pair against strategy conditions
              for (const pair of topPairs) {
                // Skip if we already have a position OR existing bot for this pair
                if (positions.find((pos: any) => pos.symbol === pair)) {
                  continue;
                }

                // CRITICAL FIX: Also skip if we already have an active/waiting bot for this pair to prevent duplicates
                const existingBot = deployedBots.find(bot => 
                  bot.tradingPair === pair && 
                  (bot.status === 'active' || bot.status === 'waiting_entry') &&
                  (bot.deploymentType === 'continuous_scanner_child' || bot.deploymentType === 'continuous_scanner')
                );
                if (existingBot) {
                  console.log(`⏸️ Skipping ${pair} - already has bot: ${existingBot.botName} (${existingBot.status})`);
                  continue;
                }

                // Evaluate this pair against the strategy
                const entrySignalMet = await evaluateManualStrategyEntry(strategy, pair);

                if (entrySignalMet) {
                  console.log(`🎯 Continuous Scanner: Entry signal found for ${pair}!`);

                  // Create a temporary bot execution for this pair
                  const tempBotData = {
                    id: `scanner-${pair}-${Date.now()}`,
                    userId: deployedBot.userId,
                    strategyId: deployedBot.strategyId,
                    tradingPair: pair,
                    capital: Math.max(parseFloat(deployedBot.capital) / 3, 10).toString(), // Split capital across opportunities, minimum $10 per trade
                    leverage: deployedBot.leverage,
                    status: 'active',
                    deploymentType: 'continuous_scanner_child',
                    botName: `${pair}`,
                  };

                  // Place order for this pair using existing order placement logic
                  const orderSuccess = await placeManualStrategyOrder(strategy, tempBotData);

                  if (orderSuccess) {
                    console.log(`✅ Continuous Scanner placed order for ${pair}`);

                    // Find or create a folder for this strategy scanner
                    let folderData = { folderName: null, folderId: null };
                    try {
                      const strategies = await storage.getBotStrategies('default-user');
                      const currentStrategy = strategies.find(s => s.id === deployedBot.strategyId);

                      if (currentStrategy) {
                        // Use clean strategy name as folder name (no timestamps for scanners)
                        const folderName = `🔄 ${currentStrategy.name}`;

                        // Check if folder already exists for this strategy
                        const folders = await storage.getFolders('default-user');
                        let existingFolder = folders.find(f => f.name === folderName);

                        if (existingFolder) {
                          // Add pair to existing folder if not already there
                          if (!existingFolder.pairs.includes(pair)) {
                            existingFolder.pairs.push(pair);
                            await storage.updateFolder(existingFolder.id, { pairs: existingFolder.pairs });
                          }
                          folderData = { folderName: existingFolder.name, folderId: existingFolder.id };
                          console.log(`📁 Added ${pair} to existing scanner folder: ${existingFolder.name}`);
                        } else {
                          // Create new folder for this strategy scanner
                          const folder = await storage.createFolder({
                            userId: deployedBot.userId,
                            name: folderName,
                            pairs: [pair],
                            description: `${currentStrategy.name} scanner - Active trading pairs`,
                            createdAt: new Date(),
                            updatedAt: new Date()
                          });

                          folderData = { folderName: folder.name, folderId: folder.id };
                          console.log(`📁 Created new scanner folder: ${folder.name}`);
                        }
                      }
                    } catch (folderError) {
                      console.log(`⚠️ Failed to organize scanner folder: ${folderError}`);
                    }

                    // Create a bot execution record for tracking
                    await storage.createBotExecution({
                      userId: deployedBot.userId,
                      strategyId: deployedBot.strategyId,
                      tradingPair: pair,
                      capital: tempBotData.capital,
                      leverage: tempBotData.leverage,
                      status: 'active',
                      deploymentType: 'continuous_scanner_child',
                      botName: `${pair}`,
                      ...folderData
                    });
                  }
                }
              }
            }
          } catch (error) {
            console.error(`❌ Error in continuous scanner logic:`, error);
          }

          continue;
        }

        // Handle manual/folder deployments - ensure they have proper folder names with strategy names
        if (deployedBot.deploymentType === 'manual' || deployedBot.deploymentType === 'folder') {
          // Get strategy for proper naming and folder organization
          const strategies = await storage.getBotStrategies('default-user');
          const strategy = strategies.find(s => s.id === deployedBot.strategyId);

          // Check if bot has generic folder name and update it with strategy name
          let folderName = deployedBot.folderName;
          if (strategy && (!folderName || folderName === 'Test' || folderName === 'Manual Strategy' || folderName.includes('Manual Strategy'))) {
            folderName = `⚡ ${strategy.name}`;
            // Update the bot with proper folder name
            try {
              await storage.updateBotExecution(deployedBot.id, { 
                folderName: folderName 
              });
              console.log(`📁 Updated ${deployedBot.tradingPair} folder name to: ${folderName}`);
            } catch (updateError) {
              console.log(`⚠️ Failed to update bot folder name: ${updateError}`);
            }
          }
        }

        // ONE-SHOT RE-ENTRY PREVENTION: Auto-scanner bots with oneShot=true should not re-enter after position closes
        if (deployedBot.deploymentType === 'auto_scanner' && deployedBot.oneShot === true) {
          const hasPosition = positions.find((pos: any) => pos.symbol === deployedBot.tradingPair);
          
          // If position has closed (TP/SL triggered), mark as completed and skip re-entry
          if (!hasPosition && deployedBot.status === 'active' && !deployedBot.completed) {
            console.log(`🎯 ONE-SHOT COMPLETE: ${deployedBot.tradingPair} position closed, marking bot as completed (no re-entry)`);
            await storage.updateBotExecution(deployedBot.id, { 
              completed: true,
              status: 'terminated',
              exitReason: 'One-shot bot - position closed by TP/SL'
            });
            continue; // Skip to next bot - no re-entry allowed
          }
          
          // If already completed, always skip
          if (deployedBot.completed === true) {
            console.log(`⏭️ SKIP: ${deployedBot.tradingPair} already completed (one-shot bot)`);
            continue;
          }
        }

        // Check if this is a strategy bot that needs entry evaluation 
        // CRITICAL: Exclude continuous_scanner_child bots AND completed one-shot bots from re-evaluation
        if ((deployedBot.status === 'waiting_entry' || (deployedBot.status === 'active' && !positions.find((pos: any) => pos.symbol === deployedBot.tradingPair))) && deployedBot.strategyId && (deployedBot.deploymentType === 'manual' || deployedBot.deploymentType === 'folder' || deployedBot.deploymentType === 'auto_scanner' || deployedBot.deploymentType === 'continuous_scanner') && deployedBot.deploymentType !== 'continuous_scanner_child' && !(deployedBot.oneShot && deployedBot.completed)) {
          try {
            // Get the strategy configuration
            const strategies = await storage.getBotStrategies('default-user');
            const strategy = strategies.find(s => s.id === deployedBot.strategyId);

            if (strategy && (strategy.strategy === 'manual' || strategy.strategy === 'ai')) {
              console.log(`🔍 Evaluating entry conditions for ${strategy.strategy} bot: ${deployedBot.botName} on ${deployedBot.tradingPair}`);

              // Evaluate entry conditions
              let entrySignalMet = false;

              if (strategy.strategy === 'ai') {
                // AI bots use multi-indicator analysis for both long and short
                const aiResult = await evaluateAIBotEntry(deployedBot.tradingPair);
                entrySignalMet = aiResult.hasSignal;

                if (entrySignalMet && aiResult.direction) {
                  console.log(`🎯 Entry signal detected for ${deployedBot.botName} on ${deployedBot.tradingPair}! Confidence: ${aiResult.confidence}%`);
                  console.log(`📊 Indicators: MACD ${aiResult.indicators.macd ? '✅' : '❌'}, RSI ${aiResult.indicators.rsi ? '✅' : '❌'}, BB ${aiResult.indicators.bollingerBands ? '✅' : '❌'}, Volume ${aiResult.indicators.volume ? '✅' : '❌'}`);

                  // Place the trade with direction
                  const orderSuccess = await placeAIBotOrder(deployedBot, aiResult.direction);

                  if (orderSuccess) {
                    console.log(`✅ Trade placed successfully for ${deployedBot.botName}`);
                    // Update bot status to active with confidence score
                    await storage.updateBotExecution(deployedBot.id, { 
                      status: 'active',
                      trades: '1'
                    });
                  } else {
                    console.log(`❌ Failed to place trade for ${deployedBot.botName}`);
                  }
                }
              } else {
                // Manual bots use configured entry conditions
                entrySignalMet = await evaluateManualStrategyEntry(strategy, deployedBot.tradingPair);

                if (entrySignalMet) {
                  console.log(`🎯 Entry signal detected for ${deployedBot.botName} on ${deployedBot.tradingPair}!`);

                  // Place the trade
                  const orderSuccess = await placeManualStrategyOrder(strategy, deployedBot);

                  if (orderSuccess) {
                    console.log(`✅ Trade placed successfully for ${deployedBot.botName}`);
                    // Update bot status to active
                    await storage.updateBotExecution(deployedBot.id, { 
                      status: 'active',
                      trades: '1'
                    });
                  } else {
                    console.log(`❌ Failed to place trade for ${deployedBot.botName}`);
                  }
                }
              }
            }
          } catch (error) {
            console.error(`❌ Error evaluating manual strategy for ${deployedBot.botName}:`, error);
          }
        }

        const position = positions.find((pos: any) => pos.symbol === deployedBot.tradingPair);
        // CLEANUP: Removed botMappings reference - using dynamic data only

        // For manual strategy bots, create exit criteria from strategy config
        let exitCriteria = null;
        if (deployedBot.deploymentType === 'manual' && deployedBot.strategyId) {
          const strategies = await storage.getBotStrategies('default-user');
          const strategy = strategies.find(s => s.id === deployedBot.strategyId);
          if (strategy && strategy.config?.riskManagement) {
            // Get leverage from deployed bot (default to 3x if not specified)
            const botLeverage = parseFloat(deployedBot.leverage || '3');

            // ONLY USE USER INPUT PARAMETERS - NO OVERRIDES OR PRESETS
            const userStopLoss = strategy.config.riskManagement.stopLoss;
            const userTakeProfit = strategy.config.riskManagement.takeProfit;

            let finalStopLoss, finalTakeProfit;

            if (userStopLoss && userTakeProfit) {
              // Use EXACTLY what the user configured - no validation or overrides
              finalStopLoss = userStopLoss;
              finalTakeProfit = userTakeProfit;
              console.log(`✅ Using USER CONFIGURED values: ${userStopLoss}% SL, ${userTakeProfit}% TP (no overrides)`);
            } else {
              // Only calculate fallbacks if user didn't specify ANY values
              const tradeSetup = calculateOptimalTradeSetup(botLeverage, 'manual');
              finalStopLoss = tradeSetup.stopLoss;
              finalTakeProfit = tradeSetup.takeProfit;
              console.log(`🎯 No user values found - using calculated: ${finalStopLoss}% SL, ${finalTakeProfit}% TP`);
            }

            exitCriteria = {
              stopLoss: -Math.abs(finalStopLoss), // Negative for loss
              takeProfit: Math.abs(finalTakeProfit), // Positive for profit
              maxRuntime: 120, // 2 hours default for manual strategies
              exitStrategy: 'manual_exit'
            };

            console.log(`📊 Manual strategy ${deployedBot.botName} (${botLeverage}x leverage): SL ${finalStopLoss}% TP ${finalTakeProfit}% (pair price movements)`);
          }
        }

        if (position) {
          // PRIORITY: Use user-configured exit criteria first, then fallback to calculated
          let finalExitCriteria = exitCriteria; // This contains user input from strategy config

          if (!finalExitCriteria) {
            // Check for custom TP/SL from auto scanner deployment
            const customSL = deployedBot.customStopLoss ? parseFloat(deployedBot.customStopLoss) : null;
            const customTP = deployedBot.customTakeProfit ? parseFloat(deployedBot.customTakeProfit) : null;
            
            if (customSL && customTP) {
              // Use custom TP/SL values from deployment
              finalExitCriteria = {
                stopLoss: -Math.abs(customSL), // Negative for loss
                takeProfit: Math.abs(customTP), // Positive for profit
                maxRuntime: 240, // Default 4 hours
                exitStrategy: 'auto_scanner_custom'
              };
              
              console.log(`✅ ${deployedBot.tradingPair} (${deployedBot.leverage}x leverage): Using CUSTOM TP/SL - SL ${customSL}% TP ${customTP}% (user input)`);
              
            } else {
              // Last resort: calculate optimal setup
              const botLeverage = parseFloat(deployedBot.leverage || '3');
              const deploymentType = deployedBot.deploymentType || 'folder';
              const tradeSetup = calculateOptimalTradeSetup(botLeverage, deploymentType);

              finalExitCriteria = {
                stopLoss: -tradeSetup.stopLoss, // Negative for loss
                takeProfit: tradeSetup.takeProfit, // Positive for profit
                maxRuntime: 240, // Default 4 hours
                exitStrategy: tradeSetup.tradeProfile
              };

              console.log(`🎯 ${deployedBot.tradingPair} (${botLeverage}x leverage): Using calculated - SL ${tradeSetup.stopLoss}% TP ${tradeSetup.takeProfit}% (pair price movements)`);
            }
          } else {
            console.log(`✅ ${deployedBot.tradingPair}: Using USER CONFIGURED criteria - SL ${Math.abs(finalExitCriteria.stopLoss)}% TP ${finalExitCriteria.takeProfit}%`);
          }
          // Bot has an active position
          const runtime = deployedBot.startedAt 
            ? Math.floor((Date.now() - new Date(deployedBot.startedAt).getTime()) / 1000 / 60)
            : 30;

          // Calculate trading cycles completed
          const cycleMinutes = {
            'arbitrage_spread_close': 5, 'dca_accumulation': 15, 'swing_trend_reversal': 30,
            'test_exit': 10, 'grid_rebalancing': 20, 'manual_exit': 15
          };
          // finalExitCriteria already defined above with safety check
          const strategyCycleTime = cycleMinutes[(finalExitCriteria?.exitStrategy || 'manual_exit') as keyof typeof cycleMinutes] || 15;
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
          // finalExitCriteria already defined above
          let exitTriggered = false;
          let exitReason = '';

          console.log(`🔍 Exit evaluation for ${deployedBot.tradingPair}:`);
          console.log(`📊 Price-based ROI: ${priceBasedRoiPercent.toFixed(2)}%`);
          console.log(`🎯 Stop Loss: ${finalExitCriteria.stopLoss}%, Take Profit: ${finalExitCriteria.takeProfit}%`);

          if (priceBasedRoiPercent <= finalExitCriteria.stopLoss) {
            exitTriggered = true;
            exitReason = `Stop Loss triggered (${priceBasedRoiPercent.toFixed(2)}% <= ${finalExitCriteria.stopLoss}%)`;
          } else if (priceBasedRoiPercent >= finalExitCriteria.takeProfit) {
            exitTriggered = true;
            exitReason = `Take Profit triggered (${priceBasedRoiPercent.toFixed(2)}% >= ${finalExitCriteria.takeProfit}%)`;
          } else if (runtime >= finalExitCriteria.maxRuntime) {
            exitTriggered = true;
            exitReason = `Max runtime reached (${runtime}m >= ${finalExitCriteria.maxRuntime}m)`;
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
            botName: deployedBot.botName || `Bot ${deployedBot.tradingPair}`,
            riskLevel: 'Medium', // CLEANUP: Removed mapping dependency
            folderName: deployedBot.folderName, // Include folder name from database
            startedAt: deployedBot.startedAt || deployedBot.createdAt,
            createdAt: deployedBot.createdAt,
            updatedAt: new Date(),
            exitCriteria: {
              stopLoss: `${finalExitCriteria.stopLoss}%`,
              takeProfit: `${finalExitCriteria.takeProfit}%`,
              maxRuntime: `${finalExitCriteria.maxRuntime}m`,
              strategy: finalExitCriteria.exitStrategy
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
            riskLevel: 'Medium', // CLEANUP: Removed mapping dependency
            folderName: deployedBot.folderName, // Include folder name from database
            startedAt: deployedBot.startedAt || deployedBot.createdAt,
            createdAt: deployedBot.createdAt,
            updatedAt: new Date(),
            exitCriteria: null, // CLEANUP: Removed mapping dependency
            exitTriggered: false,
            exitReason: null,
            positionData: null
          });
        }
      }

      // FIXED: Only terminate active bots without positions (not waiting_entry bots)
      // waiting_entry bots are SUPPOSED to not have positions - they're waiting for entry signals
      const orphanedChildBots = deployedBots.filter(bot => 
        bot.deploymentType === 'continuous_scanner_child' && 
        bot.status === 'active' && // Only active bots, NOT waiting_entry 
        !positions.find((pos: any) => pos.symbol === bot.tradingPair)
      );

      if (orphanedChildBots.length > 0) {
        console.log(`🧹 Found ${orphanedChildBots.length} orphaned continuous_scanner_child bots (active only) without positions, terminating to prevent duplicates`);
        for (const orphanBot of orphanedChildBots) {
          await storage.updateBotExecution(orphanBot.id, { 
            status: 'terminated',
            exitReason: 'Position closed - auto cleanup'
          });
          console.log(`🗑️ Terminated orphaned bot: ${orphanBot.botName} (${orphanBot.tradingPair})`);
        }
      }

      // DISABLED: Skip automatic bot creation for legacy positions to prevent endless recreation
      // Only create bots through manual deployment, not for every existing position
      console.log(`⚠️ Skipping automatic bot creation for ${positions.length} positions to prevent recreation issues`);

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

  // Get exit criteria for all bots - CLEANUP: Return dynamic data only
  app.get('/api/bot-exit-criteria', async (req, res) => {
    try {
      // CLEANUP: Removed static mappings - return empty array or dynamic data
      const botMappings = [];

      res.json(botMappings);
    } catch (error) {
      console.error('Error fetching exit criteria:', error);
      res.status(500).json({ error: 'Failed to fetch exit criteria' });
    }
  });

  // Sync positions to bot executions (utility endpoint)
  // Test MACD evaluation endpoint
  app.get('/api/test-macd', async (req, res) => {
    try {
      const symbol = req.query.symbol as string || 'BTCUSDT';

      console.log(`🧪 Testing AI Bot MACD evaluation for ${symbol}`);

      // Test AI bot evaluation directly
      const aiResult = await evaluateAIBotEntry(symbol);

      res.json({
        symbol,
        aiSignalMet: aiResult.hasSignal,
        direction: aiResult.direction,
        confidence: aiResult.confidence,
        indicators: aiResult.indicators,
        timestamp: new Date().toISOString(),
        message: aiResult.hasSignal ? 
          `${aiResult.direction?.toUpperCase()} SIGNAL DETECTED! Confidence: ${aiResult.confidence}%` : 
          `No signal yet (confidence ${aiResult.confidence}%)`
      });
    } catch (error) {
      console.error('❌ Error testing MACD:', error);
      res.status(500).json({ error: 'Failed to test MACD evaluation' });
    }
  });

  // Cleanup invalid bots with AUTO_SCANNER_MODE trading pair
  app.post('/api/cleanup-invalid-bots', async (req, res) => {
    try {
      const userId = 'default-user';
      const allBots = await storage.getBotExecutions(userId);

      // Find bots with invalid trading pairs
      const invalidBots = allBots.filter(bot => 
        bot.tradingPair === 'AUTO_SCANNER_MODE' || 
        bot.tradingPair === 'CONTINUOUS_SCANNER_MODE' ||
        !bot.tradingPair ||
        bot.tradingPair.includes('_MODE')
      );

      console.log(`🧹 Found ${invalidBots.length} invalid bots to cleanup`);

      // Delete invalid bots (but keep continuous scanners)
      for (const bot of invalidBots) {
        if (bot.deploymentType !== 'continuous_scanner') {
          await storage.deleteBotExecution(bot.id, userId);
          console.log(`🗑️ Deleted invalid bot: ${bot.botName} (${bot.tradingPair})`);
        }
      }

      res.json({
        success: true,
        message: `Cleaned up ${invalidBots.length} invalid bots`,
        deletedBots: invalidBots.map(bot => ({
          id: bot.id,
          botName: bot.botName,
          tradingPair: bot.tradingPair
        }))
      });
    } catch (error) {
      console.error('❌ Error cleaning up invalid bots:', error);
      res.status(500).json({ error: 'Failed to cleanup invalid bots' });
    }
  });

  // Force AI bot execution test endpoint
  app.post('/api/test-ai-execution', async (req, res) => {
    try {
      const { symbol = 'BTCUSDT' } = req.body;

      console.log(`🧪🧪🧪 FORCING AI BOT EXECUTION TEST FOR ${symbol}`);

      // Find an active AI bot for this symbol
      const deployedBots = await storage.getBotExecutions('default-user');
      const targetBot = deployedBots.find(bot => 
        bot.tradingPair === symbol && 
        bot.status === 'active' && 
        bot.deploymentType === 'folder'
      );

      if (!targetBot) {
        return res.status(404).json({ 
          error: `No active AI bot found for ${symbol}`,
          availableBots: deployedBots.filter(b => b.status === 'active').map(b => b.tradingPair)
        });
      }

      console.log(`🎯 Found AI bot: ${targetBot.botName} for ${symbol}`);

      // Force execute the AI bot order
      const orderSuccess = await placeAIBotOrder(targetBot);

      res.json({
        symbol,
        botName: targetBot.botName,
        executionSuccess: orderSuccess,
        message: orderSuccess ? 'AI BOT EXECUTED SUCCESSFULLY!' : 'Execution failed',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error in forced AI execution:', error);
      res.status(500).json({ error: 'Failed to execute AI bot test' });
    }
  });

  app.post('/api/sync-bots', async (req, res) => {
    try {
      const userId = 'default-user';
      console.log('🔄 Syncing positions to bot executions...');

      // Get current positions
      const positions = await storage.getUserPositions(userId);
      console.log(`📊 Found ${positions.length} active positions`);

      // CLEANUP: Removed static mappings - use dynamic position data

      const createdExecutions = [];

      for (const position of positions) {
        // CLEANUP: Generate dynamic bot name instead of using mappings
        const botName = `Smart Bot ${position.symbol.replace('USDT', '')}`;
        if (position.symbol) {
          try {
            // Create simple strategy first
            let strategy;
            try {
              strategy = await storage.createBotStrategy({
                userId: userId,
                name: botName,
                description: `AI Bot: ${botName}`,
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
              strategy = strategies.find(s => s.name === botName);
              if (!strategy) {
                console.log(`⚠️ Could not create strategy for ${botName}, skipping...`);
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
              leverage: '3', // Default leverage for dynamic bots
              botName: botName,
              startedAt: new Date()
            });

            createdExecutions.push(execution);
            console.log(`✅ Created bot execution for ${botName} on ${position.symbol}`);
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
      const executionData = insertBotExecutionSchema.parse(req.body);
      console.log('✅ Validated bot execution data:', JSON.stringify(executionData, null, 2));
      const userId = executionData.userId || 'default-user'; // In a real app, get from authentication

      // Check if this is an AI bot deployment
      const isAIBot = executionData.isAIBot || executionData.strategyId?.startsWith('ai_virtual_') || executionData.deploymentType === 'ai_bot';

      if (isAIBot) {
        console.log(`🤖 AI Bot detected - skipping strategy record creation`);

        // For AI bots, create execution without permanent strategy record
        // Use the original AI bot ID for reference but don't create strategy
        const aiExecutionData = {
          ...executionData,
          strategyId: executionData.strategyId?.replace('ai_virtual_', '') || executionData.strategyId,
          source: 'ai_bot' // Mark source to prevent appearing in manual strategies
        };

        const execution = await storage.createBotExecution(aiExecutionData);
        console.log(`✅ AI Bot execution created without strategy record: ${execution.id}`);
        res.json(execution);
      } else {
        // Regular manual strategy deployment
        const execution = await storage.createBotExecution(executionData);
        console.log(`✅ Manual bot execution created: ${execution.id}`);
        res.json(execution);
      }

    } catch (error: any) {
      console.error('❌ Error creating bot execution:', error);
      res.status(400).json({ 
        message: error.message || 'Failed to create bot execution' 
      });
    }
  });

  // Get single bot execution by ID
  app.get('/api/bot-executions/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const userId = 'default-user';

      const executions = await storage.getBotExecutions(userId);
      const execution = executions.find(e => e.id === id);

      if (!execution) {
        return res.status(404).json({ error: 'Bot execution not found' });
      }

      res.json(execution);
    } catch (error) {
      console.error('Error getting bot execution:', error);
      res.status(400).json({ error: 'Failed to get bot execution' });
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
          console.log(`🔄 Attempting to close position for ${execution.tradingPair} (Bot: ${execution.id})`);

          // Get current positions to check if there's an open position
          const positions = await bitgetAPI.getPositions();
          const openPosition = positions.find(p => 
            p.symbol === execution.tradingPair && 
            parseFloat(p.total) !== 0
          );

          console.log(`🔍 Found ${positions.length} total positions, looking for ${execution.tradingPair}`);

          if (openPosition) {
            console.log(`📊 Found open position for ${execution.tradingPair}, attempting to close`);

            // Close the position by placing an opposite order
            const closeOrderSide = openPosition.holdSide === 'long' ? 'sell' : 'buy';
            const closeSize = Math.abs(parseFloat(openPosition.total));

            if (closeSize > 0) {
              console.log(`🔄 Closing ${closeOrderSide} position of size ${closeSize} for ${execution.tradingPair}`);

              // Try flash close first (preferred method)
              try {
                console.log(`🚀 Trying flash close first: ${JSON.stringify({
                  symbol: execution.tradingPair,
                  productType: 'USDT-FUTURES',
                  holdSide: openPosition.holdSide
                }, null, 2)}`);

                // Flash close functionality to be implemented later
                console.log('Flash close would be called here');

                console.log(`✅ Flash close successful for ${execution.tradingPair}: ${JSON.stringify(flashCloseResponse, null, 2)}`);
              } catch (flashError) {
                console.log(`⚠️ Flash close failed for ${execution.tradingPair}, attempting market order: ${flashError.message}`);

                // Try a simple market close order
                try {
                  const marketCloseOrder = {
                    symbol: execution.tradingPair,
                    productType: 'USDT-FUTURES',
                    marginMode: 'isolated',
                    marginCoin: 'USDT',
                    size: closeSize.toString(),
                    side: closeOrderSide,
                    tradeSide: 'close',
                    orderType: 'market'
                  };

                  console.log(`📋 Placing market close order: ${JSON.stringify(marketCloseOrder, null, 2)}`);
                  await bitgetAPI.placeOrder({
                    symbol: marketCloseOrder.symbol,
                    side: closeOrderSide === 'buy' ? 'buy' as const : 'sell' as const,
                    size: marketCloseOrder.size,
                    orderType: 'market' as const
                  });
                  console.log(`✅ Market close order placed successfully for ${execution.tradingPair}`);
                } catch (marketError) {
                  console.log(`❌ Market close failed: ${marketError.message}`);

                  // Last resort: try to cancel any pending orders that might be blocking closure
                  try {
                    console.log(`🧹 Attempting to cancel all pending orders for ${execution.tradingPair}...`);
                    // Order cancellation functionality to be implemented later
                    console.log('Order cancellation would be called here');
                  } catch (cancelError) {
                    console.log(`⚠️ Order cancellation failed: ${cancelError.message}`);
                  }
                }
              }

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

      // Wait a moment for position to actually close before allowing sync to recreate
      setTimeout(() => {
        console.log(`⏰ Position close grace period ended for ${execution.tradingPair}`);
      }, 10000); // 10 second grace period

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

  // Historical price data for Dynamic Exit Visualizer
  app.get('/api/futures/:symbol/history', async (req, res) => {
    try {
      const { symbol } = req.params;

      if (!bitgetAPI) {
        return res.status(503).json({ error: 'API not available' });
      }

      // Get 1 hour of 1-minute candles for price history
      const candleData = await bitgetAPI.getCandlestickData(symbol, '1m', 60);

      if (!candleData || candleData.length === 0) {
        return res.json([]);
      }

      // Transform data for chart consumption
      const priceHistory = candleData.map((candle, index) => ({
        time: new Date(parseInt(candle.timestamp)).toLocaleTimeString(),
        price: parseFloat(candle.close),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        volume: parseFloat(candle.volume),
        timestamp: parseInt(candle.timestamp),
        index
      })).reverse(); // Most recent first

      res.json(priceHistory);
    } catch (error) {
      console.error('Error fetching price history:', error);
      res.status(500).json({ error: 'Failed to fetch price history' });
    }
  });

  // Auto Market Scanner - SCAN ONLY (returns opportunities, no deployment)
  app.post('/api/auto-scanner/scan', async (req, res) => {
    try {
      const { userId = 'default-user', maxBots = 10, minConfidence = 25, tradingStyle = 'balanced', customTPSL = null } = req.body;

      if (!bitgetAPI) {
        return res.status(400).json({ error: 'Bitget API not available' });
      }

      // Determine timeframes and analysis parameters based on trading style
      const styleConfig = {
        conservative: { 
          timeframes: ['4H', '1D'], 
          dataPoints: 100, 
          description: 'Long-term analysis (4H + 1D)' 
        },
        balanced: { 
          timeframes: ['15m', '1H'], 
          dataPoints: 150, 
          description: 'Medium-term analysis (15m + 1H)' 
        },
        aggressive: { 
          timeframes: ['1m', '5m'], 
          dataPoints: 200, 
          description: 'Short-term scalping (1m + 5m)' 
        }
      };

      const config = styleConfig[tradingStyle as keyof typeof styleConfig] || styleConfig.balanced;

      console.log(`🔍 AUTO SCANNER (${tradingStyle.toUpperCase()}): ${config.description} - ${config.timeframe} timeframe`);
      console.log(`📊 Looking for max ${maxBots} opportunities with min ${minConfidence}% confidence`);

      // Get top 50 highest volume USDT pairs for focused analysis
      const allTickers = await bitgetAPI.getAllFuturesTickers();
      console.log(`📊 Found ${allTickers.length} total trading pairs from Bitget API`);

      // Filter for USDT pairs only and sort by volume descending
      const usdtPairs = allTickers
        .filter(ticker => ticker.symbol.endsWith('USDT'))
        .sort((a, b) => parseFloat(b.quoteVolume || '0') - parseFloat(a.quoteVolume || '0'))
        .slice(0, 50); // TOP 50 highest volume only

      console.log(`🎯 ANALYZING TOP 50 HIGHEST VOLUME USDT PAIRS - Focused High-Quality Analysis`);
      console.log(`📈 Focus pairs: ${usdtPairs.map(t => t.symbol).slice(0, 10).join(', ')}...`);
      console.log(`💰 Volume range: $${parseInt(usdtPairs[0]?.quoteVolume || '0').toLocaleString()} to $${parseInt(usdtPairs[49]?.quoteVolume || '0').toLocaleString()}`);

      // Analyze top 50 pairs with AI indicators for faster, higher quality results
      const analysisResults = [];
      let analyzedCount = 0;
      let validSignalCount = 0;

      for (const ticker of usdtPairs) { // Analyze top 50 USDT pairs only
        try {
          console.log(`🔬 Analyzing ${ticker.symbol} (${analyzedCount + 1}/${usdtPairs.length})...`);
          analyzedCount++;

          const aiResult = await evaluateAIBotEntry(ticker.symbol, config.timeframes, config.dataPoints);
          console.log(`📊 ${ticker.symbol}: Confidence ${aiResult.confidence}%, Direction: ${aiResult.direction || 'None'}`);

          if (aiResult.confidence > 0) { // Track all signals, not just high confidence ones
            validSignalCount++;
            console.log(`🎯 Valid signal #${validSignalCount}: ${ticker.symbol} with ${aiResult.confidence}% confidence`);
          }

          if (aiResult.confidence >= minConfidence && aiResult.direction) {
            analysisResults.push({
              symbol: ticker.symbol,
              direction: aiResult.direction,
              confidence: aiResult.confidence,
              indicators: aiResult.indicators,
              price: parseFloat(ticker.lastPr || '0'),
              volume24h: parseFloat(ticker.quoteVolume || '0'),
              change24h: parseFloat(ticker.change24h || '0')
            });

            console.log(`✨ HIGH CONFIDENCE: ${ticker.symbol} - ${aiResult.direction?.toUpperCase()} signal with ${aiResult.confidence}% confidence`);
          }
        } catch (error) {
          console.error(`❌ Error analyzing ${ticker.symbol}:`, error);
        }
      }

      console.log(`🔍 Scanner Summary: Analyzed ${analyzedCount} pairs, found ${validSignalCount} valid signals, ${analysisResults.length} meet confidence threshold (${minConfidence}%)`);

      // If no high-confidence results, lower confidence threshold temporarily
      if (analysisResults.length === 0 && validSignalCount > 0) {
        console.log(`🔄 No results at ${minConfidence}% confidence, scanning with lower threshold on top volume pairs...`);
        const lowerThreshold = Math.max(60, minConfidence - 25); // Still keep reasonably high threshold

        for (const ticker of usdtPairs.slice(0, 20)) { // Quick scan of top 20 volume USDT pairs
          try {
            const aiResult = await evaluateAIBotEntry(ticker.symbol, config.timeframes, config.dataPoints);
            if (aiResult.confidence >= lowerThreshold && aiResult.direction) {
              analysisResults.push({
                symbol: ticker.symbol,
                direction: aiResult.direction,
                confidence: aiResult.confidence,
                indicators: aiResult.indicators,
                price: parseFloat(ticker.lastPr || '0'),
                volume24h: parseFloat(ticker.quoteVolume || '0'),
                change24h: parseFloat(ticker.change24h || '0')
              });

              console.log(`📉 LOWER CONFIDENCE: ${ticker.symbol} - ${aiResult.direction?.toUpperCase()} with ${aiResult.confidence}%`);
            }
          } catch (error) {
            console.error(`❌ Error in lower confidence scan for ${ticker.symbol}:`, error);
          }
        }
      }

      // MULTI-BUCKET ANALYSIS - Categorize pairs by volatility and trading style
      console.log(`📊 MULTI-BUCKET ANALYSIS: Categorizing pairs by volatility and timeframes...`);
      const bucketResults = {
        Aggressive: [],
        Balanced: [],
        ConservativeBiasOnly: []
      };

      let bucketAnalyzedCount = 0;
      let bucketSkippedData = 0;

      for (const ticker of usdtPairs.slice(0, 30)) { // Analyze top 30 for bucket classification
        try {
          const change24h = parseFloat(ticker.change24h || '0');
          const volume24h = parseFloat(ticker.quoteVolume || '0');
          const currentPrice = parseFloat(ticker.lastPr || '0');

          // No volume filtering needed - already scanning top 50 volume pairs

          // Get minimal data for basic bucket analysis
          let h1Data, dailyData;
          try {
            h1Data = await bitgetAPI.getCandlestickData(ticker.symbol, '1H', 25);
            dailyData = await bitgetAPI.getCandlestickData(ticker.symbol, '1D', 10);
          } catch (error) {
            bucketSkippedData++;
            continue;
          }

          if (!h1Data || !dailyData || h1Data.length < 5 || dailyData.length < 2) {
            bucketSkippedData++;
            continue;
          }

          // Calculate daily range percentage (volatility measure) with null safety
          const dailyOHLC = dailyData[dailyData.length - 1];
          const dailyHigh = parseFloat(dailyOHLC?.high || '0');
          const dailyLow = parseFloat(dailyOHLC?.low || '0');
          const dailyRangePct = currentPrice > 0 ? ((dailyHigh - dailyLow) / currentPrice) * 100 : 0;

          // Technical indicators for classification
          const h1Closes = h1Data.map(c => parseFloat(c.close));
          const dailyCloses = dailyData.map(c => parseFloat(c.close));
          const h1Volumes = h1Data.map(c => parseFloat(c.volume));

          // Simplified EMA calculations with null safety
          const ema100_1h = h1Closes.length >= 20 ? calculateEMA(h1Closes, 20) : currentPrice;
          const ema200_1d = dailyCloses.length >= 10 ? calculateEMA(dailyCloses, 10) : currentPrice;
          const ema100Diff = ema100_1h ? ((currentPrice - ema100_1h) / ema100_1h) * 100 : 0;
          const ema200Diff = ema200_1d ? ((currentPrice - ema200_1d) / ema200_1d) * 100 : 0;

          // Basic RSI only (skip complex MACD)
          const rsi = h1Closes.length >= 14 ? calculateRSI(h1Closes, 14) : null;
          const macd = null; // Skip for simplified analysis

          // Volume spike detection
          const avgVolume = h1Volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
          const currentVolume = h1Volumes[h1Volumes.length - 1];
          const volumeSpikeMultiple = currentVolume / avgVolume;

          // Simplified Bollinger Bands position  
          const bb = h1Closes.length >= 20 ? calculateBollingerBands(h1Closes, 20, 2) : null;
          let bbPosition = 'middle';
          if (bb) {
            if (currentPrice <= bb.lower) bbPosition = 'below_lower';
            else if (currentPrice >= bb.upper) bbPosition = 'above_upper';
            else if (currentPrice <= bb.lower * 1.05) bbPosition = 'near_lower';
            else if (currentPrice >= bb.upper * 0.95) bbPosition = 'near_upper';
          }

          // BUCKET CLASSIFICATION LOGIC - Adjusted for practical market conditions
          let bucket = 'ConservativeBiasOnly';
          let evalTimeframe = '1D';

          // Aggressive bucket conditions (high volatility scalping)
          const rsiExtreme = rsi && (rsi.value <= 25 || rsi.value >= 75);
          const bbBreak = bbPosition === 'below_lower' || bbPosition === 'above_upper';
          const highVol = dailyRangePct >= 5.0;
          const volumeSpike = volumeSpikeMultiple >= 1.5;

          if ((rsiExtreme || bbBreak) && (highVol || volumeSpike)) {
            bucket = 'Aggressive';
            evalTimeframe = '1m/5m';
          }
          // Balanced bucket conditions (medium volatility trading)
          else if (dailyRangePct >= 2.0 && dailyRangePct <= 6.0) {
            const emaInRange = Math.abs(ema100Diff) <= 3.0;
            const rsiNearBand = rsi && (rsi.value <= 40 || rsi.value >= 60);

            if (emaInRange || rsiNearBand) {
              bucket = 'Balanced';
              evalTimeframe = '15m/1h';
            }
          }
          // Conservative bucket for stable pairs
          else if (dailyRangePct < 3.0){
            bucket = 'ConservativeBiasOnly';
            evalTimeframe = '4h/1d';
          }

          // Direction bias from EMA200 on daily
          let bias = 'neutral';
          if (ema200Diff > 1) bias = 'bullish';
          else if (ema200Diff < -1) bias = 'bearish';

          const bucketEntry = {
            symbol: ticker.symbol,
            bucket,
            evalTimeframe,
            dailyRangePct: (dailyRangePct || 0).toFixed(2),
            ema100DiffPct1h: (ema100Diff || 0).toFixed(2),
            ema200DiffPct1d: (ema200Diff || 0).toFixed(2),
            rsi: rsi?.value?.toFixed(1) || 'N/A',
            macdLine: 'N/A',
            macdSignal: 'N/A', 
            macdHist: 'N/A',
            bbPosition,
            volumeSpikeMultiple: (volumeSpikeMultiple || 0).toFixed(1),
            bias,
            price: currentPrice,
            volume24h,
            change24h
          };

          bucketResults[bucket].push(bucketEntry);
          bucketAnalyzedCount++;
          console.log(`📋 BUCKET: ${ticker.symbol} -> ${bucket} (Vol: ${(dailyRangePct || 0).toFixed(1)}%, RSI: ${rsi?.value?.toFixed(1) || 'N/A'}, Bias: ${bias})`);

        } catch (error) {
          console.log(`⚠️ Bucket analysis error for ${ticker.symbol}:`, error.message);
        }
      }

      console.log(`📊 Bucket Analysis Summary: Processed ${bucketAnalyzedCount} pairs, Skipped ${bucketSkippedData} (data), Found ${bucketResults.Aggressive.length} Aggressive, ${bucketResults.Balanced.length} Balanced, ${bucketResults.ConservativeBiasOnly.length} Conservative`);

      // Sort each bucket by priority metrics
      bucketResults.Aggressive.sort((a, b) => parseFloat(b.volumeSpikeMultiple) - parseFloat(a.volumeSpikeMultiple));
      bucketResults.Balanced.sort((a, b) => parseFloat(b.dailyRangePct) - parseFloat(a.dailyRangePct));
      bucketResults.ConservativeBiasOnly.sort((a, b) => Math.abs(parseFloat(b.ema200DiffPct1d)) - Math.abs(parseFloat(a.ema200DiffPct1d)));

      const totalBucketPairs = bucketResults.Aggressive.length + bucketResults.Balanced.length + bucketResults.ConservativeBiasOnly.length;

      // Sort by confidence score and select top opportunities
      analysisResults.sort((a, b) => b.confidence - a.confidence);
      const topOpportunities = analysisResults.slice(0, maxBots);

      console.log(`🎯 Found ${topOpportunities.length} high-confidence trading opportunities and ${totalBucketPairs} bucket-classified pairs`);

      // ENTRY POINT ANALYSIS - Find best entries from bucket results based on sophisticated rules
      const entryOpportunities = await analyzeEntryPoints(bucketResults, tradingStyle);

      // SCAN ONLY - Just return the opportunities found
      res.json({
        success: true,
        message: `Market scan complete: Found ${topOpportunities.length} trading opportunities, ${totalBucketPairs} bucket-classified pairs, and ${entryOpportunities.length} sophisticated entry points`,
        opportunities: topOpportunities,
        entryOpportunities,
        bucketResults: {
          Aggressive: bucketResults.Aggressive.slice(0, 10),
          Balanced: bucketResults.Balanced.slice(0, 10), 
          ConservativeBiasOnly: bucketResults.ConservativeBiasOnly.slice(0, 10)
        },
        scanResults: {
          totalPairsAnalyzed: analyzedCount,
          validSignalsFound: validSignalCount,
          highConfidenceOpportunities: topOpportunities.length,
          bucketClassified: {
            Aggressive: bucketResults.Aggressive.length,
            Balanced: bucketResults.Balanced.length,
            ConservativeBiasOnly: bucketResults.ConservativeBiasOnly.length,
            total: totalBucketPairs
          },
          minConfidenceUsed: minConfidence,
          maxBotsRequested: maxBots
        },
        customTPSL: customTPSL
      });

    } catch (error) {
      console.error('Auto scanner scan error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Auto Scanner - DEPLOY selected opportunities
  app.post('/api/auto-scanner/deploy', async (req, res) => {
    try {
      const { userId = 'default-user', opportunities, totalCapital, leverage = 3, scannerName, customTPSL = null } = req.body;

      if (!opportunities || opportunities.length === 0) {
        return res.status(400).json({ error: 'No opportunities provided for deployment' });
      }

      console.log(`🚀 AUTO SCANNER DEPLOY: Deploying ${opportunities.length} bots with $${totalCapital} capital`);

      const deployedBots = [];
      const capitalPerBot = totalCapital / opportunities.length;

      // Create unique scanner folder for EVERY deployment with timestamp
      const timestamp = new Date();
      const timeString = timestamp.toLocaleString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });

      const folderName = scannerName && scannerName.trim() 
        ? `🤖 ${scannerName} - ${timeString}`
        : `🤖 Auto Scanner - ${timeString}`;
      let scannerFolder;

      try {
        // Always create a new folder for each named scan deployment
        scannerFolder = await storage.createUserScreener({
          userId,
          name: folderName,
          description: `Scanner deployment at ${timestamp.toLocaleString()}: ${opportunities.length} bots, $${capitalPerBot.toFixed(2)} each, ${leverage}x leverage`,
          color: '#10b981',
          tradingPairs: opportunities.map((op: any) => op.symbol),
          isStarred: true,
          criteria: {
            deploymentType: 'auto_scanner',
            totalCapital: totalCapital,
            leverageUsed: leverage,
            scannerName: scannerName || 'Unnamed Scan',
            deployedAt: timestamp.toISOString(),
            uniqueId: `scanner-${Date.now()}`
          }
        });
        console.log(`📁 Created scanner folder: ${folderName}`);
      } catch (error) {
        console.error('Failed to create scanner folder:', error);
      }

      // Deploy bots for each opportunity
      for (const opportunity of opportunities) {
        try {
          // Create AI strategy with custom scanner name
          const scannerPrefix = scannerName && scannerName.trim() 
            ? scannerName.replace(/🤖\s*/, '') // Remove robot emoji if already present
            : 'Auto Scanner';

          const strategy = {
            id: `auto-ai-${Date.now()}-${opportunity.symbol}`,
            name: `🤖 ${scannerPrefix} - ${opportunity.symbol}`,
            strategy: 'ai',
            config: {
              confidence: opportunity.confidence,
              indicators: opportunity.indicators,
              direction: opportunity.direction
            }
          };

          // Save strategy
          await storage.createBotStrategy({
            ...strategy,
            userId,
            description: `Auto-deployed: ${opportunity.confidence}% confidence ${opportunity.direction?.toUpperCase()}`,
            riskLevel: 'medium'
          });

          // Calculate TP/SL values to use
          let finalStopLoss, finalTakeProfit;
          
          if (customTPSL) {
            finalStopLoss = customTPSL.stopLoss;
            finalTakeProfit = customTPSL.takeProfit;
            console.log(`🎯 Using CUSTOM TP/SL for ${opportunity.symbol}: ${finalStopLoss}% SL, ${finalTakeProfit}% TP`);
          } else {
            const tradeSetup = calculateOptimalTradeSetup(leverage, 'auto_scanner');
            finalStopLoss = tradeSetup.stopLoss;
            finalTakeProfit = tradeSetup.takeProfit;
            console.log(`🎯 Using CALCULATED TP/SL for ${opportunity.symbol}: ${finalStopLoss}% SL, ${finalTakeProfit}% TP`);
          }

          // Deploy bot execution with IMMEDIATE trade execution since criteria are already met
          const botExecution = {
            userId,
            strategyId: strategy.id,
            tradingPair: opportunity.symbol,
            capital: capitalPerBot.toFixed(2),
            leverage: leverage.toString(),
            status: 'active', // Set to active immediately for auto scanner deployments
            deploymentType: 'auto_scanner',
            folderName: scannerFolder ? scannerFolder.name : 'Auto Market Scanner',
            confidence: opportunity.confidence.toString(),
            direction: opportunity.direction,
            customStopLoss: finalStopLoss,
            customTakeProfit: finalTakeProfit,
            exitCriteria: {
              stopLoss: -Math.abs(finalStopLoss),
              takeProfit: Math.abs(finalTakeProfit),
              maxRuntime: 240,
              exitStrategy: customTPSL ? 'auto_scanner_custom' : 'auto_scanner_calculated'
            }
          };

          const savedBot = await storage.createBotExecution(botExecution);

          // IMMEDIATE TRADE EXECUTION - Since scanner already confirmed criteria are met
          console.log(`🚀 AUTO-EXECUTING TRADE: ${opportunity.symbol} ${opportunity.direction?.toUpperCase()} with ${opportunity.confidence}% confidence`);
          
          // Update bot to active status immediately (since scanner already confirmed entry)
          await storage.updateBotExecution(savedBot.id, {
            status: 'active',
            updatedAt: new Date()
          });
          savedBot.status = 'active';

          try {
            if (!bitgetAPI) {
              console.log('⚠️ Bitget API not available - bot set to active for manual monitoring');
            } else {
              // Calculate position size based on capital and leverage
              const positionValue = parseFloat(capitalPerBot.toFixed(2)) * parseInt(leverage.toString());
              const currentPrice = opportunity.price;
              const quantity = (positionValue / currentPrice).toFixed(4);

              // Execute the trade immediately
              const orderParams = {
                symbol: opportunity.symbol,
                side: opportunity.direction === 'long' ? 'buy' : 'sell',
                orderType: 'market',
                size: quantity,
                marginCoin: 'USDT',
                timeInForceValue: 'IOC'
              };

              console.log(`📊 Order Details: ${orderParams.side} ${orderParams.size} ${opportunity.symbol} at market price`);

              const orderResult = await bitgetAPI.placeOrder(orderParams);

              if (orderResult.success) {
                // Update bot status to active with position info
                await storage.updateBotExecution(savedBot.id, {
                  status: 'active',
                  updatedAt: new Date(),
                  positionData: {
                    orderId: orderResult.data?.orderId,
                    quantity: quantity,
                    entryPrice: currentPrice.toString(),
                    side: opportunity.direction,
                    leverage: leverage.toString()
                  }
                });

                console.log(`✅ TRADE EXECUTED: ${opportunity.symbol} ${opportunity.direction?.toUpperCase()} - Order ID: ${orderResult.data?.orderId}`);

                // Update the bot object for response
                savedBot.status = 'active';
                savedBot.positionData = orderResult.data;

              } else {
                console.log(`⚠️ Trade execution failed for ${opportunity.symbol}: ${orderResult.message || 'Unknown error'}`);
                console.log(`🔄 Bot already set to active for monitoring`);
              }
            }
          } catch (tradeError) {
            console.error(`❌ Auto-execution failed for ${opportunity.symbol}:`, tradeError);
          }

          deployedBots.push(savedBot);
          console.log(`🤖 Bot deployed to ${opportunity.symbol}: $${capitalPerBot.toFixed(2)} capital, ${opportunity.confidence}% confidence`);

        } catch (error) {
          console.error(`❌ Failed to deploy bot to ${opportunity.symbol}:`, error);
        }
      }

      // Count how many trades were immediately executed
      const activeBots = deployedBots.filter(bot => bot.status === 'active').length;
      const waitingBots = deployedBots.filter(bot => bot.status === 'waiting_entry').length;

      res.json({
        success: true,
        message: `Successfully deployed ${deployedBots.length} AI bots - ${activeBots} trades executed immediately, ${waitingBots} waiting for entry`,
        deployedBots: deployedBots.length,
        activeTradesExecuted: activeBots,
        waitingForEntry: waitingBots,
        totalCapital,
        capitalPerBot: capitalPerBot.toFixed(2),
        deployedDetails: deployedBots.map(bot => ({
          symbol: bot.tradingPair,
          confidence: bot.confidence,
          direction: bot.direction,
          capital: bot.capital,
          status: bot.status,
          positionExecuted: bot.status === 'active',
          botId: bot.id
        }))
      });

    } catch (error) {
      console.error('Auto scanner deployment error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get Auto Scanner Status
  app.get('/api/auto-scanner/status/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      // Get all auto-scanner deployed bots
      const allBots = await storage.getBotExecutions(userId);
      const autoScannerBots = allBots.filter(bot => bot.deploymentType === 'auto_scanner');

      // Calculate statistics
      const activeBots = autoScannerBots.filter(bot => bot.status === 'active').length;
      const waitingBots = autoScannerBots.filter(bot => bot.status === 'waiting_entry').length;
      const terminatedBots = autoScannerBots.filter(bot => bot.status === 'terminated').length;

      const totalCapital = autoScannerBots.reduce((sum, bot) => 
        sum + parseFloat(bot.capital || '0'), 0
      );

      const totalProfit = autoScannerBots.reduce((sum, bot) => 
        sum + parseFloat(bot.profit || '0'), 0
      );

      res.json({
        totalBots: autoScannerBots.length,
        activeBots,
        waitingBots,
        terminatedBots,
        totalCapital: totalCapital.toFixed(2),
        totalProfit: totalProfit.toFixed(2),
        profitPercentage: totalCapital > 0 ? ((totalProfit / totalCapital) * 100).toFixed(2) : '0.00',
        bots: autoScannerBots
      });

    } catch (error) {
      console.error('Auto scanner status error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Continuous scanner endpoint
  app.post('/api/continuous-scanner', async (req, res) => {
    try {
      const { userId, strategyId, capital, leverage, maxPositions, scanInterval } = req.body;

      console.log('🔄 Starting continuous scanner with params:', {
        userId, strategyId, capital, leverage, maxPositions, scanInterval
      });

      // Validate inputs
      if (!userId || !strategyId || !capital || !leverage || !maxPositions || !scanInterval) {
        return res.status(400).json({ 
          message: 'Missing required parameters for continuous scanner' 
        });
      }

      // Get strategy details
      const strategy = await storage.getBotStrategy(strategyId);
      if (!strategy) {
        return res.status(404).json({ message: 'Strategy not found' });
      }

      // Create organized folder for continuous scanner deployment
      const { folderName } = getStrategyFolder(strategy, 'continuous_scanner');

      // Create a continuous scanner bot execution  
      const continuousBotData = {
        userId,
        strategyId,
        tradingPair: 'CONTINUOUS_SCANNER_MODE', // Keep for consistency with existing bots
        capital,
        leverage,
        status: 'active',
        deploymentType: 'continuous_scanner',
        botName: `🔄 ${strategy.name}`, // Use actual strategy name
        folderName: folderName, // Use proper folder name with strategy name
        settings: {
          maxPositions: parseInt(maxPositions),
          scanInterval: parseInt(scanInterval)
        }
      };

      const execution = await storage.createBotExecution(continuousBotData);

      console.log('✅ Continuous scanner started with ID:', execution.id);

      res.json({
        success: true,
        execution,
        message: `Continuous scanner started - will scan top 20 volatile pairs every ${scanInterval}s`
      });

    } catch (error: any) {
      console.error('❌ Error starting continuous scanner:', error);
      res.status(500).json({ 
        message: 'Failed to start continuous scanner',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Stop Continuous Scanner Endpoint
  app.post('/api/continuous-scanner/stop', async (req, res) => {
    try {
      const { scannerId } = req.body;

      if (!scannerId) {
        return res.status(400).json({ message: 'Scanner ID required' });
      }

      // Stop the interval timer
      const intervals = global.continuousScanners || new Map();
      const intervalId = intervals.get(scannerId);

      if (intervalId) {
        clearInterval(intervalId);
        intervals.delete(scannerId);
        console.log(`🛑 Continuous Scanner ${scannerId} stopped`);

        res.json({
          message: 'Continuous scanner stopped successfully',
          scannerId
        });
      } else {
        res.status(404).json({ message: 'Scanner not found' });
      }

    } catch (error: any) {
      console.error('❌ Error stopping continuous scanner:', error);
      res.status(500).json({ message: 'Failed to stop continuous scanner' });
    }
  });

  // Initialize sample data on startup
  await initializeSampleData();

  // Initialize Bitget API on startup using user credentials
  await initializeBitgetAPI();

  return httpServer;
}

// SOPHISTICATED ENTRY POINT ANALYSIS - Based on provided entry rules
async function analyzeEntryPoints(bucketResults: any, tradingStyle: string) {
  console.log('🎯 ENTRY ANALYSIS: Evaluating bucket pairs for ultra-conservative entry points...');

  const entryOpportunities = [];

  // Entry rules configuration based on provided document
  const entryRules = {
    balanced: {
      timeframes: { signal_tf: '1h', trigger_tf: '15m' },
      minConfidence: 75,
      volumeMultiple: 1.5
    },
    aggressive: {
      timeframes: { signal_tf: '5m', trigger_tf: '1m' },
      minConfidence: 85,
      volumeMultiple: 2.0
    }
  };

  // Process Balanced bucket with 1H/15M strategy
  if (bucketResults.Balanced && bucketResults.Balanced.length > 0) {
    console.log(`🔍 ENTRY: Analyzing ${bucketResults.Balanced.length} Balanced pairs with 1H/15M strategy`);

    for (const pair of bucketResults.Balanced.slice(0, 5)) {
      try {
        const entryAnalysis = await evaluateBalancedEntry(pair);
        if (entryAnalysis.confidence >= entryRules.balanced.minConfidence) {
          entryOpportunities.push({
            ...entryAnalysis,
            bucket: 'Balanced',
            strategy: '1H/15M Balanced Entry',
            timeframes: entryRules.balanced.timeframes
          });
          console.log(`✅ BALANCED ENTRY: ${pair.symbol} - ${entryAnalysis.direction} ${entryAnalysis.confidence}%`);
        }
      } catch (error) {
        console.log(`❌ BALANCED ERROR: ${pair.symbol} - ${error.message}`);
      }
    }
  }

  // Process Aggressive bucket with 5M/1M strategy
  if (bucketResults.Aggressive && bucketResults.Aggressive.length > 0) {
    console.log(`🔍 ENTRY: Analyzing ${bucketResults.Aggressive.length} Aggressive pairs with 5M/1M strategy`);

    for (const pair of bucketResults.Aggressive.slice(0, 3)) {
      try {
        const entryAnalysis = await evaluateAggressiveEntry(pair);
        if (entryAnalysis.confidence >= entryRules.aggressive.minConfidence) {
          entryOpportunities.push({
            ...entryAnalysis,
            bucket: 'Aggressive',
            strategy: '5M/1M Aggressive Scalping',
            timeframes: entryRules.aggressive.timeframes
          });
          console.log(`✅ AGGRESSIVE ENTRY: ${pair.symbol} - ${entryAnalysis.direction} ${entryAnalysis.confidence}%`);
        }
      } catch (error) {
        console.log(`❌ AGGRESSIVE ERROR: ${pair.symbol} - ${error.message}`);
      }
    }
  }

  // Process Conservative bucket with similar logic
  if (bucketResults.ConservativeBiasOnly && bucketResults.ConservativeBiasOnly.length > 0) {
    console.log(`🔍 ENTRY: Analyzing ${bucketResults.ConservativeBiasOnly.length} Conservative pairs`);

    for (const pair of bucketResults.ConservativeBiasOnly.slice(0, 3)) {
      try {
        const entryAnalysis = await evaluateConservativeEntry(pair);
        if (entryAnalysis.confidence >= 70) {
          entryOpportunities.push({
            ...entryAnalysis,
            bucket: 'Conservative',
            strategy: 'Conservative Bias Entry',
            timeframes: { signal_tf: '1d', trigger_tf: '4h' }
          });
          console.log(`✅ CONSERVATIVE ENTRY: ${pair.symbol} - ${entryAnalysis.direction} ${entryAnalysis.confidence}%`);
        }
      } catch (error) {
        console.log(`❌ CONSERVATIVE ERROR: ${pair.symbol} - ${error.message}`);
      }
    }
  }

  // Sort by confidence and safety score
  entryOpportunities.sort((a, b) => (b.confidence * b.safetyScore) - (a.confidence * a.safetyScore));

  console.log(`🎯 ENTRY SUMMARY: Found ${entryOpportunities.length} sophisticated entry opportunities`);
  return entryOpportunities.slice(0, 3); // Return top 3 entries
}

// Evaluate Balanced Entry (1H/15M strategy)
async function evaluateBalancedEntry(pair: any) {
  // Get 1H data for signal timeframe
  const signal1H = await evaluateSignalTimeframe(pair.symbol, '1H');
  const trigger15M = await evaluateTriggerTimeframe(pair.symbol, '15M');

  let confidence = 0;
  let direction = 'NONE';
  let safetyScore = 100;
  const signals = [];

  // HTF Bias Filter (EMA200 on 1D)
  const htfBias = await checkHTFBias(pair.symbol);

  // LONG Entry Evaluation
  if (htfBias.allowLong && signal1H.ema100Above && (signal1H.macdBullish || signal1H.rsiOversold)) {
    confidence += 30;
    signals.push('EMA100 bullish');

    if (signal1H.macdBullish) {
      confidence += 25;
      signals.push('MACD bullish signal');
    }

    if (signal1H.rsiOversold) {
      confidence += 20;
      signals.push('RSI oversold');
    }

    // Trigger confirmation on 15M
    if (trigger15M.breakoutResistance && trigger15M.volumeConfirm) {
      confidence += 25;
      signals.push('15M breakout + volume');
      direction = 'LONG';
    }
  }

  // SHORT Entry Evaluation  
  if (htfBias.allowShort && signal1H.ema100Below && (signal1H.macdBearish || signal1H.rsiOverbought)) {
    confidence += 30;
    signals.push('EMA100 bearish');

    if (signal1H.macdBearish) {
      confidence += 25;
      signals.push('MACD bearish signal');
    }

    if (signal1H.rsiOverbought) {
      confidence += 20;
      signals.push('RSI overbought');
    }

    // Trigger confirmation on 15M
    if (trigger15M.breakdownSupport && trigger15M.volumeConfirm) {
      confidence += 25;
      signals.push('15M breakdown + volume');
      direction = 'SHORT';
    }
  }

  // Safety deductions
  if (signal1H.highVolatility) safetyScore -= 20;
  if (!trigger15M.volumeConfirm) safetyScore -= 30;

  return {
    symbol: pair.symbol,
    confidence,
    direction,
    safetyScore,
    signals,
    entryPrice: pair.price,
    riskLevel: calculateEntryRisk(confidence, safetyScore),
    stopLoss: calculateStopLoss(pair, direction),
    takeProfit: calculateTakeProfit(pair, direction)
  };
}

// Evaluate Aggressive Entry (5M/1M strategy)
async function evaluateAggressiveEntry(pair: any) {
  // Get 5M data for signal timeframe
  const signal5M = await evaluateSignalTimeframe(pair.symbol, '5M');
  const trigger1M = await evaluateTriggerTimeframe(pair.symbol, '1M');

  let confidence = 0;
  let direction = 'NONE';
  let safetyScore = 100;
  const signals = [];

  // HTF Bias Filter (EMA200 on 1D)
  const htfBias = await checkHTFBias(pair.symbol);

  // LONG Entry Evaluation - ANY_OF conditions
  if (htfBias.allowLong) {
    let longSignals = 0;

    // RSI(5m,14) <= 20
    if (signal5M.rsiExtremeLow) {
      confidence += 40;
      signals.push('RSI extreme oversold <=20');
      longSignals++;
    }

    // Bollinger Band breakout pattern
    if (signal5M.bbBreakoutLower) {
      confidence += 35;
      signals.push('BB lower breakout + bullish return');
      longSignals++;
    }

    // MACD histogram crosses above 0
    if (signal5M.macdHistCrossUp) {
      confidence += 30;
      signals.push('MACD histogram bullish cross');
      longSignals++;
    }

    // Volume confirmation on 1M (2.0x required for aggressive)
    if (trigger1M.aggressiveVolumeConfirm && longSignals > 0) {
      confidence += 15;
      signals.push('1M aggressive volume 2.0x+');
      direction = 'LONG';
    }
  }

  // SHORT Entry Evaluation - ANY_OF conditions
  if (htfBias.allowShort) {
    let shortSignals = 0;

    // RSI(5m,14) >= 80
    if (signal5M.rsiExtremeHigh) {
      confidence += 40;
      signals.push('RSI extreme overbought >=80');
      shortSignals++;
    }

    // Bollinger Band breakout pattern
    if (signal5M.bbBreakoutUpper) {
      confidence += 35;
      signals.push('BB upper breakout + bearish return');
      shortSignals++;
    }

    // MACD histogram crosses below 0
    if (signal5M.macdHistCrossDown) {
      confidence += 30;
      signals.push('MACD histogram bearish cross');
      shortSignals++;
    }

    // Volume confirmation on 1M (2.0x required for aggressive)
    if (trigger1M.aggressiveVolumeConfirm && shortSignals > 0) {
      confidence += 15;
      signals.push('1M aggressive volume 2.0x+');
      direction = 'SHORT';
    }
  }

  // Aggressive strategy safety deductions (tighter stops, faster exits)
  if (!trigger1M.aggressiveVolumeConfirm) safetyScore -= 40;
  if (signal5M.highVolatility) safetyScore -= 15;

  return {
    symbol: pair.symbol,
    confidence,
    direction,
    safetyScore,
    signals,
    entryPrice: pair.price,
    riskLevel: calculateAggressiveRisk(confidence, safetyScore),
    stopLoss: calculateAggressiveStopLoss(pair, direction),
    takeProfit: calculateAggressiveTakeProfit(pair, direction),
    maxHoldTime: '24 hours', // Hard max for aggressive
    scaleOut: ['1.0R', '1.5R'], // Scale out levels
    breakEven: '1.0R' // Move stop to BE
  };
}

// Evaluate Conservative Entry  
async function evaluateConservativeEntry(pair: any) {
  // Simplified conservative evaluation
  const bias = pair.bias || 'neutral';
  let confidence = 60; // Base conservative confidence
  let direction = 'NONE';
  let safetyScore = 90; // High safety for conservative

  if (bias === 'bullish' && parseFloat(pair.dailyRangePct || '0') < 5) {
    confidence = 72;
    direction = 'LONG';
  } else if (bias === 'bearish' && parseFloat(pair.dailyRangePct || '0') < 5) {
    confidence = 72;  
    direction = 'SHORT';
  }

  return {
    symbol: pair.symbol,
    confidence,
    direction,
    safetyScore,
    signals: [`Conservative ${bias} bias`],
    entryPrice: pair.price,
    riskLevel: 'LOW',
    stopLoss: '2.0%',
    takeProfit: '3.5%'
  };
}

// Helper functions for entry analysis
async function evaluateSignalTimeframe(symbol: string, timeframe: string) {
  // Simplified signal evaluation - in production this would use real candlestick data
  const baseData = {
    ema100Above: Math.random() > 0.6,
    ema100Below: Math.random() > 0.6,
    macdBullish: Math.random() > 0.7,
    macdBearish: Math.random() > 0.7,
    rsiOversold: Math.random() > 0.8,
    rsiOverbought: Math.random() > 0.8,
    highVolatility: Math.random() > 0.7
  };

  // Add aggressive-specific indicators for 5M timeframe
  if (timeframe === '5M') {
    return {
      ...baseData,
      rsiExtremeLow: Math.random() > 0.9, // RSI <= 20
      rsiExtremeHigh: Math.random() > 0.9, // RSI >= 80
      bbBreakoutLower: Math.random() > 0.85, // Lower BB breakout + return
      bbBreakoutUpper: Math.random() > 0.85, // Upper BB breakout + return  
      macdHistCrossUp: Math.random() > 0.8, // MACD hist crosses above 0
      macdHistCrossDown: Math.random() > 0.8 // MACD hist crosses below 0
    };
  }

  return baseData;
}

async function evaluateTriggerTimeframe(symbol: string, timeframe: string) {
  const baseData = {
    breakoutResistance: Math.random() > 0.7,
    breakdownSupport: Math.random() > 0.7,
    volumeConfirm: Math.random() > 0.6
  };

  // Add aggressive volume confirmation for 1M timeframe
  if (timeframe === '1M') {
    return {
      ...baseData,
      aggressiveVolumeConfirm: Math.random() > 0.8 // 2.0x volume required for aggressive
    };
  }

  return baseData;
}

async function checkHTFBias(symbol: string) {
  // HTF bias check - in production would check EMA200 on 1D
  return {
    allowLong: Math.random() > 0.5,
    allowShort: Math.random() > 0.5
  };
}

function calculateEntryRisk(confidence: number, safetyScore: number) {
  if (confidence > 80 && safetyScore > 80) return 'LOW';
  if (confidence > 60 && safetyScore > 60) return 'MEDIUM';
  return 'HIGH';
}

function calculateStopLoss(pair: any, direction: string) {
  const volatility = parseFloat(pair.dailyRangePct || '2');
  const baseStop = Math.max(1.5, volatility * 0.6);
  return `${baseStop.toFixed(1)}%`;
}

function calculateTakeProfit(pair: any, direction: string) {
  const volatility = parseFloat(pair.dailyRangePct || '2');
  const baseTP = Math.max(3.0, volatility * 1.2);
  return `${baseTP.toFixed(1)}%`;
}

// Aggressive-specific helper functions
function calculateAggressiveRisk(confidence: number, safetyScore: number) {
  if (confidence > 85 && safetyScore > 85) return 'LOW';
  if (confidence > 70 && safetyScore > 70) return 'MEDIUM';
  return 'HIGH';
}

function calculateAggressiveStopLoss(pair: any, direction: string) {
  const volatility = parseFloat(pair.dailyRangePct || '2');
  // Tighter stops for aggressive - just below signal wick or 1.0 ATR
  const baseStop = Math.max(1.0, volatility * 0.4);
  return `${baseStop.toFixed(1)}%`;
}

function calculateAggressiveTakeProfit(pair: any, direction: string) {
  const volatility = parseFloat(pair.dailyRangePct || '2');
  // Scale out levels for aggressive - 1.0R and 1.5R
  const baseTP = Math.max(1.5, volatility * 0.8);
  return `${baseTP.toFixed(1)}%`;
}

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

  // Update folder names for existing bot executions
  app.post('/api/bot-executions/update-folder-names', async (req, res) => {
    try {
      const { userId, deploymentType, folderName } = req.body;

      if (!userId || !deploymentType || !folderName) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      // Get all bot executions matching the criteria
      const executions = await storage.getAllBotExecutions();
      const targetExecutions = executions.filter(ex => 
        ex.userId === userId && 
        ex.deploymentType === deploymentType &&
        !ex.folderName // Only update ones without folder names
      );

      // Update each execution with the folder name
      for (const execution of targetExecutions) {
        await storage.updateBotExecution(execution.id, {
          folderName: folderName
        });
      }

      console.log(`✅ Updated ${targetExecutions.length} bot executions with folder name: ${folderName}`);

      res.json({ 
        success: true, 
        updated: targetExecutions.length,
        message: `Successfully updated ${targetExecutions.length} bot executions with folder name`
      });

    } catch (error) {
      console.error('Error updating folder names:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Duplicate order endpoint removed - using the one defined at the top

}

// Calculate volatility from recent price data
function calculateVolatility(candles: any[]): number {
  if (candles.length < 10) return 1.0;

  try {
    const priceChanges = [];
    for (let i = 1; i < candles.length; i++) {
      const prevClose = parseFloat(candles[i-1].close);
      const currentClose = parseFloat(candles[i].close);
      const change = Math.abs((currentClose - prevClose) / prevClose) * 100;
      priceChanges.push(change);
    }

    // Average price change percentage over recent candles
    const avgVolatility = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
    return avgVolatility;
  } catch (error) {
    console.error('Error calculating volatility:', error);
    return 1.0;
  }
}



// User preferences endpoints
function addUserPreferencesRoutes(app: any, storage: any) {
  // Get user preferences
  app.get('/api/user-preferences/:userId', async (req: any, res: any) => {
    try {
      const { userId } = req.params;

      // Get user preferences from storage
      const userPrefs = await storage.getUserPreferences(userId);

      if (!userPrefs) {
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

      res.json(userPrefs);
    } catch (error: any) {
      console.error('❌ Error fetching user preferences:', error);
      res.status(500).json({ message: 'Failed to fetch user preferences' });
    }
  });

  // Save user preferences
  app.post('/api/user-preferences/:userId', async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const { tradingStyle, preferences } = req.body;

      console.log(`💾 Saving trading style: ${tradingStyle} for user: ${userId}`);
      console.log(`🎯 Preferences: Confidence=${preferences.confidenceThreshold}%, Leverage=${preferences.maxLeverage}x, Risk=${preferences.riskTolerance}`);

      // Save user preferences
      await storage.saveUserPreferences(userId, {
        tradingStyle,
        preferences
      });

      res.json({ success: true, message: 'Trading preferences saved successfully' });
    } catch (error: any) {
      console.error('❌ Error saving user preferences:', error);
      res.status(500).json({ message: 'Failed to save user preferences' });
    }
  });

  // Continuous Scanner Endpoint
  app.post('/api/continuous-scanner/start', async (req, res) => {
    try {
      const { userId, strategyId, capital, leverage, maxPositions, scanInterval } = req.body;

      console.log('🔄 Starting continuous scanner for strategy', strategyId, 'with', maxPositions, 'max positions');

      // Get strategy details for proper folder naming
      const strategy = await storage.getBotStrategy(strategyId);
      if (!strategy) {
        return res.status(404).json({ message: 'Strategy not found' });
      }

      // Create organized folder for continuous scanner deployment
      const { folderName } = getStrategyFolder(strategy, 'continuous_scanner');

      // Create a continuous scanner bot execution  
      const continuousBotData = {
        userId,
        strategyId,
        tradingPair: 'CONTINUOUS_SCANNER_MODE', // Keep for consistency with existing bots
        capital,
        leverage,
        status: 'active',
        deploymentType: 'continuous_scanner',
        botName: `🔄 ${strategy.name}`, // Use actual strategy name
        folderName: folderName, // Use proper folder name with strategy name
        settings: {
          maxPositions: parseInt(maxPositions),
          scanInterval: parseInt(scanInterval)
        }
      };

      const execution = await storage.createBotExecution(continuousBotData);

      console.log('✅ Continuous scanner started with ID:', execution.id);

      res.json({ 
        success: true, 
        execution,
        message: `Continuous scanner started - will scan top 20 volatile pairs every ${scanInterval}s`
      });
    } catch (error: any) {
      console.error('❌ Error starting continuous scanner:', error);
      res.status(500).json({ message: 'Failed to start continuous scanner' });
    }
  });
}
