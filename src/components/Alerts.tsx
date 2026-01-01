import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Bell, Plus, Trash2, TrendingUp, TrendingDown, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
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
  soundPlayed?: boolean;
}

interface AlertsProps {
  stocks: Stock[];
  alerts: PriceAlert[];
  onAddAlert: (alert: Omit<PriceAlert, 'id' | 'currentPrice' | 'triggered'>) => void;
  onRemoveAlert: (id: string) => void;
  onToggleAlert: (id: string) => void;
}

// Known Indian stock symbols
const INDIAN_STOCK_SYMBOLS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR', 'SBIN',
  'BHARTIARTL', 'ITC', 'KOTAKBANK', 'LT', 'AXISBANK', 'WIPRO', 'ASIANPAINT',
  'MARUTI', 'HCLTECH', 'SUNPHARMA', 'TITAN', 'ULTRACEMCO', 'BAJFINANCE'
];

const isIndianStock = (symbol: string) => {
  const upperSymbol = symbol.toUpperCase();
  return symbol.includes('.NS') || symbol.includes('.BSE') || symbol.includes('.BO') || 
         symbol.includes('NSE:') || symbol.includes('BSE:') ||
         INDIAN_STOCK_SYMBOLS.includes(upperSymbol) ||
         INDIAN_STOCK_SYMBOLS.some(s => upperSymbol.includes(s));
};

// Alert sound function using Web Audio API
const playAlertSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a more attention-grabbing alert sound
    const playTone = (freq: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    // Play ascending tones
    playTone(523.25, audioContext.currentTime, 0.15); // C5
    playTone(659.25, audioContext.currentTime + 0.15, 0.15); // E5
    playTone(783.99, audioContext.currentTime + 0.3, 0.2); // G5
  } catch (error) {
    console.log('Audio playback failed:', error);
  }
};

export function Alerts({ stocks, alerts, onAddAlert, onRemoveAlert, onToggleAlert }: AlertsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const playedAlertsRef = useRef<Set<string>>(new Set());

  // Play sound when alerts are triggered
  useEffect(() => {
    if (!soundEnabled) return;
    
    const newlyTriggered = alerts.filter(
      alert => alert.triggered && !playedAlertsRef.current.has(alert.id)
    );
    
    if (newlyTriggered.length > 0) {
      playAlertSound();
      newlyTriggered.forEach(alert => {
        playedAlertsRef.current.add(alert.id);
      });
    }
  }, [alerts, soundEnabled]);

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

  const formatPrice = (value: number, symbol = '') => {
    const currencySymbol = isIndianStock(symbol) ? '₹' : '$';
    return `${currencySymbol}${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
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
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={soundEnabled ? 'text-primary' : 'text-muted-foreground'}
            title={soundEnabled ? 'Sound enabled' : 'Sound disabled'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
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
                        {stock.symbol} - {stock.name} ({formatPrice(stock.price, stock.symbol)})
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
                        {alert.condition === 'above' ? '↑' : '↓'} {formatPrice(alert.targetPrice, alert.symbol)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Current: {formatPrice(alert.currentPrice, alert.symbol)}
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
                        Target: {formatPrice(alert.targetPrice, alert.symbol)} • Current: {formatPrice(stock?.price || alert.currentPrice, alert.symbol)}
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
