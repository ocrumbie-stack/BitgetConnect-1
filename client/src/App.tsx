import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PasswordLogin } from "@/components/PasswordLogin";

import NotFound from "@/pages/not-found";
import Screener from "@/pages/screener";
import { Home } from "@/pages/home";
import Markets from "@/pages/markets";
import { Trade } from "@/pages/trade";
import BotPage from "@/pages/bot";
import { CreateScreener } from "@/pages/create-screener";
import { EditScreener } from "@/pages/edit-screener";
import FoldersPage from "@/pages/folders";
import FolderDetailPage from "@/pages/folder-detail";
import { Analyzer } from "@/pages/analyzer";
import { StrategyRecommender } from "@/pages/strategy-recommender";
import { Charts } from "@/pages/charts";
import { Assets } from "@/pages/assets";
import { Settings } from "@/pages/settings";
import BalanceHistory from "@/pages/balance-history";

function Router() {
  useScrollToTop(); // Auto-scroll to top on route changes
  const { user, isLoading, login } = useAuth();

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <PasswordLogin onLogin={login} />;
  }
  
  return (
    <div className="relative">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/markets" component={Markets} />
        <Route path="/trade" component={Trade} />
        <Route path="/charts" component={Charts} />
        <Route path="/bot" component={BotPage} />
        <Route path="/assets" component={Assets} />
        <Route path="/settings" component={Settings} />
        <Route path="/analyzer" component={Analyzer} />
        <Route path="/strategy-recommender" component={StrategyRecommender} />
        <Route path="/folders" component={FoldersPage} />
        <Route path="/folders/:id" component={FolderDetailPage} />
        <Route path="/create-screener" component={CreateScreener} />
        <Route path="/edit-screener/:id" component={EditScreener} />
        <Route path="/advanced" component={Screener} />
        <Route path="/balance-history" component={BalanceHistory} />
        <Route component={NotFound} />
      </Switch>
      <BottomNavigation />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <div className="dark">
            <Toaster />
            <Router />
          </div>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
