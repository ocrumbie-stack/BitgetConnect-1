import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

// Mock data for demonstration - in a real app, this would come from an API
const generateMockBalanceHistory = () => {
  const history = [];
  const baseAmount = 77.09;
  const days = 30;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Create realistic fluctuations
    const variation = (Math.random() - 0.5) * 10;
    const amount = baseAmount + variation + (Math.random() * 5);
    
    history.push({
      date: date.toISOString().split('T')[0],
      totalBalance: parseFloat(amount.toFixed(2)),
      totalEquity: parseFloat((amount - Math.random() * 2).toFixed(2)),
      availableBalance: parseFloat((amount - Math.random() * 5).toFixed(2)),
      unrealizedPnL: parseFloat(((Math.random() - 0.5) * 3).toFixed(2))
    });
  }
  
  return history;
};

export default function BalanceHistory() {
  const [, setLocation] = useLocation();
  
  // In a real app, this would fetch actual balance history from the server
  const { data: balanceHistory, isLoading } = useQuery({
    queryKey: ['/api/balance-history', 'default-user'],
    queryFn: () => {
      // Simulate API call delay
      return new Promise(resolve => 
        setTimeout(() => resolve(generateMockBalanceHistory()), 500)
      );
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const calculateTrend = () => {
    if (!balanceHistory || balanceHistory.length < 2) return null;
    
    const latest = balanceHistory[balanceHistory.length - 1];
    const previous = balanceHistory[balanceHistory.length - 2];
    const change = latest.totalBalance - previous.totalBalance;
    const percentage = (change / previous.totalBalance) * 100;
    
    return {
      change,
      percentage,
      isPositive: change >= 0
    };
  };

  const trend = calculateTrend();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-4">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-8 w-48" />
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-16" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentBalance = balanceHistory?.[balanceHistory.length - 1];

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/')}
            className="p-2"
            data-testid="back-button"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Balance History</h1>
            <p className="text-sm text-muted-foreground">Track your account balance over time</p>
          </div>
        </div>

        {/* Main Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Balance Trend
              {trend && (
                <div className={`flex items-center gap-1 text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {trend.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {trend.percentage > 0 ? '+' : ''}{trend.percentage.toFixed(2)}%
                </div>
              )}
            </CardTitle>
            <CardDescription>
              30-day balance history showing total balance, equity, and P&L trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={balanceHistory}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    className="text-xs"
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${value}`}
                    className="text-xs"
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [formatCurrency(value), name]}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="totalBalance" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Total Balance"
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="totalEquity" 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeWidth={1.5}
                    name="Total Equity"
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="unrealizedPnL" 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={1}
                    name="Unrealized P&L"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Current Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Current Total Balance</CardDescription>
              <CardTitle className="text-2xl text-foreground">
                {formatCurrency(currentBalance?.totalBalance || 0)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Equity</CardDescription>
              <CardTitle className="text-2xl text-foreground">
                {formatCurrency(currentBalance?.totalEquity || 0)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Available Balance</CardDescription>
              <CardTitle className="text-2xl text-foreground">
                {formatCurrency(currentBalance?.availableBalance || 0)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Unrealized P&L</CardDescription>
              <CardTitle className={`text-2xl ${
                (currentBalance?.unrealizedPnL || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(currentBalance?.unrealizedPnL || 0)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}