import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const screenerFormSchema = z.object({
  name: z.string().min(1, 'Screener name is required'),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  minVolume: z.string().optional(),
  maxVolume: z.string().optional(),
  minChange: z.string().optional(),
  maxChange: z.string().optional(),
  symbols: z.string().optional(),
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
    },
  });

  const createScreenerMutation = useMutation({
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
              Set up criteria to filter trading pairs based on your preferences
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