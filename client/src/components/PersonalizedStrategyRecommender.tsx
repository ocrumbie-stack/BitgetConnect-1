import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Shield, 
  Settings, 
  Star, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  Zap,
  BarChart3,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  User,
  Lightbulb,
  Activity,
  Award,
  Filter
} from 'lucide-react';
import { useBitgetData } from '@/hooks/useBitgetData';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface UserPreferences {
  id?: string;
  userId: string;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive' | 'high_risk';
  tradingExperience: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  availableCapital?: number;
  preferredTimeframes: string[];
  tradingStyle: 'scalping' | 'day_trading' | 'swing' | 'position';
  preferredStrategies: string[];
  maxLeverage: number;
  maxPositionSize: number;
  stopLossPreference: number;
  takeProfitPreference: number;
  preferredMarkets: string[];
  avoidPatterns: string[];
  tradingHours: {
    timezone: string;
    activeDays: string[];
    activeHours: { start: string; end: string }[];
    pauseDuringNews: boolean;
  };
}

interface StrategyRecommendation {
  id: string;
  recommendationType: 'market_opportunity' | 'portfolio_rebalance' | 'risk_adjustment' | 'performance_optimization';
  title: string;
  description: string;
  confidenceScore: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  strategyConfig: {
    strategyType: string;
    tradingPairs: string[];
    timeframes: string[];
    capitalAllocation: number;
    leverage: number;
    riskManagement: {
      stopLoss: number;
      takeProfit: number;
      maxPositionSize: number;
    };
    indicators: {
      primary: string[];
      secondary: string[];
    };
  };
  reasoning: {
    marketAnalysis: string[];
    userProfileMatch: string[];
    historicalPerformance: string[];
    riskAssessment: string[];
    opportunityFactors: string[];
  };
  expectedOutcome: {
    expectedROI: number;
    expectedWinRate: number;
    estimatedDuration: number;
    riskLevel: 'low' | 'medium' | 'high';
    confidenceInterval: { min: number; max: number };
  };
  status: 'pending' | 'accepted' | 'rejected' | 'implemented' | 'expired';
  expiresAt: string;
  createdAt: string;
}

interface MarketOpportunity {
  id: string;
  symbol: string;
  opportunityType: 'breakout' | 'reversal' | 'momentum' | 'arbitrage' | 'volatility' | 'news_driven';
  timeframe: string;
  strength: number;
  confidence: number;
  description: string;
  analysis: {
    technicalFactors: Array<{
      indicator: string;
      value: number;
      signal: 'bullish' | 'bearish' | 'neutral';
      weight: number;
    }>;
    fundamentalFactors: string[];
    marketContext: {
      volume: number;
      volatility: number;
      trend: string;
      sentiment: string;
    };
    entryZone: {
      min: number;
      max: number;
      optimal: number;
    };
    targets: number[];
    stopLoss: number;
  };
  recommendedStrategies: string[];
  suitableForUsers: string[];
  expiresAt: string;
  createdAt: string;
}

