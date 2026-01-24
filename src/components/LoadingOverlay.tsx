import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingOverlay({ 
  isLoading, 
  message = 'Loading stocks...', 
  size = 'md',
  className 
}: LoadingOverlayProps) {
  if (!isLoading) return null;

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={cn(
      "fixed bottom-20 right-6 z-40 flex items-center gap-3 px-4 py-3 rounded-lg",
      "bg-card border border-border shadow-lg backdrop-blur-sm",
      "animate-in fade-in slide-in-from-bottom-2 duration-300",
      className
    )}>
      <Loader2 className={cn(sizeClasses[size], "text-primary animate-spin")} />
      <span className="text-sm font-medium text-foreground">{message}</span>
    </div>
  );
}
