import { useState } from 'react';
import { Search, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { searchSymbols } from '@/services/stockService';
import type { Stock } from '@/types/stock';
import { cn } from '@/lib/utils';

interface StockListProps {
  stocks: Stock[];
  selectedStock: Stock | null;
  onSelectStock: (stock: Stock) => void;
  onAddStock: (symbol: string) => void;
  onRemoveStock: (symbol: string) => void;
}

export function StockList({
  stocks,
  selectedStock,
  onSelectStock,
  onAddStock,
}: StockListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{symbol: string; name: string; type: string; exchange: string}>>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.length < 1) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchSymbols(query);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddStock = (symbol: string) => {
    onAddStock(symbol);
    setSearchQuery('');
    setSearchResults([]);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 10000000) {
      return `${(volume / 10000000).toFixed(1)}Cr`;
    }
    if (volume >= 100000) {
      return `${(volume / 100000).toFixed(1)}L`;
    }
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  };

  // List of known Indian stock symbols (without exchange suffix)
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

  const formatPrice = (price: number, symbol: string) => {
    const currencySymbol = isIndianStock(symbol) ? '₹' : '$';
    return `${currencySymbol}${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatSymbol = (symbol: string) => {
    return symbol.split(':')[0];
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search Section */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <Search className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Add Stocks</h2>
        </div>
        
        <div className="relative">
          <Input
            type="text"
            placeholder="Search NSE/BSE stocks..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
          />
          
          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-card overflow-hidden max-h-[300px] overflow-y-auto">
              {searchResults.map((result) => {
                const isIndian = isIndianStock(result.symbol) || 
                  result.exchange?.includes('NSE') || 
                  result.exchange?.includes('BSE') ||
                  result.exchange?.includes('National Stock Exchange') ||
                  result.exchange?.includes('Bombay');
                const currencyLabel = isIndian ? '₹ INR' : '$ USD';
                
                return (
                  <button
                    key={`${result.symbol}-${result.exchange}`}
                    onClick={() => handleAddStock(result.symbol)}
                    className="w-full px-4 py-3 text-left hover:bg-secondary transition-colors flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-foreground">{result.symbol}</span>
                      <span className="text-xs text-muted-foreground ml-2">({result.exchange})</span>
                      <span className="text-xs text-primary ml-2 font-medium">{currencyLabel}</span>
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">{result.name}</p>
                    </div>
                    <Plus className="w-4 h-4 text-gain flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground mt-2">
          Search any NSE, BSE, or global stocks
        </p>
      </div>

      {/* Stock List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Tracked Stocks</h3>
          
          <div className="space-y-2">
            {stocks.map((stock) => {
              const isSelected = selectedStock?.symbol === stock.symbol;
              const isPositive = stock.changePercent >= 0;
              
              return (
                <button
                  key={stock.symbol}
                  onClick={() => onSelectStock(stock)}
                  className={cn(
                    "w-full p-4 rounded-lg text-left transition-all duration-200",
                    "border hover:shadow-card",
                    isSelected
                      ? "bg-secondary border-gain/30 shadow-glow"
                      : "bg-card border-border hover:border-muted-foreground/30"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{formatSymbol(stock.symbol)}</span>
                        <span className={cn(
                          "flex items-center text-sm font-medium",
                          isPositive ? "text-gain" : "text-loss"
                        )}>
                          {isPositive ? (
                            <TrendingUp className="w-3 h-3 mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1" />
                          )}
                          {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-[180px]">{stock.name}</p>
                      <p className="text-lg font-semibold text-foreground mt-1 font-mono tabular-nums">
                        {formatPrice(stock.price, stock.symbol)}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        Vol: {formatVolume(stock.volume)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
