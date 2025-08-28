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

export function TradingStyleSelector({ userId = 'default-user', onStyleChange }: TradingStyleSelectorProps) {
  const [selectedStyle, setSelectedStyle] = useState<keyof typeof tradingStyles>('balanced');
  const [customSettings, setCustomSettings] = useState(tradingStyles.balanced.settings);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { toast } = useToast();

  // Fetch current user preferences
  const { data: userPrefs, isLoading } = useQuery({
    queryKey: ['/api/user-preferences', userId],
  });

  // Save user preferences mutation
  const savePreferencesMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/user-preferences/${userId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
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
    if (userPrefs?.tradingStyle) {
      setSelectedStyle(userPrefs.tradingStyle);
      if (userPrefs.preferences) {
        setCustomSettings(userPrefs.preferences);
      }
    }
  }, [userPrefs]);

  const handleStyleSelect = (styleKey: keyof typeof tradingStyles) => {
    setSelectedStyle(styleKey);
    setCustomSettings(tradingStyles[styleKey].settings);
  };

  const handleSavePreferences = () => {
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

  const currentStyle = tradingStyles[selectedStyle];
  const IconComponent = currentStyle.icon;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Loading trading preferences...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Style Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(tradingStyles).map(([key, style]) => {
          const Icon = style.icon;
          const isSelected = selectedStyle === key;
          
          return (
            <Card 
              key={key}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={() => handleStyleSelect(key as keyof typeof tradingStyles)}
              data-testid={`style-card-${key}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${style.color}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{style.name}</CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {style.description}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <Badge variant="default" className="bg-blue-500">
                      Selected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {style.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500">Confidence:</span>
                    <span className="ml-1 font-medium">{style.settings.confidenceThreshold}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Max Leverage:</span>
                    <span className="ml-1 font-medium">{style.settings.maxLeverage}x</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Current Selection Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <IconComponent className="w-5 h-5" />
            <span>{currentStyle.name} Trading Style</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-lg font-bold text-blue-600">{customSettings.confidenceThreshold}%</div>
              <div className="text-xs text-gray-600">Min Confidence</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-lg font-bold text-green-600">{customSettings.maxLeverage}x</div>
              <div className="text-xs text-gray-600">Max Leverage</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-lg font-bold text-purple-600">{customSettings.timeframePreference}</div>
              <div className="text-xs text-gray-600">Timeframe</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-lg font-bold text-orange-600">
                {customSettings.riskTolerance?.toUpperCase()}
              </div>
              <div className="text-xs text-gray-600">Risk Level</div>
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Label htmlFor="advanced-settings" className="text-sm font-medium">
              Advanced Settings
            </Label>
            <Switch
              id="advanced-settings"
              checked={showAdvanced}
              onCheckedChange={setShowAdvanced}
              data-testid="toggle-advanced-settings"
            />
          </div>

          {/* Advanced Settings Panel */}
          {showAdvanced && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Confidence Threshold: {customSettings.confidenceThreshold}%</Label>
                <Slider
                  value={[customSettings.confidenceThreshold]}
                  onValueChange={(value) => handleSettingChange('confidenceThreshold', value[0])}
                  max={90}
                  min={30}
                  step={5}
                  className="w-full"
                  data-testid="slider-confidence"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Maximum Leverage: {customSettings.maxLeverage}x</Label>
                <Slider
                  value={[customSettings.maxLeverage]}
                  onValueChange={(value) => handleSettingChange('maxLeverage', value[0])}
                  max={25}
                  min={1}
                  step={1}
                  className="w-full"
                  data-testid="slider-leverage"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Preferred Timeframe</Label>
                  <Select
                    value={customSettings.timeframePreference}
                    onValueChange={(value) => handleSettingChange('timeframePreference', value)}
                  >
                    <SelectTrigger data-testid="select-timeframe">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1m">1 Minute</SelectItem>
                      <SelectItem value="5m">5 Minutes</SelectItem>
                      <SelectItem value="15m">15 Minutes</SelectItem>
                      <SelectItem value="1h">1 Hour</SelectItem>
                      <SelectItem value="4h">4 Hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Risk Tolerance</Label>
                  <Select
                    value={customSettings.riskTolerance}
                    onValueChange={(value) => handleSettingChange('riskTolerance', value)}
                  >
                    <SelectTrigger data-testid="select-risk-tolerance">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Risk</SelectItem>
                      <SelectItem value="medium">Medium Risk</SelectItem>
                      <SelectItem value="high">High Risk</SelectItem>
                      <SelectItem value="extreme">Extreme Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Trading Style Features */}
              <div className="space-y-3">
                <Label>Trading Features</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="aggressive-mode" className="text-sm">
                      Aggressive Mode
                    </Label>
                    <Switch
                      id="aggressive-mode"
                      checked={customSettings.tradingStyleSettings?.aggressive || false}
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
                      Scalping Focus
                    </Label>
                    <Switch
                      id="scalping-mode"
                      checked={customSettings.tradingStyleSettings?.scalping || false}
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
                      checked={customSettings.tradingStyleSettings?.volatilityFocus || false}
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
              </div>
            </div>
          )}

          {/* Save Button */}
          <Button
            onClick={handleSavePreferences}
            disabled={savePreferencesMutation.isPending}
            className="w-full"
            data-testid="button-save-preferences"
          >
            {savePreferencesMutation.isPending ? 'Saving...' : 'Save Trading Style'}
          </Button>
        </CardContent>
      </Card>

      {/* Risk Warning */}
      {selectedStyle === 'high_risk' && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800 dark:text-red-200">High Risk Warning</h4>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  High-risk trading can result in significant losses. Only use capital you can afford to lose.
                  Consider starting with lower leverage and increasing gradually.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}