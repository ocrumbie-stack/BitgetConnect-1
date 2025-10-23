import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { TrendingUp, Shield, Zap, Target, AlertTriangle, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

interface TradingStyleSelectorProps {
  userId?: string;
  onStyleChange?: (style: any) => void;
}

const tradingStyles = {
  conservative: {
    name: 'Conservative',
    icon: Shield,
    color: 'bg-blue-500',
    description: '4H + 1D timeframes for stable growth',
    settings: {
      timeframePreference: '4H+1D' as const,
    },
    features: ['4H + 1D timeframes', 'Long-term trends', 'Lower frequency trading']
  },
  balanced: {
    name: 'Balanced',
    icon: Target,
    color: 'bg-green-500',
    description: '15M + 1H timeframes for steady returns',
    settings: {
      timeframePreference: '15m+1H' as const,
    },
    features: ['15M + 1H timeframes', 'Medium-term trends', 'Balanced approach']
  },
  aggressive: {
    name: 'Aggressive',
    icon: Zap,
    color: 'bg-red-500',
    description: '1M + 5M timeframes for quick profits',
    settings: {
      timeframePreference: '1m+5m' as const,
    },
    features: ['1M + 5M timeframes', 'Fast scalping', 'High frequency trading']
  }
};

type TradingStyleSettings = {
  timeframePreference: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1m+5m' | '15m+1H' | '4H+1D';
};

export function TradingStyleSelector({ userId = 'default-user', onStyleChange }: TradingStyleSelectorProps) {
  const [selectedStyle, setSelectedStyle] = useState<keyof typeof tradingStyles | ''>('');
  const [customSettings, setCustomSettings] = useState<TradingStyleSettings>(tradingStyles.balanced.settings);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);



  // Fetch current user preferences
  const { data: userPrefs, isLoading } = useQuery({
    queryKey: ['/api/user-preferences', userId],
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
    
    // Automatically save the selection without requiring manual save
    const data = {
      tradingStyle: styleKey,
      preferences: tradingStyles[styleKey].settings,
    };
    
    fetch(`/api/user-preferences/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-preferences'] });
      onStyleChange?.(tradingStyles[styleKey].settings);
    });
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

      {/* Collapsible Configuration - Only shown when style is selected */}
      {selectedStyle && (
        <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <CollapsibleTrigger asChild>
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" data-testid="card-trading-summary">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
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
                            <div className="font-medium">{currentStyle.name} Style</div>
                            <div className="text-sm text-muted-foreground">
                              {customSettings.timeframePreference} timeframes
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {tradingStyles[selectedStyle].settings.timeframePreference}
                    </Badge>
                    {isDetailsOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <Card className="border-2 mt-2" data-testid="card-trading-details">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{tradingStyles[selectedStyle].name} Trading Style Details</CardTitle>
                <p className="text-sm text-muted-foreground">{tradingStyles[selectedStyle].description}</p>
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
                      Timeframe: {customSettings.timeframePreference}
                    </Label>
                    <div className="mt-2 p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        The scanner will analyze pairs on the {customSettings.timeframePreference} timeframes for this trading style.
                        Confidence threshold and other parameters are automatically optimized for best results.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

export default TradingStyleSelector;