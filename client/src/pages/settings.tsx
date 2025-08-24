import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Settings as SettingsIcon, Moon, Sun, Monitor, Bell, Shield, Database, Palette, Globe } from 'lucide-react';
import { ApiSettings } from '@/components/ApiSettings';

export function Settings() {
  const [, setLocation] = useLocation();
  const [theme, setTheme] = useState('system');
  const [notifications, setNotifications] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [riskWarnings, setRiskWarnings] = useState(true);
  const [dataUsage, setDataUsage] = useState('normal');
  const [defaultLeverage, setDefaultLeverage] = useState('5');
  const [language, setLanguage] = useState('en');

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/')}
            >
              <X className="h-4 w-4" />
            </Button>
            <h1 className="text-base font-semibold text-foreground">Settings</h1>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Configure your trading platform</p>
      </div>

      <div className="p-4 space-y-4">
        {/* API Configuration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4" />
              API Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ApiSettings />
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Palette className="h-4 w-4" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Theme</div>
                <div className="text-xs text-muted-foreground">Choose your preferred theme</div>
              </div>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Light
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Dark
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      System
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Trading Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <SettingsIcon className="h-4 w-4" />
              Trading Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Default Leverage</div>
                <div className="text-xs text-muted-foreground">Set default leverage for new trades</div>
              </div>
              <Select value={defaultLeverage} onValueChange={setDefaultLeverage}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1x</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                  <SelectItem value="5">5x</SelectItem>
                  <SelectItem value="10">10x</SelectItem>
                  <SelectItem value="20">20x</SelectItem>
                  <SelectItem value="50">50x</SelectItem>
                  <SelectItem value="100">100x</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Risk Warnings</div>
                <div className="text-xs text-muted-foreground">Show warnings for high-risk trades</div>
              </div>
              <Switch checked={riskWarnings} onCheckedChange={setRiskWarnings} />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Auto Refresh Data</div>
                <div className="text-xs text-muted-foreground">Automatically update market data</div>
              </div>
              <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bell className="h-4 w-4" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Push Notifications</div>
                <div className="text-xs text-muted-foreground">Get alerts for important events</div>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
          </CardContent>
        </Card>

        {/* Data Usage Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4" />
              Data & Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Data Usage</div>
                <div className="text-xs text-muted-foreground">Optimize for your connection</div>
              </div>
              <Select value={dataUsage} onValueChange={setDataUsage}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Language</div>
                <div className="text-xs text-muted-foreground">Choose your language</div>
              </div>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">EN</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="ko">한국어</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-center py-4">
              <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                Your API keys are encrypted and stored securely
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}