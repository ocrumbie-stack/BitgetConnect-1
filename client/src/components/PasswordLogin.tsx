import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PasswordLoginProps {
  onLogin: (user: { id: string; username: string }) => void;
}

export function PasswordLogin({ onLogin }: PasswordLoginProps) {
  // Login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Registration state
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Login failed');
        }
        
        return await response.json();
      } catch (error: any) {
        throw new Error(error.message || 'Login failed');
      }
    },
    onSuccess: (data) => {
      setError('');
      localStorage.setItem('octrader-user', JSON.stringify(data.user));
      onLogin(data.user);
    },
    onError: (error: Error) => {
      setError(error.message);
    }
  });

  const registerMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password, tradingStyle: 'balanced' })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Registration failed');
        }
        
        return await response.json();
      } catch (error: any) {
        throw new Error(error.message || 'Registration failed');
      }
    },
    onSuccess: (data) => {
      setRegError('');
      setRegSuccess('Account created successfully! Please log in with your credentials.');
      setRegUsername('');
      setRegPassword('');
      setConfirmPassword('');
    },
    onError: (error: Error) => {
      setRegError(error.message);
      setRegSuccess('');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }
    setError('');
    loginMutation.mutate({ username: username.trim(), password });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (!regUsername.trim() || !regPassword.trim() || !confirmPassword.trim()) {
      setRegError('Please fill in all fields');
      return;
    }

    if (regPassword !== confirmPassword) {
      setRegError('Passwords do not match');
      return;
    }

    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters long');
      return;
    }

    registerMutation.mutate({ username: regUsername.trim(), password: regPassword });
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
              OcTrader
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
              Access your trading dashboard or create a new account
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Create Account</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="mt-6">
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
                  <div className="relative">
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
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 pr-10"
                      data-testid="input-password"
                      disabled={loginMutation.isPending}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
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
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  If login fails in deployment, visit: /api/auth/create-demo-user
                </p>
              </div>
            </TabsContent>

            <TabsContent value="register" className="mt-6">
              <form onSubmit={handleRegister} className="space-y-4">
                {regError && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-900/20">
                    <AlertDescription className="text-red-700 dark:text-red-300">
                      {regError}
                    </AlertDescription>
                  </Alert>
                )}
                
                {regSuccess && (
                  <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
                    <AlertDescription className="text-green-700 dark:text-green-300">
                      {regSuccess}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="reg-username" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Username
                  </Label>
                  <Input
                    id="reg-username"
                    type="text"
                    placeholder="Choose a username"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
                    data-testid="input-reg-username"
                    disabled={registerMutation.isPending}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showRegPassword ? "text" : "password"}
                      placeholder="Create a password (min 6 characters)"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 pr-10"
                      data-testid="input-reg-password"
                      disabled={registerMutation.isPending}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      data-testid="button-toggle-reg-password"
                    >
                      {showRegPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
                    data-testid="input-confirm-password"
                    disabled={registerMutation.isPending}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={registerMutation.isPending}
                  data-testid="button-register"
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create Account
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}