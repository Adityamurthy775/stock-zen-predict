import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import type { Stock } from '@/types/stock';

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

  // Auto-fill current price when stock is selected
  useEffect(() => {
    if (selectedSymbol) {
      const stock = stocks.find(s => s.symbol === selectedSymbol);
      if (stock) {
        setBuyPrice(stock.price.toFixed(2));
      }
    }
  }, [selectedSymbol, stocks]);

  // Detect currency based on stock exchange
  const getCurrencyFromSymbol = (symbol: string): string => {
    const upperSymbol = symbol.toUpperCase();
    // Indian exchanges: NSE (.NS) and BSE (.BO or .BSE)
    if (upperSymbol.includes('.NS') || upperSymbol.includes('.BO') || upperSymbol.includes('.BSE')) {
      return 'INR';
    }
    // Default to USD for international stocks (NYSE, NASDAQ, etc.)
    return 'USD';
  };

  const handleAdd = () => {
    const stock = stocks.find(s => s.symbol === selectedSymbol);
    if (!stock || !quantity || !buyPrice) return;

    const currency = getCurrencyFromSymbol(stock.symbol);

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

  const formatPrice = (value: number, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  const totalInvestment = portfolio.reduce((sum, item) => sum + (item.buyPrice * item.quantity), 0);
  const totalCurrentValue = portfolio.reduce((sum, item) => sum + (item.currentPrice * item.quantity), 0);
  const totalGainLoss = totalCurrentValue - totalInvestment;
  const totalGainLossPercent = totalInvestment > 0 ? (totalGainLoss / totalInvestment) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Wallet className="w-4 h-4" />
              <span className="text-sm">Total Investment</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatPrice(totalInvestment)}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Current Value</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatPrice(totalCurrentValue)}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              {totalGainLoss >= 0 ? (
                <TrendingUp className="w-4 h-4 text-profit" />
              ) : (
                <TrendingDown className="w-4 h-4 text-loss" />
              )}
              <span className="text-sm">Total P&L</span>
            </div>
            <p className={`text-xl font-bold ${totalGainLoss >= 0 ? 'text-profit' : 'text-loss'}`}>
              {totalGainLoss >= 0 ? '+' : ''}{formatPrice(totalGainLoss)}
              <span className="text-sm ml-2">({totalGainLossPercent.toFixed(2)}%)</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add to Portfolio Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">Holdings</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Stock
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Add to Portfolio</DialogTitle>
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
                      {stock.symbol} - {stock.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Quantity</label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Number of shares"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Buy Price (per share)</label>
                <Input
                  type="number"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  placeholder="Price per share"
                  className="mt-1"
                />
              </div>
              <Button onClick={handleAdd} className="w-full">
                Add to Portfolio
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Holdings List */}
      {portfolio.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No holdings yet. Add stocks to track your portfolio.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {portfolio.map((item) => {
            const gainLoss = (item.currentPrice - item.buyPrice) * item.quantity;
            const gainLossPercent = ((item.currentPrice - item.buyPrice) / item.buyPrice) * 100;
            const isPositive = gainLoss >= 0;

            return (
              <Card key={item.symbol} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{item.symbol}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.quantity} shares
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.name}</p>
                    </div>
                    
                    <div className="text-right mr-4">
                      <p className="font-semibold text-foreground">{formatPrice(item.currentPrice * item.quantity)}</p>
                      <div className={`flex items-center justify-end gap-1 text-sm ${isPositive ? 'text-profit' : 'text-loss'}`}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>{isPositive ? '+' : ''}{formatPrice(gainLoss)} ({gainLossPercent.toFixed(2)}%)</span>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveFromPortfolio(item.symbol)}
                      className="text-muted-foreground hover:text-loss"
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
