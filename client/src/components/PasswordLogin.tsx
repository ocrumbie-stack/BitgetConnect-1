import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface PasswordLoginProps {
  onLogin: (user: { id: string; username: string }) => void;
}

export function PasswordLogin({ onLogin }: PasswordLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      try {
        const response = await apiRequest('/api/auth/login', {
          method: 'POST',
          body: { username, password }
        });
        return response;
      } catch (error: any) {
        throw new Error(error.message || 'Login failed');
      }
    },
    onSuccess: (data) => {
      setError('');
      localStorage.setItem('trading-app-user', JSON.stringify(data.user));
      onLogin(data.user);
    },
    onError: (error: Error) => {
      setError(error.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }
    setError('');
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 overflow-hidden">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Crypto Trading Platform
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
              Enter your credentials to access the trading dashboard
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-900/20">
                <AlertDescription className="text-red-700 dark:text-red-300">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
                data-testid="input-username"
                disabled={loginMutation.isPending}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
                data-testid="input-password"
                disabled={loginMutation.isPending}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
              disabled={loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Demo credentials: <strong>admin</strong> / <strong>password</strong>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}