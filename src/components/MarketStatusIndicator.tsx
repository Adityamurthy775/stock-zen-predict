import { Clock } from 'lucide-react';
import { useMarketStatus } from '@/hooks/useMarketStatus';
import { cn } from '@/lib/utils';

export function MarketStatusIndicator() {
  const status = useMarketStatus();

  return (
    <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-loss/20 flex items-center justify-center">
        <Clock className="w-5 h-5 text-loss" />
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-foreground font-medium">{status.market}</span>
          <span className={cn(
            "px-2 py-0.5 rounded text-xs font-bold uppercase",
            status.isOpen
              ? "bg-gain text-gain-foreground"
              : "bg-loss text-loss-foreground"
          )}>
            {status.isOpen ? 'Open' : 'Closed'}
          </span>
        </div>
        
        {!status.isOpen && status.nextOpenIn && (
          <p className="text-sm text-muted-foreground">
            Opens in {status.nextOpenIn}
          </p>
        )}
      </div>
      
      <div className="text-right">
        <p className="text-xs text-muted-foreground">Trading Hours (EST)</p>
        <p className="text-foreground font-mono">
          <span className="font-semibold">{status.openTime}</span>
          <span className="text-muted-foreground mx-1">-</span>
          <span className="font-semibold">{status.closeTime}</span>
        </p>
      </div>
    </div>
  );
}
