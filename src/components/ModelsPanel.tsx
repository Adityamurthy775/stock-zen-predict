import { Brain, Calendar } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { ModelMetrics } from '@/types/stock';
import { cn } from '@/lib/utils';

interface ModelsPanelProps {
  metrics: ModelMetrics[];
}

export function ModelsPanel({ metrics }: ModelsPanelProps) {
  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'text-gain';
    if (accuracy >= 60) return 'text-accent';
    return 'text-loss';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <Brain className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Model Performance</h3>
      </div>
      
      <div className="space-y-6">
        {metrics.map((model) => (
          <div key={model.name} className="bg-secondary rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-foreground">{model.name}</h4>
              <span className={cn("text-2xl font-bold font-mono", getAccuracyColor(model.accuracy))}>
                {model.accuracy.toFixed(1)}%
              </span>
            </div>
            
            {/* Model Description */}
            <p className="text-sm text-muted-foreground mb-3 italic">
              {model.description}
            </p>
            
            <Progress value={model.accuracy} className="h-2 mb-4" />
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">MSE</p>
                <p className="font-mono font-medium text-foreground">{model.mse.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">MAE</p>
                <p className="font-mono font-medium text-foreground">{model.mae.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">R² Score</p>
                <p className="font-mono font-medium text-foreground">{model.r2Score.toFixed(3)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              Last trained: {model.lastTrained}
            </div>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground mt-4 text-center">
        Connect your ML backend API to get real model metrics
      </p>
    </div>
  );
}
