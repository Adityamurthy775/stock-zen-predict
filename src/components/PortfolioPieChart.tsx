import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import type { PortfolioItem } from '@/components/Portfolio';

interface PortfolioPieChartProps {
  portfolio: PortfolioItem[];
}

// Vibrant color palette for pie charts
const HOLDING_COLORS = [
  '#FF6B6B', // Coral Red
  '#4ECDC4', // Teal
  '#45B7D1', // Sky Blue
  '#96CEB4', // Sage Green
  '#FFEAA7', // Soft Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Golden
  '#BB8FCE', // Lavender
  '#85C1E9', // Light Blue
  '#F8B500', // Amber
  '#00CED1', // Dark Cyan
];

const SECTOR_COLORS: Record<string, string> = {
  'Technology': '#3B82F6',  // Blue
  'Finance': '#10B981',     // Emerald
  'Healthcare': '#EF4444',  // Red
  'Energy': '#F59E0B',      // Amber
  'Consumer': '#8B5CF6',    // Violet
  'Industrial': '#6366F1',  // Indigo
  'Telecom': '#14B8A6',     // Teal
  'Other': '#6B7280',       // Gray
};

// Sector mapping based on common stock categories
const getSectorFromSymbol = (symbol: string): string => {
  const upperSymbol = symbol.toUpperCase();
  
  // Technology
  if (['AAPL', 'MSFT', 'GOOGL', 'GOOG', 'META', 'NVDA', 'AMD', 'INTC', 'CRM', 'ORCL', 'ADBE', 'CSCO', 'IBM', 'TCS.NS', 'INFY.NS', 'WIPRO.NS', 'HCLTECH.NS', 'TECHM.NS', 'LTIM.NS'].some(s => upperSymbol.includes(s))) {
    return 'Technology';
  }
  
  // Finance/Banking
  if (['JPM', 'BAC', 'GS', 'MS', 'C', 'WFC', 'AXP', 'V', 'MA', 'HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'AXISBANK.NS', 'KOTAKBANK.NS', 'BAJFINANCE.NS', 'BAJAJFINSV.NS', 'HDFC.NS'].some(s => upperSymbol.includes(s))) {
    return 'Finance';
  }
  
  // Healthcare/Pharma
  if (['JNJ', 'UNH', 'PFE', 'ABBV', 'MRK', 'LLY', 'TMO', 'ABT', 'SUNPHARMA.NS', 'DRREDDY.NS', 'CIPLA.NS', 'DIVISLAB.NS', 'APOLLOHOSP.NS'].some(s => upperSymbol.includes(s))) {
    return 'Healthcare';
  }
  
  // Energy
  if (['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'RELIANCE.NS', 'ONGC.NS', 'BPCL.NS', 'IOC.NS', 'NTPC.NS', 'POWERGRID.NS', 'ADANIGREEN.NS'].some(s => upperSymbol.includes(s))) {
    return 'Energy';
  }
  
  // Consumer/Retail
  if (['AMZN', 'WMT', 'HD', 'COST', 'NKE', 'MCD', 'SBUX', 'TGT', 'KO', 'PEP', 'PG', 'HINDUNILVR.NS', 'ITC.NS', 'NESTLEIND.NS', 'BRITANNIA.NS', 'TITAN.NS', 'ASIANPAINT.NS', 'MARUTI.NS', 'TATAMOTORS.NS', 'M&M.NS', 'BAJAJ-AUTO.NS', 'HEROMOTOCO.NS', 'EICHERMOT.NS'].some(s => upperSymbol.includes(s))) {
    return 'Consumer';
  }
  
  // Industrial/Manufacturing
  if (['CAT', 'DE', 'HON', 'GE', 'MMM', 'UNP', 'UPS', 'LMT', 'RTX', 'BA', 'TATASTEEL.NS', 'JSWSTEEL.NS', 'HINDALCO.NS', 'COALINDIA.NS', 'ADANIENT.NS', 'ADANIPORTS.NS', 'LT.NS', 'ULTRACEMCO.NS', 'GRASIM.NS', 'SHREECEM.NS'].some(s => upperSymbol.includes(s))) {
    return 'Industrial';
  }
  
  // Telecom
  if (['T', 'VZ', 'TMUS', 'BHARTIARTL.NS', 'IDEA.NS'].some(s => upperSymbol.includes(s))) {
    return 'Telecom';
  }
  
  return 'Other';
};

const formatCurrency = (value: number, currency: string): string => {
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function PortfolioPieChart({ portfolio }: PortfolioPieChartProps) {
  // Calculate data by value (individual holdings)
  const valueData = useMemo(() => {
    return portfolio.map((item, index) => ({
      name: item.symbol,
      value: item.currentPrice * item.quantity,
      currency: item.currency,
      color: HOLDING_COLORS[index % HOLDING_COLORS.length],
    }));
  }, [portfolio]);

  // Calculate data by sector
  const sectorData = useMemo(() => {
    const sectorMap: Record<string, { value: number; inr: number; usd: number }> = {};
    
    portfolio.forEach((item) => {
      const sector = getSectorFromSymbol(item.symbol);
      const itemValue = item.currentPrice * item.quantity;
      
      if (!sectorMap[sector]) {
        sectorMap[sector] = { value: 0, inr: 0, usd: 0 };
      }
      
      sectorMap[sector].value += itemValue;
      if (item.currency === 'INR') {
        sectorMap[sector].inr += itemValue;
      } else {
        sectorMap[sector].usd += itemValue;
      }
    });
    
    return Object.entries(sectorMap).map(([name, data]) => ({
      name,
      value: data.value,
      inr: data.inr,
      usd: data.usd,
      color: SECTOR_COLORS[name] || SECTOR_COLORS['Other'],
    }));
  }, [portfolio]);

  const totalValue = useMemo(() => {
    const inr = portfolio.filter(p => p.currency === 'INR').reduce((sum, item) => sum + item.currentPrice * item.quantity, 0);
    const usd = portfolio.filter(p => p.currency === 'USD').reduce((sum, item) => sum + item.currentPrice * item.quantity, 0);
    return { inr, usd };
  }, [portfolio]);

  const CustomTooltipValue = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    const percentage = ((data.value / (totalValue.inr + totalValue.usd)) * 100).toFixed(1);
    
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium text-foreground">{data.name}</p>
        <p className="text-sm text-muted-foreground">
          {formatCurrency(data.value, data.currency)}
        </p>
        <p className="text-sm text-primary">{percentage}%</p>
      </div>
    );
  };

  const CustomTooltipSector = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium text-foreground">{data.name}</p>
        {data.inr > 0 && (
          <p className="text-sm text-muted-foreground">
            {formatCurrency(data.inr, 'INR')}
          </p>
        )}
        {data.usd > 0 && (
          <p className="text-sm text-muted-foreground">
            {formatCurrency(data.usd, 'USD')}
          </p>
        )}
      </div>
    );
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show labels for small slices
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="hsl(var(--foreground))"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (portfolio.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* By Value (Holdings) */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <PieChartIcon className="w-4 h-4 text-primary" />
            By Holdings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={valueData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={90}
                  innerRadius={40}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {valueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="hsl(var(--background))" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltipValue />} />
                <Legend 
                  formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* By Sector */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <PieChartIcon className="w-4 h-4 text-primary" />
            By Sector
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sectorData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={90}
                  innerRadius={40}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {sectorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="hsl(var(--background))" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltipSector />} />
                <Legend 
                  formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
