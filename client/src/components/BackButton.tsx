import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

interface BackButtonProps {
  to?: string;
  label?: string;
  className?: string;
}

export function BackButton({ to, label = 'Back', className = '' }: BackButtonProps) {
  const [, navigate] = useLocation();

  const handleBack = () => {
    if (to) {
      navigate(to);
    } else {
      // Use browser back if no specific route provided
      window.history.back();
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={`flex items-center gap-2 text-muted-foreground hover:text-foreground ${className}`}
      data-testid="button-back"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}