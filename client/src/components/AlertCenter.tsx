import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Bell, 
  BellOff, 
  Settings, 
  Trash2, 
  Check, 
  Pin, 
  PinOff,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  Plus,
  Mail,
  Webhook,
  Smartphone
} from 'lucide-react';
import type { Alert, AlertSetting } from '@shared/schema';

interface AlertCenterProps {
  userId?: string;
}

export function AlertCenter({ userId = 'default-user' }: AlertCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('alerts');
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch alerts
  const { data: alertsData = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['/api/alerts', userId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/alerts/${userId}`);
        if (!response.ok) {
          console.error('Failed to fetch alerts:', response.status, response.statusText);
          return [];
        }
        const data = await response.json();
        console.log('Fetched alerts:', data);
        return data;
      } catch (error) {
        console.error('Error fetching alerts:', error);
        return [];
      }
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch alert settings
  const { data: alertSettingsData = [], isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/alert-settings', userId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/alert-settings/${userId}`);
        if (!response.ok) {
          console.error('Failed to fetch alert settings:', response.status, response.statusText);
          return [];
        }
        const data = await response.json();
        console.log('Fetched alert settings:', data);
        return data;
      } catch (error) {
        console.error('Error fetching alert settings:', error);
        return [];
      }
    },
  });

  const alerts = Array.isArray(alertsData) ? alertsData : [];
  const alertSettings = Array.isArray(alertSettingsData) ? alertSettingsData : [];

  // Mark alert as read
  const markAsReadMutation = useMutation({
    mutationFn: (alertId: string) => apiRequest('PUT', `/api/alerts/${alertId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts', userId] });
    },
  });

  // Mark all alerts as read
  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiRequest('PUT', `/api/alerts/${userId}/read-all`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts', userId] });
      toast({ title: 'All alerts marked as read' });
    },
  });

  // Delete alert
  const deleteAlertMutation = useMutation({
    mutationFn: (alertId: string) => apiRequest('DELETE', `/api/alerts/${alertId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts', userId] });
      toast({ title: 'Alert deleted' });
    },
  });

  // Create alert setting
  const createSettingMutation = useMutation({
    mutationFn: async (setting: any) => {
      console.log('Creating alert setting:', setting);
      const response = await apiRequest('POST', '/api/alert-settings', setting);
      console.log('Alert setting response:', response);
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Alert setting created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/alert-settings', userId] });
      toast({ title: 'Alert setting created successfully' });
      setShowCreateAlert(false);
    },
    onError: (error) => {
      console.error('Failed to create alert setting:', error);
      toast({ title: 'Failed to create alert setting', variant: 'destructive' });
    }
  });

  // Update alert setting
  const updateSettingMutation = useMutation({
    mutationFn: ({ id, ...updates }: any) => apiRequest('PUT', `/api/alert-settings/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alert-settings', userId] });
      toast({ title: 'Alert setting updated' });
    },
  });

  // Delete alert setting
  const deleteSettingMutation = useMutation({
    mutationFn: (settingId: string) => apiRequest('DELETE', `/api/alert-settings/${settingId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alert-settings', userId] });
      toast({ title: 'Alert setting deleted' });
    },
  });

  const unreadAlerts = alerts.filter((alert: Alert) => !alert.isRead);

  const getAlertIcon = (alertType: string, severity: string) => {
    if (severity === 'error') return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (severity === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    if (severity === 'success') return <CheckCircle className="h-4 w-4 text-green-500" />;
    
    // Specific alert type icons
    if (alertType.includes('pnl_gain')) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (alertType.includes('pnl_loss')) return <TrendingDown className="h-4 w-4 text-red-500" />;
    if (alertType.includes('screener')) return <Settings className="h-4 w-4 text-blue-500" />;
    if (alertType.includes('trend')) return <TrendingUp className="h-4 w-4 text-purple-500" />;
    if (alertType.includes('volume')) return <Bell className="h-4 w-4 text-orange-500" />;
    if (alertType.includes('price') || alertType.includes('breakout')) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (alertType.includes('technical')) return <Settings className="h-4 w-4 text-cyan-500" />;
    if (alertType.includes('support') || alertType.includes('resistance')) return <TrendingUp className="h-4 w-4 text-indigo-500" />;
    if (alertType.includes('unusual') || alertType.includes('news')) return <Info className="h-4 w-4 text-yellow-500" />;
    
    return <Info className="h-4 w-4 text-blue-500" />;
  };

  const formatTime = (date: Date | string | null) => {
    if (!date) return '--:--';
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="relative p-2" data-testid="button-alerts">
          <Bell className="h-5 w-5" />
          {unreadAlerts.length > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
              {unreadAlerts.length > 9 ? '9+' : unreadAlerts.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl h-[80vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alert Center
            {unreadAlerts.length > 0 && (
              <Badge className="bg-red-500 text-white">
                {unreadAlerts.length} unread
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 px-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Recent Alerts</h3>
                {unreadAlerts.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAllAsReadMutation.mutate()}
                    disabled={markAllAsReadMutation.isPending}
                    data-testid="button-mark-all-read"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Mark All Read
                  </Button>
                )}
              </div>
            </div>

            <ScrollArea className="h-[50vh]">
              <div className="space-y-2">
                {alertsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading alerts...</div>
                ) : alerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <div className="space-y-2">
                      <p>No alerts yet</p>
                      <p className="text-xs">
                        Alerts will appear here when your configured conditions are met.
                        <br />
                        Check the Settings tab to see your alert configurations.
                      </p>
                    </div>
                  </div>
                ) : (
                  alerts.map((alert: Alert) => (
                    <Card
                      key={alert.id}
                      className={`${!alert.isRead ? 'border-blue-200 bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            {getAlertIcon(alert.alertType, alert.severity)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{alert.title}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {alert.alertType.replace('_', ' ')}
                                </Badge>
                                {!alert.isRead && (
                                  <Badge className="bg-blue-500 text-white text-xs">New</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                              
                              {alert.data && (
                                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                  {alert.data.tradingPair && (
                                    <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                      {alert.data.tradingPair}
                                    </span>
                                  )}
                                  {alert.data.pnl && (
                                    <span className={`px-2 py-1 rounded ${
                                      parseFloat(alert.data.pnl.replace(/[^0-9.-]/g, '')) >= 0 
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                    }`}>
                                      PnL: {alert.data.pnl}
                                    </span>
                                  )}
                                  {alert.data.price && (
                                    <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                      Price: ${alert.data.price}
                                    </span>
                                  )}
                                  {alert.data.screenerName && (
                                    <span className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded">
                                      {alert.data.screenerName}
                                    </span>
                                  )}
                                  {alert.data.volume && (
                                    <span className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 px-2 py-1 rounded">
                                      Vol: {alert.data.volume}
                                    </span>
                                  )}
                                  {alert.data.indicator && (
                                    <span className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 px-2 py-1 rounded">
                                      {alert.data.indicator}: {alert.data.indicatorValue}
                                    </span>
                                  )}
                                  {alert.data.timeframe && (
                                    <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                      {alert.data.timeframe}
                                    </span>
                                  )}
                                  {alert.data.confidence && (
                                    <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 px-2 py-1 rounded">
                                      {alert.data.confidence}% confidence
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              <div className="text-xs text-muted-foreground mt-2">
                                {formatTime(alert.createdAt)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {!alert.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsReadMutation.mutate(alert.id)}
                                disabled={markAsReadMutation.isPending}
                                data-testid={`button-mark-read-${alert.id}`}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteAlertMutation.mutate(alert.id)}
                              disabled={deleteAlertMutation.isPending}
                              data-testid={`button-delete-alert-${alert.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Alert Settings</h3>
              <Button
                onClick={() => setShowCreateAlert(true)}
                data-testid="button-create-alert-setting"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Setting
              </Button>
            </div>

            <ScrollArea className="h-[50vh]">
              <div className="space-y-4">
                {settingsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading settings...</div>
                ) : alertSettings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <div className="space-y-2">
                      <p>No alert settings configured</p>
                      <p className="text-xs">
                        Click "Add Setting" to create your first alert configuration.
                      </p>
                    </div>
                  </div>
                ) : (
                  alertSettings.map((setting: AlertSetting) => (
                    <AlertSettingCard
                      key={setting.id}
                      setting={setting}
                      onUpdate={(updates) => updateSettingMutation.mutate({ id: setting.id, ...updates })}
                      onDelete={() => deleteSettingMutation.mutate(setting.id)}
                      isUpdating={updateSettingMutation.isPending}
                      isDeleting={deleteSettingMutation.isPending}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {showCreateAlert && (
        <CreateAlertSettingDialog
          userId={userId}
          onClose={() => setShowCreateAlert(false)}
          onSubmit={(setting) => createSettingMutation.mutate(setting)}
          isSubmitting={createSettingMutation.isPending}
        />
      )}
    </Dialog>
  );
}

interface AlertSettingCardProps {
  setting: AlertSetting;
  onUpdate: (updates: Partial<AlertSetting>) => void;
  onDelete: () => void;
  isUpdating: boolean;
  isDeleting: boolean;
}

function AlertSettingCard({ setting, onUpdate, onDelete, isUpdating, isDeleting }: AlertSettingCardProps) {
  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'webhook': return <Webhook className="h-4 w-4" />;
      case 'browser_notification': return <Smartphone className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getMethodIcon(setting.method)}
            <div>
              <h4 className="font-medium capitalize">
                {setting.alertType.replace('_', ' ')} Alert
              </h4>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Method: {setting.method.replace('_', ' ')}</span>
                {setting.threshold && <span>• Threshold: {setting.threshold}</span>}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              checked={setting.isEnabled || false}
              onCheckedChange={(enabled) => onUpdate({ isEnabled: enabled })}
              disabled={isUpdating}
              data-testid={`switch-alert-${setting.id}`}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={isDeleting}
              data-testid={`button-delete-setting-${setting.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface CreateAlertSettingDialogProps {
  userId: string;
  onClose: () => void;
  onSubmit: (setting: any) => void;
  isSubmitting: boolean;
}

function CreateAlertSettingDialog({ userId, onClose, onSubmit, isSubmitting }: CreateAlertSettingDialogProps) {
  const [alertType, setAlertType] = useState('pnl_gain');
  const [method, setMethod] = useState('in_app');
  const [threshold, setThreshold] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [screenerName, setScreenerName] = useState('');
  const [trendDirection, setTrendDirection] = useState('bullish');
  const [timeframe, setTimeframe] = useState('1h');
  const [indicator, setIndicator] = useState('rsi');
  const [signal, setSignal] = useState('');
  const [tradingPair, setTradingPair] = useState('');
  const [folderName, setFolderName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted');
    
    const config: any = {};
    
    if (alertType === 'screener_match') {
      config.screenerName = screenerName;
    }
    
    if (alertType === 'trend_change') {
      config.trendDirection = trendDirection;
      config.timeframe = timeframe;
    }
    
    if (alertType === 'technical_signal') {
      config.technicalIndicator = indicator;
      config.timeframe = timeframe;
    }

    // Add trading pair or folder to config
    if (tradingPair) {
      config.tradingPair = tradingPair;
    }
    if (folderName) {
      config.folderName = folderName;
    }

    const settingData = {
      userId,
      alertType,
      method,
      threshold: threshold || null,
      isEnabled,
      config
    };

    console.log('Submitting alert setting:', settingData);
    onSubmit(settingData);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Alert Setting</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="alertType">Alert Type</Label>
            <Select value={alertType} onValueChange={setAlertType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pnl_gain">PnL Gain</SelectItem>
                <SelectItem value="pnl_loss">PnL Loss</SelectItem>
                <SelectItem value="entry_signal">Entry Signal</SelectItem>
                <SelectItem value="exit_signal">Exit Signal</SelectItem>
                <SelectItem value="bot_error">Bot Error</SelectItem>
                <SelectItem value="performance_milestone">Performance Milestone</SelectItem>
                <SelectItem value="screener_match">Screener Match</SelectItem>
                <SelectItem value="trend_change">Trend Change</SelectItem>
                <SelectItem value="volume_spike">Volume Spike</SelectItem>
                <SelectItem value="price_breakout">Price Breakout</SelectItem>
                <SelectItem value="technical_signal">Technical Signal</SelectItem>
                <SelectItem value="support_resistance">Support/Resistance</SelectItem>
                <SelectItem value="unusual_activity">Unusual Activity</SelectItem>
                <SelectItem value="market_news">Market News</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="method">Notification Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_app">In App</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="browser_notification">Browser Notification</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(alertType.includes('pnl') || alertType.includes('performance') || alertType.includes('volume') || alertType.includes('price')) && (
            <div>
              <Label htmlFor="threshold">
                {alertType.includes('volume') ? 'Volume Threshold (%)' : 
                 alertType.includes('price') ? 'Price Change (%)' : 
                 'Threshold (%)'}
              </Label>
              <Input
                id="threshold"
                type="number"
                step="0.1"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder={
                  alertType.includes('volume') ? 'e.g., 200 for 200% volume increase' :
                  alertType.includes('price') ? 'e.g., 5 for 5% price move' :
                  'e.g., 5 for 5%'
                }
                data-testid="input-threshold"
              />
            </div>
          )}

          {alertType === 'screener_match' && (
            <div>
              <Label htmlFor="screenerSelect">Select Screener</Label>
              <Input
                id="screenerSelect"
                type="text"
                value={screenerName}
                onChange={(e) => setScreenerName(e.target.value)}
                placeholder="Enter screener name or ID"
                data-testid="input-screener"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Alert when any pair matches the selected screener criteria
              </p>
            </div>
          )}

          {alertType === 'trend_change' && (
            <div className="space-y-2">
              <div>
                <Label htmlFor="trendDirection">Trend Direction</Label>
                <Select value={trendDirection} onValueChange={setTrendDirection}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bullish">Bullish</SelectItem>
                    <SelectItem value="bearish">Bearish</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="timeframe">Timeframe</Label>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5m">5 Minutes</SelectItem>
                    <SelectItem value="15m">15 Minutes</SelectItem>
                    <SelectItem value="1h">1 Hour</SelectItem>
                    <SelectItem value="4h">4 Hours</SelectItem>
                    <SelectItem value="1d">1 Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {alertType === 'technical_signal' && (
            <div className="space-y-2">
              <div>
                <Label htmlFor="indicator">Technical Indicator</Label>
                <Select value={indicator} onValueChange={setIndicator}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rsi">RSI</SelectItem>
                    <SelectItem value="macd">MACD</SelectItem>
                    <SelectItem value="bollinger">Bollinger Bands</SelectItem>
                    <SelectItem value="stochastic">Stochastic</SelectItem>
                    <SelectItem value="moving_average">Moving Average</SelectItem>
                    <SelectItem value="volume">Volume</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="signal">Signal Type</Label>
                <Input
                  id="signal"
                  type="text"
                  value={signal}
                  onChange={(e) => setSignal(e.target.value)}
                  placeholder="e.g., Oversold, Crossover, Breakout"
                  data-testid="input-signal"
                />
              </div>
            </div>
          )}

          {/* Trading Pair Selection with Auto-suggest */}
          <TradingPairAutosuggest
            value={tradingPair}
            onChange={setTradingPair}
            placeholder="e.g., BTCUSDT, ETHUSDT or leave empty for all pairs"
          />

          {/* Folder Selection */}
          <div>
            <Label htmlFor="folderName">Folder (Optional)</Label>
            <Input
              id="folderName"
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g., DeFi Tokens, Top 10, My Watchlist"
              data-testid="input-folder-name"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Monitor alerts for all pairs in a specific folder
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isEnabled"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
              data-testid="switch-enabled"
            />
            <Label htmlFor="isEnabled">Enable this alert</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              data-testid="button-submit-alert-setting"
            >
              {isSubmitting ? 'Creating...' : 'Create Alert'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Trading Pair Auto-suggest Component
interface TradingPairAutosuggestProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function TradingPairAutosuggest({ value, onChange, placeholder }: TradingPairAutosuggestProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch futures data for auto-suggest
  const { data: futuresData = [] } = useQuery({
    queryKey: ['/api/futures'],
    refetchInterval: 5000,
  });

  // Common trading pairs for quick suggestions
  const commonPairs = [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT', 
    'XRPUSDT', 'DOTUSDT', 'MATICUSDT', 'LINKUSDT', 'AVAXUSDT',
    'LTCUSDT', 'BCHUSDT', 'FILUSDT', 'TRXUSDT', 'ETCUSDT'
  ];

  // Filter and update suggestions based on input
  useEffect(() => {
    if (!value.trim()) {
      setSuggestions(commonPairs.slice(0, 8));
      return;
    }

    const searchTerm = value.toUpperCase();
    const allPairs = [
      ...commonPairs,
      ...futuresData.map((f: any) => f.symbol || '').filter((s: string) => s)
    ];

    const filtered = [...new Set(allPairs)]
      .filter(pair => pair.includes(searchTerm))
      .slice(0, 10);

    setSuggestions(filtered);
  }, [value, futuresData]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowSuggestions(true);
    setSelectedIndex(-1);
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev <= 0 ? suggestions.length - 1 : prev - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <Label htmlFor="tradingPair">Trading Pair (Optional)</Label>
      <div className="relative">
        <Input
          ref={inputRef}
          id="tradingPair"
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          data-testid="input-trading-pair"
          className="pr-8"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
          onClick={() => setShowSuggestions(!showSuggestions)}
        >
          <Settings className="h-3 w-3" />
        </Button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors ${
                index === selectedIndex ? 'bg-accent text-accent-foreground' : ''
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{suggestion}</span>
                {futuresData.find((f: any) => f.symbol === suggestion) && (
                  <span className="text-xs text-muted-foreground">
                    ${futuresData.find((f: any) => f.symbol === suggestion)?.price || 'N/A'}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
      
      <p className="text-xs text-muted-foreground mt-1">
        Specify a trading pair or leave empty to monitor all pairs
      </p>
    </div>
  );
}