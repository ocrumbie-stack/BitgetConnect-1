import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

interface QuickRiskButtonProps {
  onClick: () => void;
  className?: string;
}

export function QuickRiskButton({ onClick, className = "" }: QuickRiskButtonProps) {
  return (
    <Button
      size="sm"
      variant="ghost"
      className={`h-6 w-6 p-0 ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title="Risk Analysis"
    >
      <Shield className="h-3 w-3 text-muted-foreground hover:text-foreground" />
    </Button>
  );
}