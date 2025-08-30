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
  ma1Type: z.enum(['SMA', 'EMA', 'WMA', 'DEMA', 'TEMA', 'HMA', 'VWMA']).optional(),
  ma1Period: z.string().optional(),
  ma1Operator: z.enum(['above', 'below', 'crossing_up', 'crossing_down']).optional(),
  ma1Comparison: z.enum(['price', 'another_ma']).optional(),
  ma1ComparisonType: z.enum(['SMA', 'EMA', 'WMA', 'DEMA', 'TEMA', 'HMA', 'VWMA']).optional(),
  ma1ComparisonPeriod: z.string().optional(),
  
  ma2Enabled: z.boolean().optional(),
  ma2Type: z.enum(['SMA', 'EMA', 'WMA', 'DEMA', 'TEMA', 'HMA', 'VWMA']).optional(),
  ma2Period: z.string().optional(),
  ma2Operator: z.enum(['above', 'below', 'crossing_up', 'crossing_down']).optional(),
  ma2Comparison: z.enum(['price', 'another_ma']).optional(),
  ma2ComparisonType: z.enum(['SMA', 'EMA', 'WMA', 'DEMA', 'TEMA', 'HMA', 'VWMA']).optional(),
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
      rsiPeriod: '14',
      rsiOperator: 'above',
      rsiValue: '70',
      rsiValueMax: '',
      macdEnabled: false,
      macdFastPeriod: '12',
      macdSlowPeriod: '26',
      macdSignalPeriod: '9',
      macdOperator: 'bullish_crossover',
      ma1Enabled: false,
      ma1Type: 'SMA',
      ma1Period: '20',
      ma1Operator: 'above',
      ma1Comparison: 'price',
      ma1ComparisonType: 'SMA',
      ma1ComparisonPeriod: '50',
      ma2Enabled: false,
      ma2Type: 'EMA',
      ma2Period: '50',
      ma2Operator: 'above',
      ma2Comparison: 'price',
      ma2ComparisonType: 'SMA',
      ma2ComparisonPeriod: '200',
      bollingerEnabled: false,
      bollingerPeriod: '20',
      bollingerStdDev: '2',
      bollingerOperator: 'above_upper',
      stochasticEnabled: false,
      stochasticKPeriod: '14',
      stochasticDPeriod: '3',
      stochasticSmoothK: '3',
      stochasticOperator: 'above',
      stochasticValue: '80',
      stochasticValueMax: '',
      williamsEnabled: false,
      williamsPeriod: '14',
      williamsOperator: 'above',
      williamsValue: '-20',
      williamsValueMax: '',
      atrEnabled: false,
      atrPeriod: '14',
      atrOperator: 'above',
      atrValue: '1',
      atrValueMax: '',
      cciEnabled: false,
      cciPeriod: '20',
      cciOperator: 'above',
      cciValue: '100',
      cciValueMax: '',
      momentumEnabled: false,
      momentumPeriod: '10',
      momentumOperator: 'positive',
      momentumValue: '0',
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
        criteria.movingAverage1 = {
          type: data.ma1Type || 'SMA',
          period: parseInt(data.ma1Period || '20'),
          operator: data.ma1Operator || 'above',
          comparison: data.ma1Comparison || 'price',
          comparisonMa: data.ma1Comparison === 'another_ma' ? {
            type: data.ma1ComparisonType || 'SMA',
            period: parseInt(data.ma1ComparisonPeriod || '50'),
          } : undefined,
        };
      }

      if (data.ma2Enabled) {
        criteria.movingAverage2 = {
          type: data.ma2Type || 'EMA',
          period: parseInt(data.ma2Period || '50'),
          operator: data.ma2Operator || 'above',
          comparison: data.ma2Comparison || 'price',
          comparisonMa: data.ma2Comparison === 'another_ma' ? {
            type: data.ma2ComparisonType || 'SMA',
            period: parseInt(data.ma2ComparisonPeriod || '200'),
          } : undefined,
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

  const onSubmit = (data: ScreenerFormData) => {
    createScreenerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/markets')}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-semibold">Create Screener</h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>New Screener</CardTitle>
            <CardDescription>
              Set up criteria to filter trading pairs based on your preferences and technical indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Screener Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Screener Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., High Volume RSI Breakout"
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
                      <FormLabel>Timeframe</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger data-testid="select-timeframe">
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

                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="basic" className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Basic Filters
                    </TabsTrigger>
                    <TabsTrigger value="technical" className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Technical Indicators
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4 mt-4">
                    {/* Price Range */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="minPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Price ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
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
                            <FormLabel>Max Price ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="100000.00"
                                {...field}
                                data-testid="input-max-price"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Volume Range */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="minVolume"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Volume</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="1000"
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
                            <FormLabel>Max Volume</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="1000000"
                                {...field}
                                data-testid="input-max-volume"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
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
                    <FormField
                      control={form.control}
                      name="symbols"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specific Symbols (optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="BTC, ETH, SOL (comma-separated)"
                              {...field}
                              data-testid="input-symbols"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />



                  </TabsContent>

                  <TabsContent value="technical" className="space-y-6 mt-4">
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
                        <div className="ml-6 space-y-4 p-4 border rounded-lg bg-muted/50">
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
                                      <SelectItem value="SMA">SMA</SelectItem>
                                      <SelectItem value="EMA">EMA</SelectItem>
                                      <SelectItem value="WMA">WMA</SelectItem>
                                      <SelectItem value="DEMA">DEMA</SelectItem>
                                      <SelectItem value="TEMA">TEMA</SelectItem>
                                      <SelectItem value="HMA">HMA</SelectItem>
                                      <SelectItem value="VWMA">VWMA</SelectItem>
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
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        // Prevent clearing completely - restore to default if empty
                                        if (value === '') {
                                          field.onChange('20');
                                        } else {
                                          field.onChange(value);
                                        }
                                      }}
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
                                      <SelectItem value="crossing_up">Crossing Up</SelectItem>
                                      <SelectItem value="crossing_down">Crossing Down</SelectItem>
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
                              name="ma1Comparison"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Comparison</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-ma1-comparison">
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
                            {form.watch('ma1Comparison') === 'another_ma' && (
                              <>
                                <FormField
                                  control={form.control}
                                  name="ma1ComparisonType"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Comparison MA Type</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                          <SelectTrigger data-testid="select-ma1-comparison-type">
                                            <SelectValue placeholder="Select type" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="SMA">SMA</SelectItem>
                                          <SelectItem value="EMA">EMA</SelectItem>
                                          <SelectItem value="WMA">WMA</SelectItem>
                                          <SelectItem value="DEMA">DEMA</SelectItem>
                                          <SelectItem value="TEMA">TEMA</SelectItem>
                                          <SelectItem value="HMA">HMA</SelectItem>
                                          <SelectItem value="VWMA">VWMA</SelectItem>
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
                                      <FormLabel>Comparison Period</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="50"
                                          {...field}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            // Prevent clearing completely - restore to default if empty
                                            if (value === '') {
                                              field.onChange('50');
                                            } else {
                                              field.onChange(value);
                                            }
                                          }}
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
                                      <SelectItem value="SMA">SMA</SelectItem>
                                      <SelectItem value="EMA">EMA</SelectItem>
                                      <SelectItem value="WMA">WMA</SelectItem>
                                      <SelectItem value="DEMA">DEMA</SelectItem>
                                      <SelectItem value="TEMA">TEMA</SelectItem>
                                      <SelectItem value="HMA">HMA</SelectItem>
                                      <SelectItem value="VWMA">VWMA</SelectItem>
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
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        // Prevent clearing completely - restore to default if empty
                                        if (value === '') {
                                          field.onChange('50');
                                        } else {
                                          field.onChange(value);
                                        }
                                      }}
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
                                      <SelectItem value="crossing_up">Crossing Up</SelectItem>
                                      <SelectItem value="crossing_down">Crossing Down</SelectItem>
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
                              name="ma2Comparison"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Comparison</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-ma2-comparison">
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
                            {form.watch('ma2Comparison') === 'another_ma' && (
                              <>
                                <FormField
                                  control={form.control}
                                  name="ma2ComparisonType"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Comparison MA Type</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                          <SelectTrigger data-testid="select-ma2-comparison-type">
                                            <SelectValue placeholder="Select type" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="SMA">SMA</SelectItem>
                                          <SelectItem value="EMA">EMA</SelectItem>
                                          <SelectItem value="WMA">WMA</SelectItem>
                                          <SelectItem value="DEMA">DEMA</SelectItem>
                                          <SelectItem value="TEMA">TEMA</SelectItem>
                                          <SelectItem value="HMA">HMA</SelectItem>
                                          <SelectItem value="VWMA">VWMA</SelectItem>
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
                                      <FormLabel>Comparison Period</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="200"
                                          {...field}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            // Prevent clearing completely - restore to default if empty
                                            if (value === '') {
                                              field.onChange('200');
                                            } else {
                                              field.onChange(value);
                                            }
                                          }}
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
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        // Prevent clearing completely - restore to default if empty
                                        if (value === '') {
                                          field.onChange('12');
                                        } else {
                                          field.onChange(value);
                                        }
                                      }}
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
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        // Prevent clearing completely - restore to default if empty
                                        if (value === '') {
                                          field.onChange('26');
                                        } else {
                                          field.onChange(value);
                                        }
                                      }}
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
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        // Prevent clearing completely - restore to default if empty
                                        if (value === '') {
                                          field.onChange('9');
                                        } else {
                                          field.onChange(value);
                                        }
                                      }}
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