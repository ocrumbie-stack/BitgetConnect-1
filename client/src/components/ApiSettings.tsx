import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Key, CheckCircle, AlertCircle, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

interface ApiCredentials {
  apiKey: string;
  apiSecret: string;
  apiPassphrase: string;
}

interface ConnectionStatus {
  connected?: boolean;
  lastChecked?: string;
  hasCredentials?: boolean;
  message?: string;
  error?: string;
}

export function ApiSettings() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [credentials, setCredentials] = useState<ApiCredentials>({
    apiKey: '',
    apiSecret: '',
    apiPassphrase: ''
  });

  // Check connection status
  const { data: connectionStatus, refetch: refetchStatus } = useQuery<ConnectionStatus>({
    queryKey: ['/api/bitget/status'],
    refetchInterval: 30000 // Check every 30 seconds
  });

  // Save credentials mutation
  const saveCredentialsMutation = useMutation({
    mutationFn: async (creds: ApiCredentials) => {
      const response = await fetch('/api/bitget/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'default-user',
          ...creds
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save credentials');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "API Settings Updated! ✅",
        description: "Your Bitget credentials have been saved and verified successfully.",
      });
      setIsOpen(false);
      setCredentials({ apiKey: '', apiSecret: '', apiPassphrase: '' });
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ['/api/account'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bitget/status'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed ❌",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    if (!credentials.apiKey || !credentials.apiSecret || !credentials.apiPassphrase) {
      toast({
        title: "Missing Information",
        description: "Please fill in all API credential fields.",
        variant: "destructive",
      });
      return;
    }

    saveCredentialsMutation.mutate(credentials);
  };

  const isConnected = connectionStatus?.connected || false;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Bitget API Connection
            </div>
            <Badge variant={isConnected ? "default" : "secondary"} className={`${isConnected ? 'bg-green-600' : 'bg-gray-500'}`}>
              {isConnected ? (
                <><CheckCircle className="h-3 w-3 mr-1" />Connected</>
              ) : (
                <><AlertCircle className="h-3 w-3 mr-1" />Not Connected</>
              )}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {isConnected ? (
              "✅ Your app is connected to your Bitget account. Real-time data and trading are active."
            ) : (
              "Connect your Bitget API to enable real account balance, live trading, and order execution."
            )}
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Security:</strong> Your API credentials are encrypted and stored securely. Only futures trading permissions are required.
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button 
              onClick={() => setIsOpen(true)}
              className="flex-1"
              variant={isConnected ? "outline" : "default"}
            >
              <Settings className="h-4 w-4 mr-2" />
              {isConnected ? "Update API Settings" : "Setup API Connection"}
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.open('https://www.bitget.com/api-doc', '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>

          {connectionStatus?.lastChecked && (
            <div className="text-xs text-muted-foreground text-center">
              Last checked: {new Date(connectionStatus.lastChecked).toLocaleTimeString()}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bitget API Settings</DialogTitle>
            <DialogDescription>
              Enter your Bitget API credentials to enable live trading and account sync.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Required Permissions:</strong> Futures Trading (Read & Trade). 
                <br />Never share your API credentials with anyone.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div>
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="text"
                  value={credentials.apiKey}
                  onChange={(e) => setCredentials({...credentials, apiKey: e.target.value})}
                  placeholder="Enter your Bitget API Key"
                />
              </div>

              <div>
                <Label htmlFor="apiSecret">API Secret</Label>
                <div className="relative">
                  <Input
                    id="apiSecret"
                    type={showSecrets ? "text" : "password"}
                    value={credentials.apiSecret}
                    onChange={(e) => setCredentials({...credentials, apiSecret: e.target.value})}
                    placeholder="Enter your Bitget API Secret"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowSecrets(!showSecrets)}
                  >
                    {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="apiPassphrase">API Passphrase</Label>
                <div className="relative">
                  <Input
                    id="apiPassphrase"
                    type={showSecrets ? "text" : "password"}
                    value={credentials.apiPassphrase}
                    onChange={(e) => setCredentials({...credentials, apiPassphrase: e.target.value})}
                    placeholder="Enter your Bitget API Passphrase"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowSecrets(!showSecrets)}
                  >
                    {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
              <div className="text-xs text-blue-700 dark:text-blue-300">
                <p className="font-semibold mb-1">How to get your API credentials:</p>
                <p>1. Go to Bitget → Account → API Management</p>
                <p>2. Create New API Key</p>
                <p>3. Enable "Futures Trading" permissions</p>
                <p>4. Copy credentials here</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saveCredentialsMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {saveCredentialsMutation.isPending ? 'Verifying...' : 'Save & Connect'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}