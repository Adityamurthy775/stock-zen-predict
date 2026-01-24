import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStockData } from '@/hooks/useStockData';
import { StockList } from '@/components/StockList';
import { StockChart } from '@/components/StockChart';
import { StockHistory } from '@/components/StockHistory';
import { PredictionPanel } from '@/components/PredictionPanel';
import { NewsSection } from '@/components/NewsSection';
import { ModelsPanel } from '@/components/ModelsPanel';
import { MarketStats } from '@/components/MarketStats';
import { MarketStatusIndicator } from '@/components/MarketStatusIndicator';
import { Portfolio } from '@/components/Portfolio';
import { Alerts } from '@/components/Alerts';
import { BestStockOfDay } from '@/components/BestStockOfDay';
import { Watchlist } from '@/components/Watchlist';
import { ComparativeChart } from '@/components/ComparativeChart';
import { StockChatbot } from '@/components/StockChatbot';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Wallet, Bell, LayoutDashboard, History, Brain, ChartLine, Star, GitCompareArrows, Target } from 'lucide-react';
import { PredictionAccuracy } from '@/components/PredictionAccuracy';
import { cn } from '@/lib/utils';

const Index = () => {
  const [activeTab, setActiveTab] = useState('chart');
  
  const {
    stocks,
    selectedStock,
    timeSeries,
    prediction,
    predictionPeriod,
    predictionLine,
    modelMetrics,
    news,
    loading,
    stocksLoading,
    loadingMessage,
    marketStatus,
    selectStock,
    addStock,
    removeStock,
    changePredictionPeriod,
    // Portfolio
    portfolio,
    addToPortfolio,
    removeFromPortfolio,
    // Alerts
    alerts,
    addAlert,
    removeAlert,
    toggleAlert,
  } = useStockData();

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Navigation Tabs */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Stock Market Prediction Platform</h1>
                <p className="text-xs text-muted-foreground">Multimodal AI: EfficientNet B0 + FinBERT Sentiment + LSTM Neural Networks | Currency: ₹ INR</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <MarketStatusIndicator />
            </div>
          </div>
          
          {/* Navigation Tabs in Header */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('chart')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                activeTab === 'chart' 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                activeTab === 'portfolio' 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Wallet className="w-4 h-4" />
              Portfolio
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                activeTab === 'alerts' 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Bell className="w-4 h-4" />
              Alerts
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Show Portfolio or Alerts when selected from header */}
        {activeTab === 'portfolio' ? (
          <Portfolio
            stocks={stocks}
            portfolio={portfolio}
            onAddToPortfolio={addToPortfolio}
            onRemoveFromPortfolio={removeFromPortfolio}
          />
        ) : activeTab === 'alerts' ? (
          <Alerts
            stocks={stocks}
            alerts={alerts}
            onAddAlert={addAlert}
            onRemoveAlert={removeAlert}
            onToggleAlert={toggleAlert}
          />
        ) : (
          <>
            {/* Market Stats */}
            <div className="mb-6">
              <MarketStats stocks={stocks} modelMetrics={modelMetrics} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Sidebar - Stock List */}
              <div className="lg:col-span-3">
                <div className="bg-card border border-border rounded-lg h-[calc(100vh-320px)] overflow-hidden">
                  {loading ? (
                    <div className="p-4 space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : (
                    <StockList
                      stocks={stocks}
                      selectedStock={selectedStock}
                      onSelectStock={selectStock}
                      onAddStock={addStock}
                      onRemoveStock={removeStock}
                    />
                  )}
                </div>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-9 space-y-6">
                {selectedStock && prediction ? (
                  <>
                    {/* Content Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="w-full justify-start bg-card border border-border flex-wrap">
                        <TabsTrigger value="chart" className="gap-2">
                          <ChartLine className="w-4 h-4" />
                          Chart
                        </TabsTrigger>
                        <TabsTrigger value="prediction" className="gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Prediction
                        </TabsTrigger>
                        <TabsTrigger value="watchlist" className="gap-2">
                          <Star className="w-4 h-4" />
                          Watchlist
                        </TabsTrigger>
                        <TabsTrigger value="models" className="gap-2">
                          <Brain className="w-4 h-4" />
                          Models
                        </TabsTrigger>
                        <TabsTrigger value="compare" className="gap-2">
                          <GitCompareArrows className="w-4 h-4" />
                          Compare
                        </TabsTrigger>
                        <TabsTrigger value="history" className="gap-2">
                          <History className="w-4 h-4" />
                          History
                        </TabsTrigger>
                        <TabsTrigger value="accuracy" className="gap-2">
                          <Target className="w-4 h-4" />
                          Accuracy
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="chart" className="mt-6 space-y-6">
                        <StockChart
                          stock={selectedStock}
                          timeSeries={timeSeries}
                          predictionLine={predictionLine}
                          isMarketClosed={!marketStatus.isOpen}
                        />
                        <PredictionPanel
                          prediction={prediction}
                          period={predictionPeriod}
                          onPeriodChange={changePredictionPeriod}
                          isMarketClosed={!marketStatus.isOpen}
                          stockSymbol={selectedStock.symbol}
                        />
                        <NewsSection news={news} />
                        <BestStockOfDay stocks={stocks} />
                      </TabsContent>

                      <TabsContent value="watchlist" className="mt-6">
                        <Watchlist
                          stocks={stocks}
                          onSelectStock={selectStock}
                        />
                      </TabsContent>

                      <TabsContent value="prediction" className="mt-6">
                        <PredictionPanel
                          prediction={prediction}
                          period={predictionPeriod}
                          onPeriodChange={changePredictionPeriod}
                          isMarketClosed={!marketStatus.isOpen}
                          stockSymbol={selectedStock.symbol}
                        />
                      </TabsContent>

                      <TabsContent value="compare" className="mt-6">
                        <ComparativeChart 
                          stocks={stocks}
                          selectedStock={selectedStock}
                        />
                      </TabsContent>

                      <TabsContent value="history" className="mt-6">
                        <StockHistory 
                          timeSeries={timeSeries} 
                          currency={selectedStock.currency}
                          stockSymbol={selectedStock.symbol}
                        />
                      </TabsContent>

                      <TabsContent value="models" className="mt-6">
                        <ModelsPanel metrics={modelMetrics} />
                      </TabsContent>

                      <TabsContent value="accuracy" className="mt-6">
                        <PredictionAccuracy
                          timeSeries={timeSeries}
                          stockSymbol={selectedStock.symbol}
                          currency={selectedStock.currency}
                        />
                      </TabsContent>
                    </Tabs>
                  </>
                ) : (
                  <div className="bg-card border border-border rounded-lg p-12 text-center">
                    <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-foreground mb-2">Select a Stock</h2>
                    <p className="text-muted-foreground">Choose a stock from the list to view predictions and analysis</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Stock Market Chatbot */}
      <StockChatbot />
      
      {/* Loading Overlay */}
      <LoadingOverlay isLoading={stocksLoading} message={loadingMessage} />
    </div>
  );
};

export default Index;
