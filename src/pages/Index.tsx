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
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Wallet, Bell } from 'lucide-react';

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
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">StockPredict AI</h1>
                <p className="text-xs text-muted-foreground">NSE/BSE ML-Powered Predictions</p>
              </div>
            </div>
            <MarketStatusIndicator />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Market Stats */}
        <div className="mb-6">
          <MarketStats stocks={stocks} modelMetrics={modelMetrics} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Stock List */}
          <div className="lg:col-span-3">
            <div className="bg-card border border-border rounded-lg h-[calc(100vh-280px)] overflow-hidden">
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
                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full justify-start bg-card border border-border">
                    <TabsTrigger value="portfolio" className="gap-2">
                      <Wallet className="w-4 h-4" />
                      Portfolio
                    </TabsTrigger>
                    <TabsTrigger value="alerts" className="gap-2">
                      <Bell className="w-4 h-4" />
                      Alerts
                    </TabsTrigger>
                    <TabsTrigger value="chart">Chart</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                    <TabsTrigger value="prediction">Prediction</TabsTrigger>
                    <TabsTrigger value="models">Models</TabsTrigger>
                  </TabsList>

                  <TabsContent value="portfolio" className="mt-6">
                    <Portfolio
                      stocks={stocks}
                      portfolio={portfolio}
                      onAddToPortfolio={addToPortfolio}
                      onRemoveFromPortfolio={removeFromPortfolio}
                    />
                  </TabsContent>

                  <TabsContent value="alerts" className="mt-6">
                    <Alerts
                      stocks={stocks}
                      alerts={alerts}
                      onAddAlert={addAlert}
                      onRemoveAlert={removeAlert}
                      onToggleAlert={toggleAlert}
                    />
                  </TabsContent>

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
                    />
                    <NewsSection news={news} />
                  </TabsContent>

                  <TabsContent value="history" className="mt-6">
                    <StockHistory 
                      timeSeries={timeSeries} 
                      currency={selectedStock.currency}
                    />
                  </TabsContent>

                  <TabsContent value="prediction" className="mt-6">
                    <PredictionPanel
                      prediction={prediction}
                      period={predictionPeriod}
                      onPeriodChange={changePredictionPeriod}
                      isMarketClosed={!marketStatus.isOpen}
                    />
                  </TabsContent>

                  <TabsContent value="models" className="mt-6">
                    <ModelsPanel metrics={modelMetrics} />
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
      </main>
    </div>
  );
};

export default Index;