export function PersonalizedStrategyRecommender() {
  const { data: marketData } = useBitgetData();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('recommendations');
  const [showPreferencesDialog, setShowPreferencesDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [preferences, setPreferences] = useState<UserPreferences>({
    userId: 'user1',
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
  });

  // Fetch user preferences
  const { data: userPreferences } = useQuery({
    queryKey: ['/api/trading-preferences', 'user1'],
    queryFn: async () => {
      const response = await fetch('/api/trading-preferences/user1');
      if (response.ok) {
        return response.json();
      }
      return null;
    },
  });

  // Fetch strategy recommendations
  const { data: recommendations = [], isLoading: recommendationsLoading } = useQuery({
    queryKey: ['/api/strategy-recommendations', 'user1'],
    queryFn: async () => {
      const response = await fetch('/api/strategy-recommendations/user1');
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }
      return response.json();
    },
  });

  // Fetch market opportunities
  const { data: opportunities = [], isLoading: opportunitiesLoading } = useQuery({
    queryKey: ['/api/market-opportunities', 'user1'],
    queryFn: async () => {
      const response = await fetch('/api/market-opportunities?userId=user1');
      if (!response.ok) {
        throw new Error('Failed to fetch opportunities');
      }
      return response.json();
    },
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: Partial<UserPreferences>) => {
      const response = await fetch('/api/trading-preferences/user1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPreferences),
      });
      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trading-preferences', 'user1'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy-recommendations', 'user1'] });
      setShowPreferencesDialog(false);
      toast({
        title: "Preferences Updated",
        description: "Your trading preferences have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update preferences",
        variant: "destructive",
      });
    }
  });

  // Generate new recommendations mutation
  const generateRecommendationsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/strategy-recommendations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user1' }),
      });
      if (!response.ok) {
        throw new Error('Failed to generate recommendations');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy-recommendations', 'user1'] });
      setIsGenerating(false);
      toast({
        title: "Recommendations Generated",
        description: "New strategy recommendations have been created based on current market conditions.",
      });
    },
    onError: (error: any) => {
      setIsGenerating(false);
      toast({
        title: "Error",
        description: error.message || "Failed to generate recommendations",
        variant: "destructive",
      });
    }
  });

  // Accept recommendation mutation
  const acceptRecommendationMutation = useMutation({
    mutationFn: async (recommendationId: string) => {
      const response = await fetch(`/api/strategy-recommendations/${recommendationId}/accept`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to accept recommendation');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy-recommendations', 'user1'] });
      toast({
        title: "Recommendation Accepted",
        description: "The strategy has been implemented successfully.",
      });
    },
  });

  // Update preferences when fetched
  useEffect(() => {
    if (userPreferences) {
      setPreferences(prev => ({ ...prev, ...userPreferences }));
    }
  }, [userPreferences]);

  const handleGenerateRecommendations = () => {
    setIsGenerating(true);
    generateRecommendationsMutation.mutate();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getOpportunityIcon = (type: string) => {
    switch (type) {
      case 'breakout': return <TrendingUp className="h-4 w-4" />;
      case 'reversal': return <RefreshCw className="h-4 w-4" />;
      case 'momentum': return <Zap className="h-4 w-4" />;
      case 'arbitrage': return <DollarSign className="h-4 w-4" />;
      case 'volatility': return <Activity className="h-4 w-4" />;
      case 'news_driven': return <AlertTriangle className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const formatTimeframe = (timeframe: string) => {
    const map: { [key: string]: string } = {
      '1m': '1 Minute',
      '5m': '5 Minutes',
      '15m': '15 Minutes',
      '1h': '1 Hour',
      '4h': '4 Hours',
      '1d': '1 Day',
      '1w': '1 Week'
    };
    return map[timeframe] || timeframe;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Strategy Recommender</h1>
            <p className="text-muted-foreground">AI-powered personalized trading recommendations</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleGenerateRecommendations}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Lightbulb className="h-4 w-4 mr-2" />
                Generate New
              </>
            )}
          </Button>
          <Dialog open={showPreferencesDialog} onOpenChange={setShowPreferencesDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Preferences
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Trading Preferences</DialogTitle>
              </DialogHeader>
              <PreferencesForm 
                preferences={preferences}
                setPreferences={setPreferences}
                onSave={(newPrefs) => updatePreferencesMutation.mutate(newPrefs)}
                isLoading={updatePreferencesMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Recommendations ({recommendations.length})
          </TabsTrigger>
          <TabsTrigger value="opportunities" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Market Opportunities ({opportunities.length})
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Performance Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          {recommendationsLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading recommendations...
              </CardContent>
            </Card>
          ) : recommendations.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Recommendations Available</h3>
                <p className="text-muted-foreground mb-4">
                  Generate personalized strategy recommendations based on current market conditions.
                </p>
                <Button onClick={handleGenerateRecommendations} disabled={isGenerating}>
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Generate Recommendations
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {recommendations.map((rec: StrategyRecommendation) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  onAccept={() => acceptRecommendationMutation.mutate(rec.id)}
                  onViewDetails={() => setLocation(`/analyzer?strategy=${rec.id}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-4">
          {opportunitiesLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading opportunities...
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {opportunities.map((opp: MarketOpportunity) => (
                <OpportunityCard
                  key={opp.id}
                  opportunity={opp}
                  onTrade={() => setLocation(`/trade?pair=${opp.symbol}`)}
                  onAnalyze={() => setLocation(`/analyzer?pair=${opp.symbol}&autoFill=true`)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <PerformanceAnalysis userId="user1" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Sub-components
interface PreferencesFormProps {
  preferences: UserPreferences;
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferences>>;
  onSave: (prefs: Partial<UserPreferences>) => void;
  isLoading: boolean;
}

function PreferencesForm({ preferences, setPreferences, onSave, isLoading }: PreferencesFormProps) {
  const handleSave = () => {
    onSave(preferences);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="riskTolerance">Risk Tolerance</Label>
          <Select 
            value={preferences.riskTolerance} 
            onValueChange={(value: any) => setPreferences(prev => ({ ...prev, riskTolerance: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="conservative">Conservative</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="aggressive">Aggressive</SelectItem>
              <SelectItem value="high_risk">High Risk</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="tradingExperience">Trading Experience</Label>
          <Select 
            value={preferences.tradingExperience} 
            onValueChange={(value: any) => setPreferences(prev => ({ ...prev, tradingExperience: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
              <SelectItem value="expert">Expert</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Max Leverage: {preferences.maxLeverage}x</Label>
        <Slider
          value={[preferences.maxLeverage]}
          onValueChange={(value) => setPreferences(prev => ({ ...prev, maxLeverage: value[0] }))}
          max={10}
          min={1}
          step={0.5}
          className="mt-2"
        />
      </div>

      <div>
        <Label>Max Position Size: {preferences.maxPositionSize}%</Label>
        <Slider
          value={[preferences.maxPositionSize]}
          onValueChange={(value) => setPreferences(prev => ({ ...prev, maxPositionSize: value[0] }))}
          max={25}
          min={1}
          step={1}
          className="mt-2"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => {}}>Cancel</Button>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}

interface RecommendationCardProps {
  recommendation: StrategyRecommendation;
  onAccept: () => void;
  onViewDetails: () => void;
}

function RecommendationCard({ recommendation, onAccept, onViewDetails }: RecommendationCardProps) {
  const priorityColor = {
    critical: 'border-red-500 bg-red-50 dark:bg-red-950/20',
    high: 'border-orange-500 bg-orange-50 dark:bg-orange-950/20',
    medium: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
    low: 'border-green-500 bg-green-50 dark:bg-green-950/20',
  }[recommendation.priority];

  return (
    <Card className={`${priorityColor} border-l-4`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{recommendation.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{recommendation.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={recommendation.priority === 'critical' ? 'destructive' : 'default'}>
              {recommendation.priority.toUpperCase()}
            </Badge>
            <div className="text-right">
              <div className="text-sm font-semibold">{recommendation.confidenceScore}%</div>
              <div className="text-xs text-muted-foreground">Confidence</div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              +{recommendation.expectedOutcome.expectedROI.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Expected ROI</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">
              {recommendation.expectedOutcome.expectedWinRate.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">Win Rate</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">
              {Math.round(recommendation.expectedOutcome.estimatedDuration / 24)}d
            </div>
            <div className="text-xs text-muted-foreground">Duration</div>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-sm font-medium mb-2">Trading Pairs:</div>
          <div className="flex flex-wrap gap-1">
            {recommendation.strategyConfig.tradingPairs.map(pair => (
              <Badge key={pair} variant="outline" className="text-xs">
                {pair}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onViewDetails} size="sm">
            <BarChart3 className="h-4 w-4 mr-1" />
            View Details
          </Button>
          <Button onClick={onAccept} size="sm" className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-4 w-4 mr-1" />
            Accept
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface OpportunityCardProps {
  opportunity: MarketOpportunity;
  onTrade: () => void;
  onAnalyze: () => void;
}

function OpportunityCard({ opportunity, onTrade, onAnalyze }: OpportunityCardProps) {
  const getOpportunityIcon = (type: string) => {
    switch (type) {
      case 'breakout': return <TrendingUp className="h-4 w-4" />;
      case 'reversal': return <RefreshCw className="h-4 w-4" />;
      case 'momentum': return <Zap className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
              {getOpportunityIcon(opportunity.opportunityType)}
            </div>
            <div>
              <CardTitle className="text-lg">{opportunity.symbol}</CardTitle>
              <p className="text-sm text-muted-foreground capitalize">
                {opportunity.opportunityType.replace('_', ' ')} • {opportunity.timeframe}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <div className="text-lg font-semibold">{opportunity.strength}%</div>
              <div className="text-sm text-muted-foreground">/{opportunity.confidence}%</div>
            </div>
            <div className="text-xs text-muted-foreground">Strength/Confidence</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-4">{opportunity.description}</p>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-xs text-muted-foreground">Entry Zone</div>
            <div className="font-medium">
              ${opportunity.analysis.entryZone.optimal.toFixed(4)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Stop Loss</div>
            <div className="font-medium text-red-600">
              ${opportunity.analysis.stopLoss.toFixed(4)}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onAnalyze} size="sm">
            <BarChart3 className="h-4 w-4 mr-1" />
            Analyze
          </Button>
          <Button onClick={onTrade} size="sm" className="bg-green-600 hover:bg-green-700">
            <DollarSign className="h-4 w-4 mr-1" />
            Trade
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PerformanceAnalysis({ userId }: { userId: string }) {
  const { data: performanceData = [] } = useQuery({
    queryKey: ['/api/strategy-performance', userId],
    queryFn: async () => {
      const response = await fetch(`/api/strategy-performance/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch performance data');
      }
      return response.json();
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Strategy Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {performanceData.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Performance Data</h3>
              <p className="text-muted-foreground">
                Start implementing strategies to see performance analysis.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  +{performanceData.reduce((acc: number, p: any) => acc + (p.performance?.totalReturn || 0), 0).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Total Return</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {(performanceData.reduce((acc: number, p: any) => acc + (p.performance?.winRate || 0), 0) / performanceData.length || 0).toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">Avg Win Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {performanceData.reduce((acc: number, p: any) => acc + (p.performance?.totalTrades || 0), 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Trades</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {performanceData.length}
                </div>
                <div className="text-sm text-muted-foreground">Active Strategies</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PersonalizedStrategyRecommender;