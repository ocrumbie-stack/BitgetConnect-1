import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TrendingUp, Shield, Zap, Target, AlertTriangle, DollarSign } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface TradingStyleSelectorProps {
  userId?: string;
  onStyleChange?: (style: any) => void;
}

const tradingStyles = {
  conservative: {
    name: 'Conservative',
    icon: Shield,
    color: 'bg-blue-500',
    description: 'Stable growth with minimal risk',
    settings: {
      confidenceThreshold: 80,
      maxLeverage: 2,
      riskTolerance: 'low' as const,
      timeframePreference: '4h' as const,
      tradingStyleSettings: {
        aggressive: false,
        scalping: false,
        volatilityFocus: false,
      }
    },
    features: ['High confidence trades', 'Low leverage', 'Longer timeframes', 'Risk-first approach']
  },
  balanced: {
    name: 'Balanced',
    icon: Target,
    color: 'bg-green-500',
    description: 'Moderate risk with steady returns',
    settings: {
      confidenceThreshold: 65,
      maxLeverage: 5,
      riskTolerance: 'medium' as const,
      timeframePreference: '1h' as const,
      tradingStyleSettings: {
        aggressive: false,
        scalping: false,
        volatilityFocus: false,
      }
    },
    features: ['Balanced risk/reward', 'Medium leverage', 'Diverse timeframes', 'Steady growth']
  },
  aggressive: {
    name: 'Aggressive',
    icon: TrendingUp,
    color: 'bg-orange-500',
    description: 'Higher risk for faster gains',
    settings: {
      confidenceThreshold: 50,
      maxLeverage: 10,
      riskTolerance: 'high' as const,
      timeframePreference: '5m' as const,
      tradingStyleSettings: {
        aggressive: true,
        scalping: true,
        volatilityFocus: true,
      }
    },
    features: ['Quick scalping trades', 'High leverage allowed', '5-minute timeframes', 'Volatility focus']
  },
  high_risk: {
    name: 'High Risk',
    icon: Zap,
    color: 'bg-red-500',
    description: 'Maximum leverage and volatility',
    settings: {
      confidenceThreshold: 40,
      maxLeverage: 20,
      riskTolerance: 'extreme' as const,
      timeframePreference: '1m' as const,
      tradingStyleSettings: {
        aggressive: true,
        scalping: true,
        volatilityFocus: true,
      }
    },
    features: ['Extreme leverage', '1-minute scalping', 'Maximum volatility', 'High-frequency trading']
  }
};

type TradingStyleSettings = {
  confidenceThreshold: number;
  maxLeverage: number;
  riskTolerance: 'low' | 'medium' | 'high' | 'extreme';
  timeframePreference: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  tradingStyleSettings: {
    aggressive: boolean;
    scalping: boolean;
    volatilityFocus: boolean;
  };
};

export function TradingStyleSelector({ userId = 'default-user', onStyleChange }: TradingStyleSelectorProps) {
  const [selectedStyle, setSelectedStyle] = useState<keyof typeof tradingStyles | ''>('');
  const [customSettings, setCustomSettings] = useState<TradingStyleSettings>(tradingStyles.balanced.settings);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { toast } = useToast();

  // Fetch current user preferences
  const { data: userPrefs, isLoading } = useQuery({
    queryKey: ['/api/user-preferences', userId],
  });

  // Save user preferences mutation
  const savePreferencesMutation = useMutation({
    mutationFn: async (data: any) => {
      return await fetch(`/api/user-preferences/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Trading Style Updated",
        description: "Your trading preferences have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user-preferences'] });
      onStyleChange?.(customSettings);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save trading preferences. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Initialize from user preferences
  useEffect(() => {
    if (userPrefs && typeof userPrefs === 'object' && 'tradingStyle' in userPrefs) {
      const style = (userPrefs as any).tradingStyle;
      if (style && style in tradingStyles) {
        setSelectedStyle(style);
        if ('preferences' in userPrefs && (userPrefs as any).preferences) {
          setCustomSettings((userPrefs as any).preferences);
        }
      }
    }
  }, [userPrefs]);

  const handleStyleSelect = (styleKey: keyof typeof tradingStyles) => {
    setSelectedStyle(styleKey);
    setCustomSettings(tradingStyles[styleKey].settings);
  };

  const handleSavePreferences = () => {
    if (!selectedStyle) return;
    
    const data = {
      tradingStyle: selectedStyle,
      preferences: customSettings,
    };
    savePreferencesMutation.mutate(data);
  };

  const handleSettingChange = (key: string, value: any) => {
    setCustomSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Trading Style Dropdown */}
      <div className="space-y-2">
        <Label htmlFor="trading-style">Select Trading Style</Label>
        <Select 
          value={selectedStyle} 
          onValueChange={(value) => handleStyleSelect(value as keyof typeof tradingStyles)}
        >
          <SelectTrigger data-testid="select-trading-style">
            <SelectValue placeholder="Choose your trading approach..." />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(tradingStyles).map(([key, style]) => {
              const IconComponent = style.icon;
              return (
                <SelectItem key={key} value={key} data-testid={`option-${key}`}>
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${style.color}`}>
                      <IconComponent className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <span className="font-medium">{style.name}</span>
                      <span className="text-xs text-muted-foreground ml-1">- {style.description}</span>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Configuration Card - Only shown when style is selected */}
      {selectedStyle && (
        <Card className="border-2" data-testid="card-trading-config">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              {(() => {
                const currentStyle = tradingStyles[selectedStyle];
                const IconComponent = currentStyle.icon;
                return (
                  <>
                    <div className={`p-2 rounded-lg ${currentStyle.color}`}>
                      <IconComponent className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{currentStyle.name} Trading Style</CardTitle>
                      <p className="text-sm text-muted-foreground">{currentStyle.description}</p>
                    </div>
                  </>
                );
              })()}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Key Features */}
            <div>
              <Label className="text-sm font-medium">Key Features</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {tradingStyles[selectedStyle].features.map((feature, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Basic Settings */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">
                  Confidence Threshold: {customSettings.confidenceThreshold}%
                </Label>
                <Slider
                  value={[customSettings.confidenceThreshold]}
                  onValueChange={(value) => handleSettingChange('confidenceThreshold', value[0])}
                  max={90}
                  min={30}
                  step={5}
                  className="mt-2"
                  data-testid="slider-confidence"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum confidence level required for trade signals
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">
                  Maximum Leverage: {customSettings.maxLeverage}x
                </Label>
                <Slider
                  value={[customSettings.maxLeverage]}
                  onValueChange={(value) => handleSettingChange('maxLeverage', value[0])}
                  max={25}
                  min={1}
                  step={1}
                  className="mt-2"
                  data-testid="slider-leverage"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum leverage allowed for trades
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Preferred Timeframe</Label>
                <Select 
                  value={customSettings.timeframePreference} 
                  onValueChange={(value) => handleSettingChange('timeframePreference', value)}
                >
                  <SelectTrigger className="mt-2" data-testid="select-timeframe">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1m">1 Minute</SelectItem>
                    <SelectItem value="5m">5 Minutes</SelectItem>
                    <SelectItem value="15m">15 Minutes</SelectItem>
                    <SelectItem value="1h">1 Hour</SelectItem>
                    <SelectItem value="4h">4 Hours</SelectItem>
                    <SelectItem value="1d">1 Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Advanced Settings Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="advanced-settings" className="text-sm font-medium">
                Advanced Settings
              </Label>
              <Switch
                id="advanced-settings"
                checked={showAdvanced}
                onCheckedChange={setShowAdvanced}
                data-testid="switch-advanced"
              />
            </div>

            {/* Advanced Settings */}
            {showAdvanced && (
              <div className="space-y-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <Label htmlFor="aggressive-trading" className="text-sm">
                    Aggressive Trading
                  </Label>
                  <Switch
                    id="aggressive-trading"
                    checked={customSettings.tradingStyleSettings.aggressive}
                    onCheckedChange={(checked) => 
                      handleSettingChange('tradingStyleSettings', {
                        ...customSettings.tradingStyleSettings,
                        aggressive: checked
                      })
                    }
                    data-testid="switch-aggressive"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="scalping-mode" className="text-sm">
                    Scalping Mode
                  </Label>
                  <Switch
                    id="scalping-mode"
                    checked={customSettings.tradingStyleSettings.scalping}
                    onCheckedChange={(checked) => 
                      handleSettingChange('tradingStyleSettings', {
                        ...customSettings.tradingStyleSettings,
                        scalping: checked
                      })
                    }
                    data-testid="switch-scalping"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="volatility-focus" className="text-sm">
                    Volatility Focus
                  </Label>
                  <Switch
                    id="volatility-focus"
                    checked={customSettings.tradingStyleSettings.volatilityFocus}
                    onCheckedChange={(checked) => 
                      handleSettingChange('tradingStyleSettings', {
                        ...customSettings.tradingStyleSettings,
                        volatilityFocus: checked
                      })
                    }
                    data-testid="switch-volatility"
                  />
                </div>
              </div>
            )}

            {/* Save Button */}
            <Button 
              onClick={handleSavePreferences} 
              disabled={savePreferencesMutation.isPending || !selectedStyle}
              className="w-full"
              data-testid="button-save-preferences"
            >
              {savePreferencesMutation.isPending ? 'Saving...' : 'Save Trading Preferences'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default TradingStyleSelector;