import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Trash2, TrendingUp, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useLocation, useParams } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

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
});

type ScreenerFormData = z.infer<typeof screenerFormSchema>;

export function EditScreener() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch screener data
  const { data: screener, isLoading: isLoadingScreener } = useQuery({
    queryKey: ['/api/screeners', id],
    queryFn: async () => {
      const response = await fetch(`/api/screeners/user1`);
      if (!response.ok) {
        throw new Error('Failed to fetch screener');
      }
      const screeners = await response.json();
      return screeners.find((s: any) => s.id === id);
    },
    enabled: !!id,
  });

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
    },
  });

  // Update form when screener data loads
  useEffect(() => {
    if (screener) {
      const criteria = screener.criteria || {};
      form.reset({
        name: screener.name || '',
        minPrice: criteria.minPrice?.toString() || '',
        maxPrice: criteria.maxPrice?.toString() || '',
        minVolume: criteria.minVolume?.toString() || '',
        maxVolume: criteria.maxVolume?.toString() || '',
        minChange: criteria.minChange?.toString() || '',
        maxChange: criteria.maxChange?.toString() || '',
        symbols: criteria.symbols ? criteria.symbols.join(', ') : '',
      });
    }
  }, [screener, form]);

  const updateScreenerMutation = useMutation({
    mutationFn: async (data: ScreenerFormData) => {
      // Create criteria object
      const criteria = {
        minPrice: data.minPrice ? parseFloat(data.minPrice) : undefined,
        maxPrice: data.maxPrice ? parseFloat(data.maxPrice) : undefined,
        minVolume: data.minVolume ? parseFloat(data.minVolume) : undefined,
        maxVolume: data.maxVolume ? parseFloat(data.maxVolume) : undefined,
        minChange: data.minChange ? parseFloat(data.minChange) : undefined,
        maxChange: data.maxChange ? parseFloat(data.maxChange) : undefined,
        symbols: data.symbols ? data.symbols.split(',').map(s => s.trim()) : undefined,
      };

      const screenerData = {
        name: data.name,
        userId: 'user1',
        criteria,
      };

      const response = await fetch(`/api/screeners/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(screenerData),
      });

      if (!response.ok) {
        throw new Error('Failed to update screener');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/screeners', 'user1'] });
      toast({
        title: "Screener updated",
        description: "The screener has been successfully updated.",
      });
      setLocation('/markets');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update screener. Please try again.",
        variant: "destructive",
      });
    }
  });

  const deleteScreenerMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/screeners/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete screener');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/screeners', 'user1'] });
      toast({
        title: "Screener deleted",
        description: "The screener has been successfully deleted.",
      });
      setLocation('/markets');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete screener. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: ScreenerFormData) => {
    updateScreenerMutation.mutate(data);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this screener? This action cannot be undone.')) {
      deleteScreenerMutation.mutate();
    }
  };

  if (isLoadingScreener) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading screener...</div>
        </div>
      </div>
    );
  }

  if (!screener) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg mb-4">Screener not found</div>
          <Button onClick={() => setLocation('/markets')}>Back to Markets</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/markets')}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-semibold">Edit Screener</h1>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteScreenerMutation.isPending}
              data-testid="button-delete-screener"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>Edit Screener</CardTitle>
            <CardDescription>
              Modify criteria to filter trading pairs based on your preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Screener Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Screener Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., High Volume Gainers"
                          {...field}
                          data-testid="input-screener-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                {/* Save Button */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={updateScreenerMutation.isPending}
                  data-testid="button-save-screener"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateScreenerMutation.isPending ? 'Updating...' : 'Update Screener'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}