import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Bell, Plus, Trash2, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import type { Stock } from '@/types/stock';

export interface PriceAlert {
  id: string;
  symbol: string;
  name: string;
  targetPrice: number;
  condition: 'above' | 'below';
  currentPrice: number;
  isActive: boolean;
  triggered: boolean;
  currency: string;
}

interface AlertsProps {
  stocks: Stock[];
  alerts: PriceAlert[];
  onAddAlert: (alert: Omit<PriceAlert, 'id' | 'currentPrice' | 'triggered'>) => void;
  onRemoveAlert: (id: string) => void;
  onToggleAlert: (id: string) => void;
}

export function Alerts({ stocks, alerts, onAddAlert, onRemoveAlert, onToggleAlert }: AlertsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');

  const handleAdd = () => {
    const stock = stocks.find(s => s.symbol === selectedSymbol);
    if (!stock || !targetPrice) return;

    onAddAlert({
      symbol: stock.symbol,
      name: stock.name,
      targetPrice: parseFloat(targetPrice),
      condition,
      isActive: true,
      currency: stock.currency || 'INR',
    });

    setSelectedSymbol('');
    setTargetPrice('');
    setCondition('above');
    setIsDialogOpen(false);
  };

  const formatPrice = (value: number, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  const activeAlerts = alerts.filter(a => a.isActive && !a.triggered);
  const triggeredAlerts = alerts.filter(a => a.triggered);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Price Alerts</h3>
          {activeAlerts.length > 0 && (
            <Badge variant="secondary">{activeAlerts.length} active</Badge>
          )}
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Alert
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Create Price Alert</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Select Stock</label>
                <select
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="w-full mt-1 p-2 bg-background border border-border rounded-md text-foreground"
                >
                  <option value="">Choose a stock...</option>
                  {stocks.map(stock => (
                    <option key={stock.symbol} value={stock.symbol}>
                      {stock.symbol} - {stock.name} ({formatPrice(stock.price)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Condition</label>
                <div className="flex gap-2 mt-1">
                  <Button
                    type="button"
                    variant={condition === 'above' ? 'default' : 'outline'}
                    onClick={() => setCondition('above')}
                    className="flex-1 gap-2"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Goes Above
                  </Button>
                  <Button
                    type="button"
                    variant={condition === 'below' ? 'default' : 'outline'}
                    onClick={() => setCondition('below')}
                    className="flex-1 gap-2"
                  >
                    <TrendingDown className="w-4 h-4" />
                    Goes Below
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Target Price</label>
                <Input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder="Enter target price"
                  className="mt-1"
                />
              </div>
              <Button onClick={handleAdd} className="w-full gap-2">
                <Bell className="w-4 h-4" />
                Create Alert
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Triggered Alerts */}
      {triggeredAlerts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-warning flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Triggered Alerts
          </h4>
          {triggeredAlerts.map((alert) => (
            <Card key={alert.id} className="bg-warning/10 border-warning/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{alert.symbol}</span>
                      <Badge variant="outline" className="text-warning border-warning">
                        {alert.condition === 'above' ? '↑' : '↓'} {formatPrice(alert.targetPrice)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Current: {formatPrice(alert.currentPrice)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveAlert(alert.id)}
                    className="text-muted-foreground hover:text-loss"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Active Alerts */}
      {alerts.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No alerts set. Create alerts to get notified of price changes.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {alerts.filter(a => !a.triggered).map((alert) => {
            const stock = stocks.find(s => s.symbol === alert.symbol);
            const progress = stock 
              ? alert.condition === 'above'
                ? ((stock.price - alert.currentPrice) / (alert.targetPrice - alert.currentPrice)) * 100
                : ((alert.currentPrice - stock.price) / (alert.currentPrice - alert.targetPrice)) * 100
              : 0;

            return (
              <Card key={alert.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{alert.symbol}</span>
                        <Badge 
                          variant="outline" 
                          className={alert.condition === 'above' ? 'text-profit border-profit' : 'text-loss border-loss'}
                        >
                          {alert.condition === 'above' ? (
                            <><TrendingUp className="w-3 h-3 mr-1" /> Above</>
                          ) : (
                            <><TrendingDown className="w-3 h-3 mr-1" /> Below</>
                          )}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Target: {formatPrice(alert.targetPrice)} • Current: {formatPrice(stock?.price || alert.currentPrice)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={alert.isActive}
                        onCheckedChange={() => onToggleAlert(alert.id)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveAlert(alert.id)}
                        className="text-muted-foreground hover:text-loss"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
