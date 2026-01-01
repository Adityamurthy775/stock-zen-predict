import { useState, useEffect } from 'react';
import { Plus, X, Folder, FolderPlus, Star, ChevronDown, ChevronRight, Trash2, Edit2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Stock } from '@/types/stock';
import { cn } from '@/lib/utils';

interface WatchlistGroup {
  id: string;
  name: string;
  color: string;
  stocks: string[];
}

interface WatchlistProps {
  stocks: Stock[];
  onSelectStock: (stock: Stock) => void;
}

const GROUP_COLORS = [
  { name: 'Blue', value: 'bg-blue-500' },
  { name: 'Green', value: 'bg-green-500' },
  { name: 'Purple', value: 'bg-purple-500' },
  { name: 'Orange', value: 'bg-orange-500' },
  { name: 'Pink', value: 'bg-pink-500' },
  { name: 'Yellow', value: 'bg-yellow-500' },
];

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

export function Watchlist({ stocks, onSelectStock }: WatchlistProps) {
  const [groups, setGroups] = useState<WatchlistGroup[]>(() => {
    const saved = localStorage.getItem('watchlist-groups');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Tech Stocks', color: 'bg-blue-500', stocks: ['AAPL', 'MSFT', 'TCS', 'INFY'] },
      { id: '2', name: 'Banking', color: 'bg-green-500', stocks: ['HDFCBANK', 'ICICIBANK'] },
      { id: '3', name: 'Favorites', color: 'bg-yellow-500', stocks: ['RELIANCE'] },
    ];
  });

  const [expandedGroups, setExpandedGroups] = useState<string[]>(['1', '2', '3']);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('bg-blue-500');
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [addStockToGroup, setAddStockToGroup] = useState<string | null>(null);
  const [stockSearchQuery, setStockSearchQuery] = useState('');

  useEffect(() => {
    localStorage.setItem('watchlist-groups', JSON.stringify(groups));
  }, [groups]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const createGroup = () => {
    if (!newGroupName.trim()) return;
    
    const newGroup: WatchlistGroup = {
      id: Date.now().toString(),
      name: newGroupName.trim(),
      color: newGroupColor,
      stocks: [],
    };
    
    setGroups(prev => [...prev, newGroup]);
    setExpandedGroups(prev => [...prev, newGroup.id]);
    setNewGroupName('');
    setIsAddGroupOpen(false);
  };

  const deleteGroup = (groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
    setExpandedGroups(prev => prev.filter(id => id !== groupId));
  };

  const startEditGroup = (group: WatchlistGroup) => {
    setEditingGroup(group.id);
    setEditGroupName(group.name);
  };

  const saveEditGroup = (groupId: string) => {
    if (!editGroupName.trim()) return;
    setGroups(prev => prev.map(g => 
      g.id === groupId ? { ...g, name: editGroupName.trim() } : g
    ));
    setEditingGroup(null);
    setEditGroupName('');
  };

  const addStockToGroupHandler = (groupId: string, symbol: string) => {
    setGroups(prev => prev.map(g => 
      g.id === groupId && !g.stocks.includes(symbol)
        ? { ...g, stocks: [...g.stocks, symbol] }
        : g
    ));
    setAddStockToGroup(null);
    setStockSearchQuery('');
  };

  const removeStockFromGroup = (groupId: string, symbol: string) => {
    setGroups(prev => prev.map(g => 
      g.id === groupId
        ? { ...g, stocks: g.stocks.filter(s => s !== symbol) }
        : g
    ));
  };

  const getStockBySymbol = (symbol: string): Stock | undefined => {
    return stocks.find(s => 
      s.symbol === symbol || 
      s.symbol.includes(symbol) || 
      symbol.includes(s.symbol.split(':')[0])
    );
  };

  const filteredStocksForAdd = stocks.filter(s => 
    s.symbol.toLowerCase().includes(stockSearchQuery.toLowerCase()) ||
    s.name.toLowerCase().includes(stockSearchQuery.toLowerCase())
  );

  const formatPrice = (stock: Stock) => {
    const currencySymbol = isIndianStock(stock.symbol) ? '₹' : '$';
    return `${currencySymbol}${stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Watchlist
          </CardTitle>
          <Dialog open={isAddGroupOpen} onOpenChange={setIsAddGroupOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <FolderPlus className="w-4 h-4" />
                New Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogDescription>
                  Create a custom group to organize your stocks
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Group Name</label>
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g., Tech Giants, Blue Chips"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Color</label>
                  <Select value={newGroupColor} onValueChange={setNewGroupColor}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GROUP_COLORS.map(color => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={cn("w-3 h-3 rounded-full", color.value)} />
                            {color.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={createGroup} className="w-full">
                  Create Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[500px] pr-3">
          <div className="space-y-3">
            {groups.map(group => (
              <div key={group.id} className="border border-border rounded-lg overflow-hidden">
                <div 
                  className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleGroup(group.id)}
                >
                  <div className="flex items-center gap-2">
                    {expandedGroups.includes(group.id) ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div className={cn("w-2.5 h-2.5 rounded-full", group.color)} />
                    {editingGroup === group.id ? (
                      <Input
                        value={editGroupName}
                        onChange={(e) => setEditGroupName(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-7 w-32 text-sm"
                        autoFocus
                      />
                    ) : (
                      <span className="font-medium text-foreground">{group.name}</span>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {group.stocks.length}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {editingGroup === group.id ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => saveEditGroup(group.id)}
                      >
                        <Check className="w-3.5 h-3.5 text-gain" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => startEditGroup(group)}
                      >
                        <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    )}
                    <Dialog open={addStockToGroup === group.id} onOpenChange={(open) => setAddStockToGroup(open ? group.id : null)}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Stock to {group.name}</DialogTitle>
                          <DialogDescription>
                            Search and select a stock to add to this group
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 pt-4">
                          <Input
                            value={stockSearchQuery}
                            onChange={(e) => setStockSearchQuery(e.target.value)}
                            placeholder="Search stocks..."
                          />
                          <ScrollArea className="h-[200px]">
                            <div className="space-y-1">
                              {filteredStocksForAdd.map(stock => (
                                <button
                                  key={stock.symbol}
                                  className="w-full p-2 rounded-lg hover:bg-muted/50 flex items-center justify-between text-left"
                                  onClick={() => addStockToGroupHandler(group.id, stock.symbol)}
                                  disabled={group.stocks.includes(stock.symbol)}
                                >
                                  <div>
                                    <div className="font-medium text-foreground">{stock.symbol}</div>
                                    <div className="text-xs text-muted-foreground">{stock.name}</div>
                                  </div>
                                  {group.stocks.includes(stock.symbol) && (
                                    <Badge variant="secondary" className="text-xs">Added</Badge>
                                  )}
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => deleteGroup(group.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-loss" />
                    </Button>
                  </div>
                </div>
                
                {expandedGroups.includes(group.id) && (
                  <div className="p-2 space-y-1">
                    {group.stocks.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-3">
                        No stocks in this group
                      </p>
                    ) : (
                      group.stocks.map(symbol => {
                        const stock = getStockBySymbol(symbol);
                        if (!stock) return (
                          <div key={symbol} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                            <span className="text-sm text-muted-foreground">{symbol} (Not tracked)</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeStockFromGroup(group.id, symbol)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        );
                        
                        return (
                          <div 
                            key={symbol}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => onSelectStock(stock)}
                          >
                            <div>
                              <div className="font-medium text-sm text-foreground">{stock.symbol.split(':')[0].replace('.NS', '')}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[150px]">{stock.name}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <div className="font-mono text-sm text-foreground">{formatPrice(stock)}</div>
                                <div className={cn(
                                  "text-xs font-medium",
                                  stock.changePercent >= 0 ? "text-gain" : "text-loss"
                                )}>
                                  {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeStockFromGroup(group.id, symbol);
                                }}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {groups.length === 0 && (
              <div className="text-center py-8">
                <Folder className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No watchlist groups yet</p>
                <p className="text-sm text-muted-foreground">Create a group to organize your stocks</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
