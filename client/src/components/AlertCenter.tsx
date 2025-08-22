import { useState, useEffect } from 'react';
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
    queryFn: () => apiRequest(`/api/alerts/${userId}`) as Promise<Alert[]>,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch alert settings
  const { data: alertSettingsData = [], isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/alert-settings', userId],
    queryFn: () => apiRequest(`/api/alert-settings/${userId}`) as Promise<AlertSetting[]>,
  });

  const alerts = Array.isArray(alertsData) ? alertsData : [];
  const alertSettings = Array.isArray(alertSettingsData) ? alertSettingsData : [];

  // Mark alert as read
  const markAsReadMutation = useMutation({
    mutationFn: (alertId: string) => apiRequest(`/api/alerts/${alertId}/read`, 'PUT'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts', userId] });
    },
  });

  // Mark all alerts as read
  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiRequest(`/api/alerts/${userId}/read-all`, 'PUT'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts', userId] });
      toast({ title: 'All alerts marked as read' });
    },
  });

  // Delete alert
  const deleteAlertMutation = useMutation({
    mutationFn: (alertId: string) => apiRequest(`/api/alerts/${alertId}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts', userId] });
      toast({ title: 'Alert deleted' });
    },
  });

  // Create alert setting
  const createSettingMutation = useMutation({
    mutationFn: (setting: any) => apiRequest('/api/alert-settings', 'POST', setting),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alert-settings', userId] });
      toast({ title: 'Alert setting created' });
      setShowCreateAlert(false);
    },
  });

  // Update alert setting
  const updateSettingMutation = useMutation({
    mutationFn: ({ id, ...updates }: any) => apiRequest(`/api/alert-settings/${id}`, 'PUT', updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alert-settings', userId] });
      toast({ title: 'Alert setting updated' });
    },
  });

  // Delete alert setting
  const deleteSettingMutation = useMutation({
    mutationFn: (settingId: string) => apiRequest(`/api/alert-settings/${settingId}`, 'DELETE'),
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
                    No alerts yet
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
                    No alert settings configured
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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

    onSubmit({
      userId,
      alertType,
      method,
      threshold: threshold || null,
      isEnabled,
      config
    });
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