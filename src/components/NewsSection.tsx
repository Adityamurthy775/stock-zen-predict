import { useState, useEffect } from 'react';
import { Newspaper, Clock, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { NewsItem } from '@/types/stock';
import { cn } from '@/lib/utils';

interface NewsSectionProps {
  news: NewsItem[];
}

export function NewsSection({ news }: NewsSectionProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  const categories = ['all', 'earnings', 'products', 'market', 'analyst'];
  
  // Update timestamp periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  const filteredNews = activeCategory === 'all' 
    ? news 
    : news.filter(item => item.category === activeCategory);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      earnings: 'Earnings',
      products: 'Product Launch',
      market: 'Market',
      analyst: 'Analyst Rating',
    };
    return labels[category] || category;
  };

  const handleNewsClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (news.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Newspaper className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Real-Time News</h3>
        </div>
        <p className="text-muted-foreground text-center py-8">
          No news available for this stock. Try a different stock symbol.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Real-Time News</h3>
          <span className="px-2 py-0.5 bg-gain/20 text-gain text-xs font-medium rounded animate-pulse">LIVE</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          Updated {lastUpdated.toLocaleTimeString('en-IN')}
        </div>
      </div>
      
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="w-full justify-start mb-4 bg-secondary">
          {categories.map(cat => (
            <TabsTrigger key={cat} value={cat} className="capitalize">
              {cat === 'all' ? 'All News' : getCategoryLabel(cat)}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value={activeCategory} className="mt-0">
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {filteredNews.map((item) => (
              <article 
                key={item.id} 
                onClick={() => handleNewsClick(item.url)}
                className="border-l-2 border-muted pl-4 py-2 hover:bg-secondary/50 rounded-r transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-secondary text-foreground">
                    {getCategoryLabel(item.category)}
                  </span>
                  <span className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
                    item.sentiment === 'positive' ? "bg-gain/20 text-gain" :
                    item.sentiment === 'negative' ? "bg-loss/20 text-loss" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {item.sentiment === 'positive' ? <TrendingUp className="w-3 h-3" /> : 
                     item.sentiment === 'negative' ? <TrendingDown className="w-3 h-3" /> : null}
                    {item.sentiment.charAt(0).toUpperCase() + item.sentiment.slice(1)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">{formatTime(item.publishedAt)}</span>
                </div>
                
                <h4 className="font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                  {item.title}
                </h4>
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{item.summary}</p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{item.source}</span>
                  <span className="text-sm text-primary flex items-center gap-1 group-hover:underline">
                    Read more <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
