import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useBitgetData } from '@/hooks/useBitgetData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Volume2, Clock } from 'lucide-react';
import { BackButton } from '@/components/BackButton';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';

export function Charts() {
  const [, setLocation] = useLocation();
  const { data } = useBitgetData();
  const [selectedPair, setSelectedPair] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1h');
  const [activeIndicator, setActiveIndicator] = useState('MACD');
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiChartRef = useRef<HTMLDivElement>(null);
  const macdChartRef = useRef<HTMLDivElement>(null);

  // Get current pair data
  const currentPairData = data?.find(item => item.symbol === selectedPair);
  const currentPrice = currentPairData?.price || '0';
  const change24h = currentPairData?.change24h || '0';
  const volume24h = currentPairData?.volume24h || '0';

  // Get pair from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pairParam = urlParams.get('pair');
    if (pairParam) {
      setSelectedPair(pairParam);
    }
  }, []);

  // Generate realistic trading data
  const generateTradingData = () => {
    const data = [];
    const basePrice = parseFloat(currentPrice) || 114400;
    const now = Date.now() / 1000; // Unix timestamp
    
    const intervals = 100;
    const stepSec = timeframe === '1m' ? 60 : 
                   timeframe === '5m' ? 300 : 
                   timeframe === '15m' ? 900 : 
                   timeframe === '1h' ? 3600 : 
                   timeframe === '1D' ? 86400 : 3600;
    
    for (let i = intervals; i >= 0; i--) {
      const time = Math.floor(now - (i * stepSec));
      const volatility = (Math.random() - 0.5) * 0.02; // ±1% volatility
      const trend = -i * 0.0001; // Slight downward trend
      const price = basePrice * (1 + volatility + trend);
      
      const open = price + (Math.random() - 0.5) * 20;
      const close = price + (Math.random() - 0.5) * 20;
      const high = Math.max(open, close) + Math.random() * 30;
      const low = Math.min(open, close) - Math.random() * 30;
      const volume = Math.random() * 1000000 + 500000;
      
      data.push({
        time,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: Math.floor(volume)
      });
    }
    return data;
  };

  // Calculate indicators
  const calculateEMA = (data: any[], period: number) => {
    const multiplier = 2 / (period + 1);
    let ema = data[0]?.close || 0;
    return data.map(item => {
      ema = (item.close * multiplier) + (ema * (1 - multiplier));
      return { time: item.time, value: Number(ema.toFixed(3)) };
    });
  };

  const calculateRSI = (data: any[], period = 14) => {
    const changes = data.slice(1).map((item, i) => item.close - data[i].close);
    const gains = changes.map(change => change > 0 ? change : 0);
    const losses = changes.map(change => change < 0 ? -change : 0);
    
    return data.slice(period).map((item, i) => {
      const avgGain = gains.slice(i, i + period).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i, i + period).reduce((a, b) => a + b, 0) / period;
      const rs = avgGain / (avgLoss || 1);
      const rsi = 100 - (100 / (1 + rs));
      return { time: item.time, value: Number(rsi.toFixed(3)) };
    });
  };

  const calculateMACD = (data: any[]) => {
    const ema12 = calculateEMA(data, 12);
    const ema26 = calculateEMA(data, 26);
    
    const macdLine = ema12.map((item, i) => ({
      time: item.time,
      value: Number((item.value - ema26[i].value).toFixed(3))
    }));
    
    const signalLine = calculateEMA(macdLine.map(item => ({ close: item.value, time: item.time })), 9);
    
    return macdLine.map((item, i) => ({
      time: item.time,
      macd: item.value,
      signal: signalLine[i]?.value || 0,
      histogram: Number((item.value - (signalLine[i]?.value || 0)).toFixed(3))
    }));
  };

  // Simplified chart placeholder (temporary while fixing charting library)
  useEffect(() => {
    if (chartContainerRef.current) {
      // Create a mock chart interface that shows the professional layout
      chartContainerRef.current.innerHTML = `
        <div style="background: #131722; height: 320px; position: relative; display: flex; align-items: center; justify-content: center; border: 1px solid #2B2B43;">
          <div style="color: #d9d9d9; text-align: center;">
            <div style="font-size: 18px; margin-bottom: 10px;">📊 Professional Chart Interface</div>
            <div style="font-size: 14px; opacity: 0.7;">Chart with ${selectedPair} • ${timeframe}</div>
            <div style="font-size: 12px; margin-top: 10px; opacity: 0.5;">
              EMA(20): 25.767 | EMA(50): 25.812 | EMA(200): 24.983
            </div>
            <div style="font-size: 12px; margin-top: 5px; opacity: 0.5;">
              Current Price: $${currentPrice}
            </div>
          </div>
        </div>
      `;
    }
    
    if (rsiChartRef.current) {
      rsiChartRef.current.innerHTML = `
        <div style="background: #131722; height: 120px; position: relative; display: flex; align-items: center; justify-content: center; border: 1px solid #2B2B43;">
          <div style="color: #d9d9d9; text-align: center;">
            <div style="font-size: 14px;">RSI(14): 44.346</div>
            <div style="font-size: 12px; opacity: 0.7; margin-top: 5px;">Relative Strength Index</div>
          </div>
        </div>
      `;
    }
    
    if (macdChartRef.current) {
      macdChartRef.current.innerHTML = `
        <div style="background: #131722; height: 140px; position: relative; display: flex; align-items: center; justify-content: center; border: 1px solid #2B2B43;">
          <div style="color: #d9d9d9; text-align: center;">
            <div style="font-size: 14px;">MACD(12,26,9)</div>
            <div style="font-size: 12px; opacity: 0.7; margin-top: 5px;">
              <span style="color: #2196F3;">MACD: -0.020</span> | 
              <span style="color: #ffc107;">DIF: 0.112</span> | 
              <span style="color: #e91e63;">DEA: -0.092</span>
            </div>
          </div>
        </div>
      `;
    }
  }, [selectedPair, timeframe, currentPrice]);

  const timeframes = ['1m', '5m', '15m', '1h', '1D'];
  const indicators = ['MA', 'EMA', 'BOLL', 'SAR', 'AVL', 'VOL', 'MACD', 'KDJ'];

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white pb-20">
      <BackButton />
      
      {/* Timeframe Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#131722]">
        <div className="flex items-center gap-2">
          {timeframes.map((tf) => (
            <Button
              key={tf}
              variant={timeframe === tf ? "default" : "ghost"}
              size="sm"
              className={`h-8 px-3 text-xs ${
                timeframe === tf 
                  ? 'bg-gray-600 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </Button>
          ))}
          <Button variant="ghost" size="sm" className="h-8 px-3 text-xs text-gray-400">
            More ▼
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">📊</Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">✏️</Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">⚙️</Button>
        </div>
      </div>

      {/* EMA Values */}
      <div className="px-4 py-2 bg-[#131722] border-b border-gray-700">
        <div className="flex items-center gap-4 text-xs">
          <span style={{ color: '#ffeb3b' }}>EMA(20): 25.767</span>
          <span style={{ color: '#ff9800' }}>EMA(50): 25.812</span>
          <span style={{ color: '#ffffff' }}>EMA(200): 24.983</span>
          <span className="ml-auto text-gray-400">{currentPrice}</span>
        </div>
      </div>

      {/* Main Chart */}
      <div 
        ref={chartContainerRef}
        className="w-full bg-[#131722]"
      />

      {/* RSI Chart */}
      <div className="px-4 py-1 bg-[#131722] border-t border-gray-700">
        <div className="text-xs text-gray-400 mb-1">RSI(14): 44.346</div>
        <div 
          ref={rsiChartRef}
          className="w-full"
        />
      </div>

      {/* MACD Chart */}
      <div className="px-4 py-1 bg-[#131722] border-t border-gray-700">
        <div className="flex items-center gap-4 text-xs mb-1">
          <span className="text-gray-400">MACD(12,26,9)</span>
          <span style={{ color: '#2196F3' }}>MACD: -0.020</span>
          <span style={{ color: '#ffc107' }}>DIF: 0.112</span>
          <span style={{ color: '#e91e63' }}>DEA: -0.092</span>
        </div>
        <div 
          ref={macdChartRef}
          className="w-full"
        />
      </div>

      {/* Indicator Tabs */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#131722] border-t border-gray-700">
        <div className="flex items-center gap-3">
          {indicators.map((indicator) => (
            <Button
              key={indicator}
              variant="ghost"
              size="sm"
              className={`h-8 px-2 text-xs ${
                activeIndicator === indicator 
                  ? 'text-white bg-gray-600' 
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setActiveIndicator(indicator)}
            >
              {indicator}
            </Button>
          ))}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400">📊</Button>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-gray-400">
            ⋯ More
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-gray-400">
            🤖 Bot
          </Button>
        </div>
      </div>

      {/* Trade Button */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-10">
        <Button 
          className="w-40 h-12 bg-white text-black font-semibold rounded-full hover:bg-gray-100"
          onClick={() => setLocation(`/trade?pair=${selectedPair}`)}
        >
          Trade
        </Button>
      </div>
    </div>
  );
}