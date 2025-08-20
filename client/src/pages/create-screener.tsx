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
  // Basic filters
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  minVolume: z.string().optional(),
  maxVolume: z.string().optional(),
  minChange: z.string().optional(),
  maxChange: z.string().optional(),
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
  
  maEnabled: z.boolean().optional(),
  maType: z.enum(['SMA', 'EMA', 'WMA', 'DEMA', 'TEMA']).optional(),
  maPeriod: z.string().optional(),
  maOperator: z.enum(['above', 'below', 'crossing_up', 'crossing_down']).optional(),
  maComparison: z.enum(['price', 'another_ma']).optional(),
  maComparisonType: z.enum(['SMA', 'EMA', 'WMA', 'DEMA', 'TEMA']).optional(),
  maComparisonPeriod: z.string().optional(),
  
  bollingerEnabled: z.boolean().optional(),
  bollingerPeriod: z.string().optional(),
  bollingerStdDev: z.string().optional(),
  bollingerOperator: z.enum(['above_upper', 'below_lower', 'between_bands', 'touching_upper', 'touching_lower']).optional(),
  
  stochasticEnabled: z.boolean().optional(),
  stochasticKPeriod: z.string().optional(),
  stochasticDPeriod: z.string().optional(),
  stochasticOperator: z.enum(['above', 'below', 'between', 'bullish_crossover', 'bearish_crossover']).optional(),
  stochasticValue: z.string().optional(),
  stochasticValueMax: z.string().optional(),
  
  williamsEnabled: z.boolean().optional(),
  williamsPeriod: z.string().optional(),
  williamsOperator: z.enum(['above', 'below', 'between']).optional(),
  williamsValue: z.string().optional(),
  williamsValueMax: z.string().optional(),
});

type ScreenerFormData = z.infer<typeof screenerFormSchema>;

export function CreateScreener() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const form = useForm<ScreenerFormData>({
    resolver: zodResolver(screenerFormSchema),
    defaultValues: {
      name: '',
      minPrice: '',
      maxPrice: '',
      minVolume: '',
      maxVolume: '',
      minChange: '',
      maxChange: '',
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
      maEnabled: false,
      maType: 'SMA',
      maPeriod: '20',
      maOperator: 'above',
      maComparison: 'price',
      maComparisonType: 'SMA',
      maComparisonPeriod: '50',
      bollingerEnabled: false,
      bollingerPeriod: '20',
      bollingerStdDev: '2',
      bollingerOperator: 'above_upper',
      stochasticEnabled: false,
      stochasticKPeriod: '14',
      stochasticDPeriod: '3',
      stochasticOperator: 'above',
      stochasticValue: '80',
      stochasticValueMax: '',
      williamsEnabled: false,
      williamsPeriod: '14',
      williamsOperator: 'above',
      williamsValue: '-20',
      williamsValueMax: '',
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
        minChange: data.minChange ? parseFloat(data.minChange) : undefined,
        maxChange: data.maxChange ? parseFloat(data.maxChange) : undefined,
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

      if (data.maEnabled) {
        criteria.movingAverage = {
          type: data.maType || 'SMA',
          period: parseInt(data.maPeriod || '20'),
          operator: data.maOperator || 'above',
          comparison: data.maComparison || 'price',
          comparisonMa: data.maComparison === 'another_ma' ? {
            type: data.maComparisonType || 'SMA',
            period: parseInt(data.maComparisonPeriod || '50'),
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

      const screenerData = {
        name: data.name,
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
                        <FormLabel>Min Price (USDT)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.00000001"
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
                        <FormLabel>Max Price (USDT)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.00000001"
                            placeholder="1000.00"
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
                        <FormLabel>Min Volume 24h</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="1000000"
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
                        <FormLabel>Max Volume 24h</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="100000000"
                            {...field}
                            data-testid="input-max-volume"
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
                        <FormLabel>Min Change 24h (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="-50"
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
                        <FormLabel>Max Change 24h (%)</FormLabel>
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

                {/* Specific Symbols */}
                <FormField
                  control={form.control}
                  name="symbols"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specific Symbols (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="BTC, ETH, SOL (comma separated)"
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

                    {/* Moving Average Indicator */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <FormField
                          control={form.control}
                          name="maEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-ma-enabled"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-medium">
                                  Moving Average
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>

                      {form.watch('maEnabled') && (
                        <div className="ml-6 space-y-4 p-4 border rounded-lg bg-muted/50">
                          <div className="grid grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name="maType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>MA Type</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-ma-type">
                                        <SelectValue placeholder="Select type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="SMA">SMA</SelectItem>
                                      <SelectItem value="EMA">EMA</SelectItem>
                                      <SelectItem value="WMA">WMA</SelectItem>
                                      <SelectItem value="DEMA">DEMA</SelectItem>
                                      <SelectItem value="TEMA">TEMA</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="maPeriod"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Period</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="20"
                                      {...field}
                                      data-testid="input-ma-period"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="maOperator"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Condition</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-ma-operator">
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
                              name="maComparison"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Comparison</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-ma-comparison">
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
                            {form.watch('maComparison') === 'another_ma' && (
                              <>
                                <FormField
                                  control={form.control}
                                  name="maComparisonType"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Comparison MA Type</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                          <SelectTrigger data-testid="select-ma-comparison-type">
                                            <SelectValue placeholder="Select type" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="SMA">SMA</SelectItem>
                                          <SelectItem value="EMA">EMA</SelectItem>
                                          <SelectItem value="WMA">WMA</SelectItem>
                                          <SelectItem value="DEMA">DEMA</SelectItem>
                                          <SelectItem value="TEMA">TEMA</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="maComparisonPeriod"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Comparison Period</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="50"
                                          {...field}
                                          data-testid="input-ma-comparison-period"
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