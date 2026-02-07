import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, BarChart3, PieChart } from 'lucide-react';
import type { Stock } from '@/types/stock';
import { PortfolioPieChart } from '@/components/PortfolioPieChart';
import { cn } from '@/lib/utils';

export interface PortfolioItem {
  symbol: string;
  name: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  currency: string;
}

interface PortfolioProps {
  stocks: Stock[];
  portfolio: PortfolioItem[];
  onAddToPortfolio: (item: Omit<PortfolioItem, 'currentPrice'>) => void;
  onRemoveFromPortfolio: (symbol: string) => void;
}

export function Portfolio({ stocks, portfolio, onAddToPortfolio, onRemoveFromPortfolio }: PortfolioProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');

  useEffect(() => {
    if (selectedSymbol) {
      const stock = stocks.find(s => s.symbol === selectedSymbol);
      if (stock) {
        setBuyPrice(stock.price.toFixed(2));
      }
    }
  }, [selectedSymbol, stocks]);

  const getCurrencyFromSymbol = (symbol: string): string => {
    const stock = stocks.find(s => s.symbol === symbol);
    if (stock?.currency === 'INR') return 'INR';
    const upperSymbol = symbol.toUpperCase();
    if (upperSymbol.includes('.NS') || upperSymbol.includes('.BO') || upperSymbol.includes('.BSE')) return 'INR';
    return 'USD';
  };

  const handleAdd = () => {
    const stock = stocks.find(s => s.symbol === selectedSymbol);
    if (!stock || !quantity || !buyPrice) return;
    const currency = stock.currency || getCurrencyFromSymbol(stock.symbol);
    onAddToPortfolio({
      symbol: stock.symbol,
      name: stock.name,
      quantity: parseFloat(quantity),
      buyPrice: parseFloat(buyPrice),
      currency,
    });
    setSelectedSymbol('');
    setQuantity('');
    setBuyPrice('');
    setIsDialogOpen(false);
  };

  const formatPrice = (value: number, currency = 'USD') => {
    const locale = currency === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  const totalInvestment = portfolio.reduce((sum, item) => sum + (item.buyPrice * item.quantity), 0);
  const totalCurrentValue = portfolio.reduce((sum, item) => sum + (item.currentPrice * item.quantity), 0);
  const totalGainLoss = totalCurrentValue - totalInvestment;
  const totalGainLossPercent = totalInvestment > 0 ? (totalGainLoss / totalInvestment) * 100 : 0;
  const isOverallPositive = totalGainLoss >= 0;

  return (
    <div className="space-y-6">
      {/* Overall Performance Banner */}
      {portfolio.length > 0 && (
        <div className={cn(
          "relative overflow-hidden rounded-xl p-6 border",
          isOverallPositive 
            ? "bg-gradient-to-br from-[hsl(var(--gain)/0.15)] via-card to-card border-[hsl(var(--gain)/0.3)]" 
            : "bg-gradient-to-br from-[hsl(var(--loss)/0.15)] via-card to-card border-[hsl(var(--loss)/0.3)]"
        )}>
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
            {isOverallPositive 
              ? <ArrowUpRight className="w-full h-full text-gain" /> 
              : <ArrowDownRight className="w-full h-full text-loss" />
            }
          </div>
          <div className="relative z-10">
            <p className="text-sm text-muted-foreground mb-1">Total Portfolio Returns</p>
            <div className="flex items-baseline gap-3">
              <span className={cn(
                "text-4xl font-bold font-mono tabular-nums",
                isOverallPositive ? "text-gain" : "text-loss"
              )}>
                {isOverallPositive ? '+' : ''}{totalGainLossPercent.toFixed(2)}%
              </span>
              <span className={cn(
                "text-xl font-semibold",
                isOverallPositive ? "text-gain" : "text-loss"
              )}>
                ({isOverallPositive ? '+' : ''}{formatPrice(totalGainLoss, portfolio[0]?.currency || 'USD')})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Portfolio Pie Charts */}
      <PortfolioPieChart portfolio={portfolio} />

      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={cn(
          "border overflow-hidden",
          "bg-gradient-to-br from-card via-card to-secondary/30 border-border"
        )}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Total Investment</span>
            </div>
            <p className="text-2xl font-bold text-foreground font-mono tabular-nums">
              {formatPrice(totalInvestment, portfolio[0]?.currency || 'USD')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{portfolio.length} holdings</p>
          </CardContent>
        </Card>
        
        <Card className={cn(
          "border overflow-hidden",
          "bg-gradient-to-br from-card via-card to-secondary/30 border-border"
        )}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Current Value</span>
            </div>
            <p className="text-2xl font-bold text-foreground font-mono tabular-nums">
              {formatPrice(totalCurrentValue, portfolio[0]?.currency || 'USD')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isOverallPositive ? '↑' : '↓'} {Math.abs(totalGainLossPercent).toFixed(2)}% from cost
            </p>
          </CardContent>
        </Card>
        
        <Card className={cn(
          "border overflow-hidden",
          isOverallPositive 
            ? "bg-gradient-to-br from-[hsl(var(--gain)/0.08)] via-card to-card border-[hsl(var(--gain)/0.2)]"
            : "bg-gradient-to-br from-[hsl(var(--loss)/0.08)] via-card to-card border-[hsl(var(--loss)/0.2)]"
        )}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                "p-2 rounded-lg",
                isOverallPositive ? "bg-[hsl(var(--gain)/0.15)]" : "bg-[hsl(var(--loss)/0.15)]"
              )}>
                {isOverallPositive 
                  ? <TrendingUp className="w-5 h-5 text-gain" />
                  : <TrendingDown className="w-5 h-5 text-loss" />
                }
              </div>
              <span className="text-sm font-medium text-muted-foreground">Total P&L</span>
            </div>
            <p className={cn(
              "text-2xl font-bold font-mono tabular-nums",
              isOverallPositive ? "text-gain" : "text-loss"
            )}>
              {isOverallPositive ? '+' : ''}{formatPrice(totalGainLoss, portfolio[0]?.currency || 'USD')}
            </p>
            <p className={cn(
              "text-xs font-medium mt-1",
              isOverallPositive ? "text-gain" : "text-loss"
            )}>
              {isOverallPositive ? '+' : ''}{totalGainLossPercent.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add to Portfolio Button */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <PieChart className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Holdings</h3>
          <Badge variant="secondary" className="text-xs">{portfolio.length}</Badge>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4" />
              Add Stock
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Add to Portfolio
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Select Stock</label>
                <select
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-background border border-border rounded-lg text-foreground"
                >
                  <option value="">Choose a stock...</option>
                  {stocks.map(stock => (
                    <option key={stock.symbol} value={stock.symbol}>
                      {stock.symbol} - {stock.name} ({stock.currency === 'INR' ? '₹' : '$'}{stock.price.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Quantity</label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Number of shares"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Buy Price (per share)</label>
                <Input
                  type="number"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  placeholder="Price per share"
                  className="mt-1"
                />
              </div>
              <Button onClick={handleAdd} className="w-full gap-2">
                <Plus className="w-4 h-4" />
                Add to Portfolio
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Holdings List */}
      {portfolio.length === 0 ? (
        <Card className="border-dashed border-2 border-border bg-card/50">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
              <Wallet className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Holdings Yet</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Add stocks to your portfolio to track your investments, P&L, and sector allocation.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {portfolio.map((item) => {
            const gainLoss = (item.currentPrice - item.buyPrice) * item.quantity;
            const gainLossPercent = ((item.currentPrice - item.buyPrice) / item.buyPrice) * 100;
            const isPositive = gainLoss >= 0;
            const totalValue = item.currentPrice * item.quantity;
            const invested = item.buyPrice * item.quantity;

            return (
              <Card key={item.symbol} className={cn(
                "border overflow-hidden transition-all duration-200 hover:shadow-card group",
                isPositive 
                  ? "border-l-4 border-l-[hsl(var(--gain))] border-border"
                  : "border-l-4 border-l-[hsl(var(--loss))] border-border"
              )}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-lg text-foreground">{item.symbol}</span>
                        <Badge variant="outline" className="text-xs font-mono">
                          {item.quantity} shares
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            isPositive 
                              ? "border-[hsl(var(--gain)/0.5)] text-gain" 
                              : "border-[hsl(var(--loss)/0.5)] text-loss"
                          )}
                        >
                          {isPositive ? '+' : ''}{gainLossPercent.toFixed(2)}%
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{item.name}</p>
                      
                      {/* Price Details */}
                      <div className="flex items-center gap-6 mt-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Current</p>
                          <p className="font-semibold font-mono tabular-nums text-foreground">
                            {formatPrice(item.currentPrice, item.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg Cost</p>
                          <p className="font-semibold font-mono tabular-nums text-muted-foreground">
                            {formatPrice(item.buyPrice, item.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Invested</p>
                          <p className="font-semibold font-mono tabular-nums text-muted-foreground">
                            {formatPrice(invested, item.currency)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right ml-4 flex-shrink-0">
                      <p className="text-lg font-bold font-mono tabular-nums text-foreground">
                        {formatPrice(totalValue, item.currency)}
                      </p>
                      <div className={cn(
                        "flex items-center justify-end gap-1 text-sm font-medium mt-1",
                        isPositive ? "text-gain" : "text-loss"
                      )}>
                        {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        <span>{isPositive ? '+' : ''}{formatPrice(gainLoss, item.currency)}</span>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveFromPortfolio(item.symbol)}
                      className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
