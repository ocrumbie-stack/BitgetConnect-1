import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNavigation } from "@/components/BottomNavigation";
import NotFound from "@/pages/not-found";
import Screener from "@/pages/screener";
import { Home } from "@/pages/home";
import { Markets } from "@/pages/markets";
import { Trade } from "@/pages/trade";
import BotPage from "@/pages/bot";
import { CreateScreener } from "@/pages/create-screener";
import { EditScreener } from "@/pages/edit-screener";

function Router() {
  return (
    <div className="relative">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/markets" component={Markets} />
        <Route path="/trade" component={Trade} />
        <Route path="/bot" component={BotPage} />
        <Route path="/create-screener" component={CreateScreener} />
        <Route path="/edit-screener/:id" component={EditScreener} />
        <Route path="/advanced" component={Screener} />
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
        <div className="dark">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
