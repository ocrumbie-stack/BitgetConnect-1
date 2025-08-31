import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, TrendingUp, BarChart3, Activity } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const screenerFormSchema = z.object({
  name: z.string().min(1, 'Screener name is required'),
  timeframe: z.enum(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w']).optional(),
  // Basic filters
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  minVolume: z.string().optional(),
  maxVolume: z.string().optional(),
  minVolumeUsd: z.string().optional(),
  maxVolumeUsd: z.string().optional(),
  minChange: z.string().optional(),
  maxChange: z.string().optional(),
  minMarketCap: z.string().optional(),
  maxMarketCap: z.string().optional(),
  symbols: z.string().optional(),
  
  // Technical indicators
  rsiEnabled: z.boolean().optional(),
  rsiPeriod: z.string().optional(),
  rsiOperator: z.enum(['above', 'below', 'between']).optional(),
  rsiValue: z.string().optional(),
  rsiValueMax: z.string().optional(),
  
  macdEnabled: z.boolean().optional(),
  macdFastPeriod: z.string().optional(),
  macdSlowPeriod: z.string().optional(),
  macdSignalPeriod: z.string().optional(),
  macdOperator: z.enum(['bullish_crossover', 'bearish_crossover', 'above_signal', 'below_signal', 'above_zero', 'below_zero']).optional(),
  
  ma1Enabled: z.boolean().optional(),
  ma1Type: z.enum(['sma', 'ema', 'wma', 'dema', 'tema']).optional(),
  ma1Period: z.string().optional(),
  ma1Operator: z.enum(['above', 'below', 'crossover_above', 'crossover_below']).optional(),
  ma1ComparisonType: z.enum(['price', 'another_ma']).optional(),
  ma1ComparisonMAType: z.enum(['sma', 'ema', 'wma', 'dema', 'tema']).optional(),
  ma1ComparisonPeriod: z.string().optional(),

  ma2Enabled: z.boolean().optional(),
  ma2Type: z.enum(['sma', 'ema', 'wma', 'dema', 'tema']).optional(),
  ma2Period: z.string().optional(),
  ma2Operator: z.enum(['above', 'below', 'crossover_above', 'crossover_below']).optional(),
  ma2ComparisonType: z.enum(['price', 'another_ma']).optional(),
  ma2ComparisonMAType: z.enum(['sma', 'ema', 'wma', 'dema', 'tema']).optional(),
  ma2ComparisonPeriod: z.string().optional(),

  
  bollingerEnabled: z.boolean().optional(),
  bollingerPeriod: z.string().optional(),
  bollingerStdDev: z.string().optional(),
  bollingerOperator: z.enum(['above_upper', 'below_lower', 'between_bands', 'touching_upper', 'touching_lower', 'squeeze']).optional(),
  
  stochasticEnabled: z.boolean().optional(),
  stochasticKPeriod: z.string().optional(),
  stochasticDPeriod: z.string().optional(),
  stochasticSmoothK: z.string().optional(),
  stochasticOperator: z.enum(['above', 'below', 'between', 'bullish_crossover', 'bearish_crossover', 'oversold', 'overbought']).optional(),
  stochasticValue: z.string().optional(),
  stochasticValueMax: z.string().optional(),
  
  williamsEnabled: z.boolean().optional(),
  williamsPeriod: z.string().optional(),
  williamsOperator: z.enum(['above', 'below', 'between', 'oversold', 'overbought']).optional(),
  williamsValue: z.string().optional(),
  williamsValueMax: z.string().optional(),
  
  atrEnabled: z.boolean().optional(),
  atrPeriod: z.string().optional(),
  atrOperator: z.enum(['above', 'below', 'between']).optional(),
  atrValue: z.string().optional(),
  atrValueMax: z.string().optional(),
  
  cciEnabled: z.boolean().optional(),
  cciPeriod: z.string().optional(),
  cciOperator: z.enum(['above', 'below', 'between', 'oversold', 'overbought']).optional(),
  cciValue: z.string().optional(),
  cciValueMax: z.string().optional(),
  
  momentumEnabled: z.boolean().optional(),
  momentumPeriod: z.string().optional(),
  momentumOperator: z.enum(['above', 'below', 'positive', 'negative']).optional(),
  momentumValue: z.string().optional(),
});

type ScreenerFormData = z.infer<typeof screenerFormSchema>;

export function CreateScreener() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const form = useForm<ScreenerFormData>({
    resolver: zodResolver(screenerFormSchema),
    defaultValues: {
      name: '',
      timeframe: '1h',
      minPrice: '',
      maxPrice: '',
      minVolume: '',
      maxVolume: '',
      minVolumeUsd: '',
      maxVolumeUsd: '',
      minChange: '',
      maxChange: '',
      minMarketCap: '',
      maxMarketCap: '',
      symbols: '',
      // Technical indicators
      rsiEnabled: false,
      rsiPeriod: '',
      rsiOperator: 'above',
      rsiValue: '',
      rsiValueMax: '',
      macdEnabled: false,
      macdFastPeriod: '',
      macdSlowPeriod: '',
      macdSignalPeriod: '',
      macdOperator: 'bullish_crossover',
      ma1Enabled: false,
      ma1Type: 'sma',
      ma1Period: '',
      ma1Operator: 'above',
      ma1ComparisonType: 'price',
      ma1ComparisonMAType: 'sma',
      ma1ComparisonPeriod: '',
      ma2Enabled: false,
      ma2Type: 'ema',
      ma2Period: '',
      ma2Operator: 'above',
      ma2ComparisonType: 'price',
      ma2ComparisonMAType: 'sma',
      ma2ComparisonPeriod: '',

      bollingerEnabled: false,
      bollingerPeriod: '',
      bollingerStdDev: '',
      bollingerOperator: 'above_upper',
      stochasticEnabled: false,
      stochasticKPeriod: '',
      stochasticDPeriod: '',
      stochasticSmoothK: '',
      stochasticOperator: 'above',
      stochasticValue: '',
      stochasticValueMax: '',
      williamsEnabled: false,
      williamsPeriod: '',
      williamsOperator: 'above',
      williamsValue: '',
      williamsValueMax: '',
      atrEnabled: false,
      atrPeriod: '',
      atrOperator: 'above',
      atrValue: '',
      atrValueMax: '',
      cciEnabled: false,
      cciPeriod: '',
      cciOperator: 'above',
      cciValue: '',
      cciValueMax: '',
      momentumEnabled: false,
      momentumPeriod: '',
      momentumOperator: 'positive',
      momentumValue: '',
    },
  });

  const createScreenerMutation = useMutation({
    mutationFn: async (data: ScreenerFormData) => {
      // Create criteria object
      const criteria: any = {
        // Basic filters
        minPrice: data.minPrice ? parseFloat(data.minPrice) : undefined,
        maxPrice: data.maxPrice ? parseFloat(data.maxPrice) : undefined,
        minVolume: data.minVolume ? parseFloat(data.minVolume) : undefined,
        maxVolume: data.maxVolume ? parseFloat(data.maxVolume) : undefined,
        minVolumeUsd: data.minVolumeUsd ? parseFloat(data.minVolumeUsd) : undefined,
        maxVolumeUsd: data.maxVolumeUsd ? parseFloat(data.maxVolumeUsd) : undefined,
        minChange: data.minChange ? parseFloat(data.minChange) : undefined,
        maxChange: data.maxChange ? parseFloat(data.maxChange) : undefined,
        minMarketCap: data.minMarketCap ? parseFloat(data.minMarketCap) : undefined,
        maxMarketCap: data.maxMarketCap ? parseFloat(data.maxMarketCap) : undefined,
        symbols: data.symbols ? data.symbols.split(',').map(s => s.trim()) : undefined,
      };

      // Add technical indicators if enabled
      if (data.rsiEnabled) {
        criteria.rsi = {
          period: parseInt(data.rsiPeriod || '14'),
          operator: data.rsiOperator || 'above',
          value: parseFloat(data.rsiValue || '70'),
          valueMax: data.rsiValueMax ? parseFloat(data.rsiValueMax) : undefined,
        };
      }

      if (data.macdEnabled) {
        criteria.macd = {
          fastPeriod: parseInt(data.macdFastPeriod || '12'),
          slowPeriod: parseInt(data.macdSlowPeriod || '26'),
          signalPeriod: parseInt(data.macdSignalPeriod || '9'),
          operator: data.macdOperator || 'bullish_crossover',
        };
      }

      if (data.ma1Enabled) {
        criteria.ma1 = {
          type: data.ma1Type || 'sma',
          period: parseInt(data.ma1Period || '20'),
          operator: data.ma1Operator || 'above',
          comparisonType: data.ma1ComparisonType || 'price',
          comparisonMAType: data.ma1ComparisonMAType || 'sma',
          comparisonPeriod: data.ma1ComparisonPeriod ? parseInt(data.ma1ComparisonPeriod) : undefined,
        };
      }

      if (data.ma2Enabled) {
        criteria.ma2 = {
          type: data.ma2Type || 'ema',
          period: parseInt(data.ma2Period || '50'),
          operator: data.ma2Operator || 'above',
          comparisonType: data.ma2ComparisonType || 'price',
          comparisonMAType: data.ma2ComparisonMAType || 'sma',
          comparisonPeriod: data.ma2ComparisonPeriod ? parseInt(data.ma2ComparisonPeriod) : undefined,
        };
      }

      if (data.bollingerEnabled) {
        criteria.bollinger = {
          period: parseInt(data.bollingerPeriod || '20'),
          stdDev: parseFloat(data.bollingerStdDev || '2'),
          operator: data.bollingerOperator || 'above_upper',
        };
      }

      if (data.stochasticEnabled) {
        criteria.stochastic = {
          kPeriod: parseInt(data.stochasticKPeriod || '14'),
          dPeriod: parseInt(data.stochasticDPeriod || '3'),
          smoothK: parseInt(data.stochasticSmoothK || '3'),
          operator: data.stochasticOperator || 'above',
          value: parseFloat(data.stochasticValue || '80'),
          valueMax: data.stochasticValueMax ? parseFloat(data.stochasticValueMax) : undefined,
        };
      }

      if (data.williamsEnabled) {
        criteria.williams = {
          period: parseInt(data.williamsPeriod || '14'),
          operator: data.williamsOperator || 'above',
          value: parseFloat(data.williamsValue || '-20'),
          valueMax: data.williamsValueMax ? parseFloat(data.williamsValueMax) : undefined,
        };
      }

      if (data.atrEnabled) {
        criteria.atr = {
          period: parseInt(data.atrPeriod || '14'),
          operator: data.atrOperator || 'above',
          value: parseFloat(data.atrValue || '1'),
          valueMax: data.atrValueMax ? parseFloat(data.atrValueMax) : undefined,
        };
      }

      if (data.cciEnabled) {
        criteria.cci = {
          period: parseInt(data.cciPeriod || '20'),
          operator: data.cciOperator || 'above',
          value: parseFloat(data.cciValue || '100'),
          valueMax: data.cciValueMax ? parseFloat(data.cciValueMax) : undefined,
        };
      }

      if (data.momentumEnabled) {
        criteria.momentum = {
          period: parseInt(data.momentumPeriod || '10'),
          operator: data.momentumOperator || 'positive',
          value: data.momentumValue ? parseFloat(data.momentumValue) : undefined,
        };
      }

      const screenerData = {
        name: data.name,
        timeframe: data.timeframe || '1h',
        userId: 'user1', // Mock user ID
        criteria,
      };

      const response = await fetch('/api/screeners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(screenerData),
      });

      if (!response.ok) {
        throw new Error('Failed to create screener');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate screeners cache to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/screeners', 'user1'] });
      setLocation('/markets');
    }
  });

  // Watch form values once at the top to prevent re-render loops
  const watchedValues = form.watch();
  const ma1ComparisonType = watchedValues.ma1ComparisonType;
  const ma2ComparisonType = watchedValues.ma2ComparisonType;
  const rsiEnabled = watchedValues.rsiEnabled;
  const rsiOperator = watchedValues.rsiOperator;
  const macdEnabled = watchedValues.macdEnabled;
  const ma1Enabled = watchedValues.ma1Enabled;
  const ma2Enabled = watchedValues.ma2Enabled;
  const bollingerEnabled = watchedValues.bollingerEnabled;
  const stochasticEnabled = watchedValues.stochasticEnabled;
  const williamsEnabled = watchedValues.williamsEnabled;
  const atrEnabled = watchedValues.atrEnabled;
  const cciEnabled = watchedValues.cciEnabled;
  const momentumEnabled = watchedValues.momentumEnabled;

  const onSubmit = (data: ScreenerFormData) => {
    createScreenerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-background/90 backdrop-blur-md border-b border-border z-10 shadow-sm">
        <div className="p-6">
          <div className="flex items-center gap-4 max-w-6xl mx-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/markets')}
              className="p-2 hover:bg-accent/60 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Create Custom Screener</h1>
                <p className="text-sm text-muted-foreground">Design advanced market filtering criteria with technical indicators</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-6 max-w-6xl mx-auto">
        <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">New Market Screener</CardTitle>
                <CardDescription className="text-sm mt-1">
                  Configure sophisticated filtering criteria to identify trading opportunities based on price action, volume patterns, and technical indicators
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Screener Name */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Screener Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="RSI Breakout"
                            className="h-10 text-sm"
                            {...field}
                            data-testid="input-screener-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Timeframe */}
                  <FormField
                    control={form.control}
                    name="timeframe"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Analysis Timeframe</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger data-testid="select-timeframe" className="h-10 text-sm">
                              <SelectValue placeholder="Select timeframe" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1m">1 Minute</SelectItem>
                              <SelectItem value="5m">5 Minutes</SelectItem>
                              <SelectItem value="15m">15 Minutes</SelectItem>
                              <SelectItem value="30m">30 Minutes</SelectItem>
                              <SelectItem value="1h">1 Hour</SelectItem>
                              <SelectItem value="4h">4 Hours</SelectItem>
                              <SelectItem value="1d">1 Day</SelectItem>
                              <SelectItem value="1w">1 Week</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Tabs defaultValue="basic" className="w-full mt-8">
                  <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-800 p-1 h-14 border border-border">
                    <TabsTrigger 
                      value="basic" 
                      className="flex items-center gap-2 h-12 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <Activity className="w-4 h-4" />
                      Basic Market Filters
                    </TabsTrigger>
                    <TabsTrigger 
                      value="technical" 
                      className="flex items-center gap-2 h-12 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Technical Indicators
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-6 mt-6 bg-muted/20 p-6 rounded-lg">
                    {/* Price Range */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold text-foreground">Price Range Filters</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="minPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-muted-foreground">Min Price ($)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.01"
                                  className="h-9 text-sm"
                                  {...field}
                                  data-testid="input-min-price"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="maxPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-muted-foreground">Max Price ($)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="1000"
                                  className="h-9 text-sm"
                                  {...field}
                                  data-testid="input-max-price"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Volume Range */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold text-foreground">Volume Filters</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="minVolume"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-muted-foreground">Min Volume</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="1M"
                                  className="h-9 text-sm"
                                  {...field}
                                  data-testid="input-min-volume"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="maxVolume"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-muted-foreground">Max Volume</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="100M"
                                  className="h-9 text-sm"
                                  {...field}
                                  data-testid="input-max-volume"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Volume USD Range */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="minVolumeUsd"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Volume USD</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="100000"
                                {...field}
                                data-testid="input-min-volume-usd"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="maxVolumeUsd"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Volume USD</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="10000000"
                                {...field}
                                data-testid="input-max-volume-usd"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Change Range */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="minChange"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min 24h Change (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="-10"
                                {...field}
                                data-testid="input-min-change"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="maxChange"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max 24h Change (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="50"
                                {...field}
                                data-testid="input-max-change"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Market Cap Range */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="minMarketCap"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Market Cap ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="1000000"
                                {...field}
                                data-testid="input-min-market-cap"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="maxMarketCap"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Market Cap ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="1000000000"
                                {...field}
                                data-testid="input-max-market-cap"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Symbols */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold text-foreground">Symbol Selection</h3>
                      </div>
                      <FormField
                        control={form.control}
                        name="symbols"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Specific Symbols (optional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="BTC, ETH, SOL"
                                className="h-9 text-sm"
                                {...field}
                                data-testid="input-symbols"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>



                  </TabsContent>

                  <TabsContent value="technical" className="space-y-6 mt-6 bg-muted/20 p-6 rounded-lg">
                    {/* RSI Indicator */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <FormField
                          control={form.control}
                          name="rsiEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-rsi-enabled"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-medium">
                                  RSI (Relative Strength Index)
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>

                      {form.watch('rsiEnabled') && (
                        <div className="ml-6 space-y-4 p-4 border rounded-lg bg-background/50">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="rsiPeriod"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Period</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="14"
                                className="h-9 text-sm"
                                      {...field}
                                      data-testid="input-rsi-period"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="rsiOperator"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Condition</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-rsi-operator">
                                        <SelectValue placeholder="Select condition" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="above">Above</SelectItem>
                                      <SelectItem value="below">Below</SelectItem>
                                      <SelectItem value="between">Between</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="rsiValue"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Value</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="70"
                                      {...field}
                                      data-testid="input-rsi-value"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            {form.watch('rsiOperator') === 'between' && (
                              <FormField
                                control={form.control}
                                name="rsiValueMax"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Max Value</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="80"
                                        {...field}
                                        data-testid="input-rsi-value-max"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>



                    {/* MACD Indicator */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <FormField
                          control={form.control}
                          name="macdEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-macd-enabled"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-medium">
                                  MACD (Moving Average Convergence Divergence)
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>

                      {form.watch('macdEnabled') && (
                        <div className="ml-6 space-y-4 p-4 border rounded-lg bg-muted/50">
                          <div className="grid grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name="macdFastPeriod"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Fast Period</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="12"
                                      {...field}
                                      data-testid="input-macd-fast-period"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="macdSlowPeriod"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Slow Period</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="26"
                                      {...field}
                                      data-testid="input-macd-slow-period"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="macdSignalPeriod"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Signal Period</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="9"
                                      {...field}
                                      data-testid="input-macd-signal-period"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={form.control}
                            name="macdOperator"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Condition</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-macd-operator">
                                      <SelectValue placeholder="Select condition" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="bullish_crossover">Bullish Crossover</SelectItem>
                                    <SelectItem value="bearish_crossover">Bearish Crossover</SelectItem>
                                    <SelectItem value="above_signal">Above Signal Line</SelectItem>
                                    <SelectItem value="below_signal">Below Signal Line</SelectItem>
                                    <SelectItem value="above_zero">Above Zero Line</SelectItem>
                                    <SelectItem value="below_zero">Below Zero Line</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>

                    {/* Moving Average 1 Indicator */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <FormField
                          control={form.control}
                          name="ma1Enabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-ma1-enabled"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-medium">
                                  Moving Average 1
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>

                      {form.watch('ma1Enabled') && (
                        <div className="ml-6 space-y-4 p-4 border rounded-lg bg-muted/50">
                          <div className="grid grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name="ma1Type"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>MA Type</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-ma1-type">
                                        <SelectValue placeholder="Select type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="sma">SMA</SelectItem>
                                      <SelectItem value="ema">EMA</SelectItem>
                                      <SelectItem value="wma">WMA</SelectItem>
                                      <SelectItem value="dema">DEMA</SelectItem>
                                      <SelectItem value="tema">TEMA</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="ma1Period"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Period</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="20"
                                      {...field}
                                      data-testid="input-ma1-period"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="ma1Operator"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Condition</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-ma1-operator">
                                        <SelectValue placeholder="Select condition" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="above">Above</SelectItem>
                                      <SelectItem value="below">Below</SelectItem>
                                      <SelectItem value="crossover_above">Crossover Above</SelectItem>
                                      <SelectItem value="crossover_below">Crossover Below</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name="ma1ComparisonType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Comparison</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-ma1-comparison-type">
                                        <SelectValue placeholder="Compare to" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="price">Price</SelectItem>
                                      <SelectItem value="another_ma">Another MA</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            {ma1ComparisonType === 'another_ma' && (
                              <>
                                <FormField
                                  control={form.control}
                                  name="ma1ComparisonMAType"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Comparison MA Type</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                          <SelectTrigger data-testid="select-ma1-comparison-ma-type">
                                            <SelectValue placeholder="Select type" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="sma">SMA</SelectItem>
                                          <SelectItem value="ema">EMA</SelectItem>
                                          <SelectItem value="wma">WMA</SelectItem>
                                          <SelectItem value="dema">DEMA</SelectItem>
                                          <SelectItem value="tema">TEMA</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="ma1ComparisonPeriod"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Comparison MA Period</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="50"
                                          {...field}
                                          data-testid="input-ma1-comparison-period"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Moving Average 2 Indicator */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <FormField
                          control={form.control}
                          name="ma2Enabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-ma2-enabled"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-medium">
                                  Moving Average 2
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>

                      {form.watch('ma2Enabled') && (
                        <div className="ml-6 space-y-4 p-4 border rounded-lg bg-muted/50">
                          <div className="grid grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name="ma2Type"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>MA Type</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-ma2-type">
                                        <SelectValue placeholder="Select type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="sma">SMA</SelectItem>
                                      <SelectItem value="ema">EMA</SelectItem>
                                      <SelectItem value="wma">WMA</SelectItem>
                                      <SelectItem value="dema">DEMA</SelectItem>
                                      <SelectItem value="tema">TEMA</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="ma2Period"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Period</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="50"
                                      {...field}
                                      data-testid="input-ma2-period"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="ma2Operator"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Condition</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-ma2-operator">
                                        <SelectValue placeholder="Select condition" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="above">Above</SelectItem>
                                      <SelectItem value="below">Below</SelectItem>
                                      <SelectItem value="crossover_above">Crossover Above</SelectItem>
                                      <SelectItem value="crossover_below">Crossover Below</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name="ma2ComparisonType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Comparison</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-ma2-comparison-type">
                                        <SelectValue placeholder="Compare to" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="price">Price</SelectItem>
                                      <SelectItem value="another_ma">Another MA</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            {ma2ComparisonType === 'another_ma' && (
                              <>
                                <FormField
                                  control={form.control}
                                  name="ma2ComparisonMAType"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Comparison MA Type</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                          <SelectTrigger data-testid="select-ma2-comparison-ma-type">
                                            <SelectValue placeholder="Select type" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="sma">SMA</SelectItem>
                                          <SelectItem value="ema">EMA</SelectItem>
                                          <SelectItem value="wma">WMA</SelectItem>
                                          <SelectItem value="dema">DEMA</SelectItem>
                                          <SelectItem value="tema">TEMA</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="ma2ComparisonPeriod"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Comparison MA Period</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="200"
                                          {...field}
                                          data-testid="input-ma2-comparison-period"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Save Button */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createScreenerMutation.isPending}
                  data-testid="button-save-screener"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {createScreenerMutation.isPending ? 'Saving...' : 'Save Screener'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}