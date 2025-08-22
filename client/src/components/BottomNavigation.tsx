import { Link, useLocation } from 'wouter';
import { Home, TrendingUp, BarChart3, Bot, Brain } from 'lucide-react';

export function BottomNavigation() {
  const [location] = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/markets', label: 'Markets', icon: TrendingUp },
    { path: '/trade', label: 'Trade', icon: BarChart3 },
    { path: '/bot', label: 'Bot', icon: Bot },
    { path: '/analyzer', label: 'Analyzer', icon: Brain },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-50">
      <div className="flex justify-around items-center py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}