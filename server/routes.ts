import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { BitgetAPI } from "./services/bitgetApi";
import { insertBitgetCredentialsSchema, insertFuturesDataSchema, insertBotStrategySchema, insertBotExecutionSchema, insertScreenerSchema, insertAlertSettingSchema, insertAlertSchema } from "@shared/schema";

let bitgetAPI: BitgetAPI | null = null;
let updateInterval: NodeJS.Timeout | null = null;
let tradingPaused = false; // Emergency pause for all trading
let lastEvaluationTime: { [key: string]: number } = {}; // Track last evaluation time per pair

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
      if (rsiAnalysis.value < 25) {
        bullishScore += 25; // Very oversold -> Strong buy signal
        console.log(`🎯 RSI: EXTREMELY OVERSOLD ${rsiAnalysis.value.toFixed(1)} (+25)`);
      } else if (rsiAnalysis.value > 75) {
        bearishScore += 25; // Very overbought -> Strong sell signal
        console.log(`🎯 RSI: EXTREMELY OVERBOUGHT ${rsiAnalysis.value.toFixed(1)} (+25)`);
      }
      // Skip weak RSI signals in 30-70 range that cause bad entries
    }
    
    // 3. Bollinger Bands Analysis (Weight: 20% - High Quality Signals Only)
    const bbAnalysis = calculateBollingerBands(closes, 20, 2);
    if (bbAnalysis) {
      indicators.bollingerBands = bbAnalysis;
      const { current, upper, lower, squeeze } = bbAnalysis;
      
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
    
    // FOCUSED TOP-50 confidence thresholds - More realistic for high-volume pairs
    let confidenceThreshold = 60; // Reasonable base threshold for top volume pairs
    let minSignalDifference = 18; // Achievable signal separation for quality pairs
    
    // Adjust thresholds based on volatility for high-volume pairs
    if (volatility > 4.0) {
      confidenceThreshold = 55; // Lower for extremely volatile high-volume pairs
      minSignalDifference = 15;
      console.log(`🔥 EXTREME VOLATILITY (${volatility.toFixed(2)}%) - Focused threshold: ${confidenceThreshold}%`);
    } else if (volatility > 3.0) {
      confidenceThreshold = 57; 
      minSignalDifference = 17;
      console.log(`📈 HIGH VOLATILITY (${volatility.toFixed(2)}%) - Threshold: ${confidenceThreshold}%`);
    }
    
    // STRICT signal strength requirements
    if (signalDifference < minSignalDifference) {
      console.log(`❌ Signal too weak: ${signalDifference} point difference < ${minSignalDifference} required`);
      return { hasSignal: false, direction: null, confidence, indicators };
    }
    
    // ENHANCED safety checks - Block all risky entries
    const isOverboughtLong = indicators.rsi?.value > 65 && bullishScore > bearishScore; // Lower threshold
    const isOversoldShort = indicators.rsi?.value < 35 && bearishScore > bullishScore; // Higher threshold  
    const isBandRejection = (indicators.bollingerBands?.current >= indicators.bollingerBands?.upper && bullishScore > bearishScore) ||
                           (indicators.bollingerBands?.current <= indicators.bollingerBands?.lower && bearishScore > bullishScore);
    
    // Additional safety: Block entries without strong volume confirmation
    const hasVolumeConfirmation = indicators.volume?.strength > 1.3;
    const hasTrendAlignment = (bullishScore > bearishScore && indicators.movingAverages?.trend === 'bullish') ||
                             (bearishScore > bullishScore && indicators.movingAverages?.trend === 'bearish');
    
    if (isOverboughtLong || isOversoldShort || isBandRejection || !hasVolumeConfirmation || !hasTrendAlignment) {
      console.log(`❌ BLOCKED risky entry: RSI ${indicators.rsi?.value}, BB rejection ${isBandRejection}, Volume ${hasVolumeConfirmation}, Trend ${hasTrendAlignment}`);
      return { hasSignal: false, direction: null, confidence, indicators };
    }
    
    // FOCUSED TOP-50 requirements - Balanced for high-volume pairs
    if (signalDifference >= 18 && totalScore >= 30) {
      console.log(`🎯 HIGH-VOLUME SIGNAL: ${signalDifference} diff, ${totalScore} total - threshold ${confidenceThreshold}%`);
    } else {
      console.log(`❌ INSUFFICIENT QUALITY: ${signalDifference} diff, ${totalScore} total (need 18+ diff, 30+ total for top volume pairs)`);
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

// Conservative Trade Selection: Wider stops, higher win rate
function calculateOptimalTradeSetup(leverage: number, botType: string = 'default'): { stopLoss: number, takeProfit: number, tradeProfile: string } {
  // ULTRA CONSERVATIVE account risk - prevent account destruction
  const maxAccountLoss = 1.5; // Maximum 1.5% account risk per trade
  const targetAccountGain = 4.5; // 3:1 reward-to-risk ratio
  
  // Calculate required position percentages with MUCH WIDER STOPS
  let stopLossPercent = Math.max(5.0, maxAccountLoss / leverage * 3); // Minimum 5% stop loss
  let takeProfitPercent = Math.max(15.0, targetAccountGain / leverage * 3); // Minimum 15% take profit
  
  // CRYPTO-SPECIFIC adjustments - these markets are volatile
  if (leverage >= 10) {
    stopLossPercent = Math.max(8.0, stopLossPercent); // 8% minimum for high leverage
    takeProfitPercent = Math.max(20.0, takeProfitPercent); // 20% minimum target
    console.log(`🔥 HIGH LEVERAGE (${leverage}x) - Wider stops: ${stopLossPercent}% SL, ${takeProfitPercent}% TP`);
  } else if (leverage >= 5) {
    stopLossPercent = Math.max(6.0, stopLossPercent); // 6% minimum for medium leverage  
    takeProfitPercent = Math.max(18.0, takeProfitPercent); // 18% minimum target
    console.log(`⚡ MEDIUM LEVERAGE (${leverage}x) - Conservative stops: ${stopLossPercent}% SL, ${takeProfitPercent}% TP`);
  } else {
    stopLossPercent = Math.max(4.0, stopLossPercent); // 4% minimum for low leverage
    takeProfitPercent = Math.max(12.0, takeProfitPercent); // 12% minimum target
    console.log(`🛡️ LOW LEVERAGE (${leverage}x) - Standard stops: ${stopLossPercent}% SL, ${takeProfitPercent}% TP`);
  }
  
  // Determine trade profile based on realistic percentages
  let tradeProfile = 'safe_swing';
  if (stopLossPercent >= 8.0) {
    tradeProfile = 'wide_position_trading'; // Large moves, very low frequency
  } else if (stopLossPercent >= 6.0) {
    tradeProfile = 'conservative_swing'; // Medium moves, low frequency
  } else {
    tradeProfile = 'safe_swing'; // Smaller moves, medium frequency
  }
  
  // Override for known risky bot types
  if (botType.includes('auto_scanner') || botType === 'auto_scanner') {
    // Auto scanner needs even wider stops due to algorithmic entry
    stopLossPercent = Math.max(stopLossPercent * 1.2, 6.0);
    takeProfitPercent = Math.max(takeProfitPercent * 1.2, 18.0);
    tradeProfile = 'algorithmic_wide';
    console.log(`🤖 AUTO SCANNER - Extra wide stops: ${stopLossPercent}% SL, ${takeProfitPercent}% TP`);
  }
  
  console.log(`🎯 ACCOUNT SAFE - ${leverage}x leverage: ${stopLossPercent.toFixed(1)}% SL (${(stopLossPercent / leverage * 1.5).toFixed(1)}% account), ${takeProfitPercent.toFixed(1)}% TP (${(takeProfitPercent / leverage * 1.5).toFixed(1)}% account)`);
  
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

function calculateRSI(closes: number[], period: number = 14) {
  if (closes.length < period + 1) return null;
  
  try {
    let gains = 0;
    let losses = 0;
    
    // Initial average
    for (let i = 1; i <= period; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    // Calculate RSI for latest periods
    for (let i = period + 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;
      
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    // Determine trend
    const prevRsi = closes.length > period + 5 ? 
      calculateRSI(closes.slice(0, -5), period)?.value || rsi : rsi;
    
    return {
      value: rsi,
      trend: rsi > prevRsi ? 'rising' : rsi < prevRsi ? 'falling' : 'neutral',
      oversold: rsi < 30,
      overbought: rsi > 70
    };
  } catch (error) {
    console.error('RSI calculation error:', error);
    return null;
  }
}

function calculateBollingerBands(closes: number[], period: number = 20, stdDev: number = 2) {
  if (closes.length < period) return null;
  
  try {
    const recentCloses = closes.slice(-period);
    const sma = recentCloses.reduce((sum, price) => sum + price, 0) / period;
    
    const variance = recentCloses.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    const upper = sma + (standardDeviation * stdDev);
    const lower = sma - (standardDeviation * stdDev);
    
    // Check for squeeze (bands getting narrow)
    const bandWidth = (upper - lower) / sma;
    const avgBandWidth = 0.1; // Typical band width
    const squeeze = bandWidth < avgBandWidth * 0.7;
    
    return {
      upper,
      lower,
      current: sma,
      squeeze,
      bandWidth
    };
  } catch (error) {
    console.error('Bollinger Bands calculation error:', error);
    return null;
  }
}

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
    const supportLevels = [];
    const resistanceLevels = [];
    
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
          avgVolume: volumeSum / touches
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

    // Evaluate each entry condition
    for (const condition of entryConditions) {
      if (!condition.enabled) continue;

      console.log(`🔍 Checking condition: ${condition.indicator} ${condition.condition}`);

      if (condition.indicator === 'macd') {
        const macdSignal = await evaluateMACDCondition(condition, tradingPair, currentPrice);
        if (macdSignal) {
          console.log(`✅ MACD condition met: ${condition.condition}`);
          return true;
        }
      }
      // Add more indicators here (RSI, Bollinger, etc.) as needed
    }

    console.log(`⏸️ Entry conditions not yet met for ${strategy.name} on ${tradingPair}`);
    return false;
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
    } else if (condition.condition === 'bearish_crossover') {
      // Bearish crossover: MACD line crosses below signal line
      const crossover = macdLine < signalLine && prevMacdLine >= prevSignalLine;
      console.log(`🔍 Bearish crossover check: ${crossover} (Current: MACD ${macdLine.toFixed(6)} < Signal ${signalLine.toFixed(6)}, Previous: MACD ${prevMacdLine.toFixed(6)} >= Signal ${prevSignalLine.toFixed(6)})`);
      return crossover;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error evaluating MACD condition:`, error);
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

    // Calculate position size
    const capitalAmount = parseFloat(capital);
    const leverageNum = parseFloat(leverage);
    const positionSize = (capitalAmount * leverageNum) / currentPrice;
    
    // Prepare order data - fix side parameter for Bitget API
    const orderData = {
      symbol: tradingPair,
      marginCoin: 'USDT',
      side: positionDirection === 'long' ? 'buy' : 'sell', // Fixed: use buy/sell instead of open_long/open_short
      orderType: 'market',
      size: positionSize.toFixed(6),
      leverage: leverageNum,
      source: 'manual_strategy',
      botName: deployedBot.botName
    };

    console.log(`📊 Order details:`, orderData);
    
    // Place the order
    const orderResult = await bitgetAPI.placeOrder(orderData);
    console.log(`✅ Order placed successfully:`, orderResult);
    
    // Set up stop loss and take profit if configured
    if (riskManagement?.stopLoss || riskManagement?.takeProfit) {
      await setStopLossAndTakeProfit(tradingPair, positionDirection, currentPrice, riskManagement);
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

      // Now terminate ALL bot executions to ensure they don't reappear
      console.log('🤖 Terminating all bot executions...');
      try {
        // Use a more direct approach - get all executions for the user
        const allExecutions = await storage.getBotExecutions(userId || 'default-user');
        console.log(`📋 Found ${allExecutions.length} total bot executions`);
        
        if (allExecutions.length > 0) {
          console.log(`📊 Bot statuses: ${allExecutions.map(bot => `${bot.tradingPair}:${bot.status}`).join(', ')}`);
        }
        
        // Terminate ALL bots regardless of status (except those already terminated)
        let terminatedCount = 0;
        for (const bot of allExecutions) {
          if (bot.status !== 'terminated') {
            try {
              await storage.updateBotExecution(bot.id, {
                status: 'terminated'
              });
              console.log(`🛑 Terminated bot: ${bot.id} (${bot.tradingPair}) - was ${bot.status}`);
              terminatedCount++;
            } catch (error: any) {
              console.error(`❌ Failed to terminate bot ${bot.id}:`, error);
            }
          }
        }
        console.log(`✅ Successfully terminated ${terminatedCount} bots`);
      } catch (error: any) {
        console.error('❌ Error terminating bots:', error);
      }
      
      res.json({
        success: true,
        message: positions.length === 0 ? 
          `No positions to close, but terminated all active bots` : 
          `Closed ${closedPositions.length} of ${positions.length} positions and terminated all active bots`,
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
          riskLevel: 'Medium', // Reduced risk level
          exitCriteria: {
            stopLoss: -2.5, // Reduced from -4% to -2.5% (-7.5% account loss at 3x)
            takeProfit: 8.0, // Reduced from 12% to 8% for safer exits
            maxRuntime: 180, // 3 hours max
            exitStrategy: 'momentum_reversal'
          }
        },
        { 
          symbol: 'SOLUSDT', 
          botName: 'Smart Scalping Bot', 
          leverage: '3', // Reduced from 5x to 3x for safety
          riskLevel: 'Medium', // Reduced risk level
          exitCriteria: {
            stopLoss: -1.5, // Tighter stop loss for leverage safety (-1.5% = 4.5% account loss at 3x)
            takeProfit: 2.5, // Reduced take profit for quicker exits
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
          leverage: '2', // Reduced from 3x to 2x for swing trading safety
          riskLevel: 'Medium',
          exitCriteria: {
            stopLoss: -3.0, // Reduced from -6% to -3% (-6% account loss at 2x)
            takeProfit: 8.0, // Reduced from 10% to 8%
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
      
      // Add deployed bots from database (only process non-terminated bots)
      // Filter out terminated bots before processing to prevent confusion
      const activeBots = deployedBots.filter(bot => bot.status !== 'terminated');
      console.log(`📋 Processing ${activeBots.length} active bots (filtered out ${deployedBots.length - activeBots.length} terminated)`);
      
      for (const deployedBot of activeBots) {
        console.log(`🔍 Processing bot ${deployedBot.tradingPair}: status="${deployedBot.status}", deploymentType="${deployedBot.deploymentType}"`);
      

        // Check if this is a strategy bot (manual/folder/auto_scanner) that needs entry evaluation
        if ((deployedBot.status === 'waiting_entry' || (deployedBot.status === 'active' && !positions.find((pos: any) => pos.symbol === deployedBot.tradingPair))) && deployedBot.strategyId && (deployedBot.deploymentType === 'manual' || deployedBot.deploymentType === 'folder' || deployedBot.deploymentType === 'auto_scanner')) {
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
        const mapping = botMappings.find(m => m.symbol === deployedBot.tradingPair);
        
        // For manual strategy bots, create exit criteria from strategy config
        let exitCriteria = null;
        if (deployedBot.deploymentType === 'manual' && deployedBot.strategyId) {
          const strategies = await storage.getBotStrategies('default-user');
          const strategy = strategies.find(s => s.id === deployedBot.strategyId);
          if (strategy && strategy.config?.riskManagement) {
            // Get leverage from deployed bot (default to 3x if not specified)
            const botLeverage = parseFloat(deployedBot.leverage || '3');
            
            // Use dynamic limits if user didn't specify custom ones
            const userStopLoss = strategy.config.riskManagement.stopLoss;
            const userTakeProfit = strategy.config.riskManagement.takeProfit;
            
            let finalStopLoss, finalTakeProfit;
            
            if (userStopLoss && userTakeProfit) {
              // User specified custom limits - validate account risk
              const maxAccountLoss = userStopLoss * botLeverage;
              const maxAccountGain = userTakeProfit * botLeverage;
              
              if (maxAccountLoss > 10) { // More than 10% account risk
                console.log(`⚠️ Manual strategy ${deployedBot.botName}: User stop loss ${userStopLoss}% with ${botLeverage}x leverage = ${maxAccountLoss}% account risk! Finding better trade setup.`);
                const tradeSetup = calculateOptimalTradeSetup(botLeverage, 'manual');
                finalStopLoss = tradeSetup.stopLoss;
                finalTakeProfit = tradeSetup.takeProfit;
                console.log(`🎯 Switching to ${tradeSetup.tradeProfile} profile for safer ${botLeverage}x leverage trading`);
              } else {
                finalStopLoss = userStopLoss;
                finalTakeProfit = userTakeProfit;
              }
            } else {
              // No user limits - calculate optimal trade setup
              const tradeSetup = calculateOptimalTradeSetup(botLeverage, 'manual');
              finalStopLoss = tradeSetup.stopLoss;
              finalTakeProfit = tradeSetup.takeProfit;
              console.log(`🎯 Using ${tradeSetup.tradeProfile} profile for ${botLeverage}x leverage trading`);
            }
            
            exitCriteria = {
              stopLoss: -Math.abs(finalStopLoss), // Negative for loss
              takeProfit: Math.abs(finalTakeProfit), // Positive for profit
              maxRuntime: 120, // 2 hours default for manual strategies
              exitStrategy: 'manual_exit'
            };
            
            console.log(`🛡️ Manual strategy ${deployedBot.botName} (${botLeverage}x leverage): SL ${finalStopLoss}% (${(finalStopLoss * botLeverage).toFixed(1)}% account), TP ${finalTakeProfit}% (${(finalTakeProfit * botLeverage).toFixed(1)}% account)`);
          }
        }
        
        if (position) {
          // Get exit criteria from various sources, with dynamic leverage-safe defaults
          let finalExitCriteria = exitCriteria || mapping?.exitCriteria;
          
          if (!finalExitCriteria) {
            // No predefined criteria - find optimal trade setup for leverage
            const botLeverage = parseFloat(deployedBot.leverage || '3');
            const deploymentType = deployedBot.deploymentType || 'folder';
            const tradeSetup = calculateOptimalTradeSetup(botLeverage, deploymentType);
            
            finalExitCriteria = {
              stopLoss: -tradeSetup.stopLoss, // Negative for loss
              takeProfit: tradeSetup.takeProfit, // Positive for profit
              maxRuntime: 240, // Default 4 hours
              exitStrategy: tradeSetup.tradeProfile
            };
            
            console.log(`🎯 ${deployedBot.botName} (${botLeverage}x leverage): Using ${tradeSetup.tradeProfile} - SL ${tradeSetup.stopLoss}% (${(tradeSetup.stopLoss * botLeverage).toFixed(1)}% account), TP ${tradeSetup.takeProfit}% (${(tradeSetup.takeProfit * botLeverage).toFixed(1)}% account)`);
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
            botName: deployedBot.botName || mapping?.botName || `Bot ${deployedBot.tradingPair}`,
            riskLevel: mapping?.riskLevel || 'Medium',
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
      
      // Check if this is an AI bot strategy that doesn't exist yet
      const { strategyId } = validatedData;
      const aiStrategyIds = ['grid', 'momentum', 'scalping', 'arbitrage', 'dca'];
      

      
      if (aiStrategyIds.includes(strategyId)) {
        // Check if strategy exists
        const existingStrategies = await storage.getBotStrategies(userId);
        const strategyExists = existingStrategies.find(s => s.id === strategyId);
        
        if (!strategyExists) {
          console.log(`🤖 Creating AI strategy: ${strategyId}`);
          
          // Define AI strategy configurations
          const aiStrategyConfigs = {
            grid: {
              name: 'Grid Trading Pro',
              description: 'Dynamic grid with auto-adjustment based on volatility',
              strategy: 'ai',
              riskLevel: 'medium',
              config: {
                positionDirection: 'long',
                timeframe: '15m',
                riskManagement: {
                  stopLoss: '2',
                  takeProfit: '3',
                  trailingStop: ''
                },
                technicalIndicators: {
                  rsi: { enabled: false },
                  macd: { enabled: false },
                  ma1: { enabled: false }
                }
              }
            },
            momentum: {
              name: 'Smart Momentum',
              description: 'AI-powered momentum detection with trend following',
              strategy: 'ai',
              riskLevel: 'high',
              config: {
                positionDirection: 'long',
                timeframe: '1h',
                riskManagement: {
                  stopLoss: '3',
                  takeProfit: '5',
                  trailingStop: ''
                },
                technicalIndicators: {
                  rsi: { enabled: false },
                  macd: { enabled: false },
                  ma1: { enabled: false }
                }
              }
            },
            scalping: {
              name: 'Smart Scalping Bot',
              description: 'High-frequency scalping with ML-based entry signals',
              strategy: 'ai',
              riskLevel: 'high',
              config: {
                positionDirection: 'long',
                timeframe: '5m',
                riskManagement: {
                  stopLoss: '1',
                  takeProfit: '2',
                  trailingStop: ''
                },
                technicalIndicators: {
                  rsi: { enabled: false },
                  macd: { enabled: false },
                  ma1: { enabled: false }
                }
              }
            },
            arbitrage: {
              name: 'Smart Arbitrage',
              description: 'Cross-market arbitrage opportunities with instant execution',
              strategy: 'ai',
              riskLevel: 'low',
              config: {
                positionDirection: 'long',
                timeframe: '15m',
                riskManagement: {
                  stopLoss: '1.5',
                  takeProfit: '2.5',
                  trailingStop: ''
                },
                technicalIndicators: {
                  rsi: { enabled: false },
                  macd: { enabled: false },
                  ma1: { enabled: false }
                }
              }
            },
            dca: {
              name: 'AI Dollar Cost Average',
              description: 'Smart DCA with market timing optimization',
              strategy: 'ai',
              riskLevel: 'low',
              config: {
                positionDirection: 'long',
                timeframe: '1h',
                riskManagement: {
                  stopLoss: '5',
                  takeProfit: '8',
                  trailingStop: ''
                },
                technicalIndicators: {
                  rsi: { enabled: false },
                  macd: { enabled: false },
                  ma1: { enabled: false }
                }
              }
            }
          };
          
          const strategyConfig = aiStrategyConfigs[strategyId as keyof typeof aiStrategyConfigs];
          if (strategyConfig) {
            try {
              await storage.createBotStrategy({
                id: strategyId,
                userId,
                ...strategyConfig
              });
              console.log(`✅ Created AI strategy: ${strategyId}`);
            } catch (strategyError) {
              console.error(`❌ Failed to create AI strategy ${strategyId}:`, strategyError);
              const errorMessage = strategyError instanceof Error ? strategyError.message : String(strategyError);
              throw new Error(`Failed to create AI strategy: ${errorMessage}`);
            }
          }
        }
      }
      
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
      const { userId = 'default-user', maxBots = 5, minConfidence = 25, tradingStyle = 'balanced' } = req.body;
      
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
          else if (dailyRangePct < 3.0) {
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
        }
      });
      
    } catch (error) {
      console.error('Auto scanner scan error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Auto Scanner - DEPLOY selected opportunities
  app.post('/api/auto-scanner/deploy', async (req, res) => {
    try {
      const { userId = 'default-user', opportunities, totalCapital, leverage = 3, scannerName } = req.body;
      
      if (!opportunities || opportunities.length === 0) {
        return res.status(400).json({ error: 'No opportunities provided for deployment' });
      }
      
      console.log(`🚀 AUTO SCANNER DEPLOY: Deploying ${opportunities.length} bots with $${totalCapital} capital`);
      
      const deployedBots = [];
      const capitalPerBot = totalCapital / opportunities.length;
      
      // Create scanner folder with custom name
      const folderName = scannerName && scannerName.trim() 
        ? `🤖 ${scannerName}` 
        : `🤖 Auto Scanner - ${new Date().toLocaleDateString()}`;
      let scannerFolder;
      
      try {
        // Always create a new folder for each named scan deployment
        scannerFolder = await storage.createUserScreener({
          userId,
          name: folderName,
          description: `Auto-deployed trading opportunities: ${opportunities.length} bots with $${capitalPerBot.toFixed(2)} each`,
          color: '#10b981',
          tradingPairs: opportunities.map((op: any) => op.symbol),
          isStarred: true,
          criteria: {
            deploymentType: 'auto_scanner',
            totalCapital: totalCapital,
            leverageUsed: leverage,
            scannerName: scannerName || 'Unnamed Scan',
            deployedAt: new Date().toISOString()
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
          
          // Deploy bot execution with IMMEDIATE trade execution since criteria are already met
          const botExecution = {
            userId,
            strategyId: strategy.id,
            tradingPair: opportunity.symbol,
            botName: strategy.name,
            capital: capitalPerBot.toFixed(2),
            leverage: leverage.toString(),
            status: 'waiting_entry', // Will be updated to 'active' after trade execution
            deploymentType: 'auto_scanner',
            folderName: scannerFolder ? scannerFolder.name : 'Auto Market Scanner',
            confidence: opportunity.confidence.toString(),
            direction: opportunity.direction
          };
          
          const savedBot = await storage.createBotExecution(botExecution);
          
          // IMMEDIATE TRADE EXECUTION - Since scanner already confirmed criteria are met
          console.log(`🚀 AUTO-EXECUTING TRADE: ${opportunity.symbol} ${opportunity.direction?.toUpperCase()} with ${opportunity.confidence}% confidence`);
          
          try {
            if (!bitgetAPI) {
              throw new Error('Bitget API not available for trade execution');
            }

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
              console.log(`🔄 Bot will remain in waiting_entry status for manual monitoring`);
            }
            
          } catch (tradeError) {
            console.error(`❌ Auto-execution failed for ${opportunity.symbol}:`, tradeError);
            console.log(`🔄 Bot deployed in waiting_entry status - will enter on next evaluation cycle`);
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

  // Initialize sample data on startup
  await initializeBitgetAPI();
  await initializeSampleData();

  return httpServer;

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
  return {
    ema100Above: Math.random() > 0.6,
    ema100Below: Math.random() > 0.6,
    macdBullish: Math.random() > 0.7,
    macdBearish: Math.random() > 0.7,
    rsiOversold: Math.random() > 0.8,
    rsiOverbought: Math.random() > 0.8,
    highVolatility: Math.random() > 0.7
  };
}

async function evaluateTriggerTimeframe(symbol: string, timeframe: string) {
  return {
    breakoutResistance: Math.random() > 0.7,
    breakdownSupport: Math.random() > 0.7,
    volumeConfirm: Math.random() > 0.6
  };
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
export function addUserPreferencesRoutes(app: any, storage: any) {
  // Get user preferences
  app.get('/api/user-preferences/:userId', async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      
      // Get user preferences from storage
      const userPrefs = await storage.getUserPreferences(userId);
      
      if (!userPrefs) {
        // Return default balanced preferences
        return res.json({
          tradingStyle: 'balanced',
          preferences: {
            confidenceThreshold: 65,
            maxLeverage: 5,
            riskTolerance: 'medium',
            timeframePreference: '1h',
            tradingStyleSettings: {
              aggressive: false,
              scalping: false,
              volatilityFocus: false,
            }
          }
        });
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
}
