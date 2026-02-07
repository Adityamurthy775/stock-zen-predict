import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Settings, Key, ExternalLink, Check, X, AlertTriangle, RefreshCw, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApiKey {
  name: string;
  key: string;
  envName: string;
  description: string;
  signupUrl: string;
  isSet: boolean;
}

interface ApiUsage {
  used: number;
  limit: number;
  remaining: number;
  resetIn: number;
}

interface ScrapingStats {
  calls: number;
  successes: number;
  failures: number;
  lastUsed: string | null;
  status: string;
}

interface ApiUsageData {
  alpha_vantage: ApiUsage;
  twelve_data: ApiUsage;
  finnhub: ApiUsage;
  scraping?: ScrapingStats;
}

const API_KEY_CONFIG: Omit<ApiKey, 'key' | 'isSet'>[] = [
  {
    name: 'Alpha Vantage',
    envName: 'ALPHA_VANTAGE_API_KEY',
    description: 'Primary data provider for stock quotes (25 calls/day free)',
    signupUrl: 'https://www.alphavantage.co/support/#api-key',
  },
  {
    name: 'Twelve Data',
    envName: 'TWELVE_DATA_API_KEY',
    description: 'Fallback provider for stock data (800 calls/day free)',
    signupUrl: 'https://twelvedata.com/account/api-keys',
  },
  {
    name: 'Finnhub',
    envName: 'FINNHUB_API_KEY',
    description: 'News and market data provider (60 calls/min free)',
    signupUrl: 'https://finnhub.io/register',
  },
];

const LOCAL_STORAGE_KEY = 'user_api_keys';

// Helper function to format reset time
const formatResetTime = (seconds: number): string => {
  if (seconds <= 0) return 'Now';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export function ApiKeySettings() {
  const [open, setOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [tempKeys, setTempKeys] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [apiUsage, setApiUsage] = useState<ApiUsageData | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  // Fetch API usage when dialog opens
  const fetchApiUsage = async () => {
    setLoadingUsage(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/stock-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'api_usage' }),
      });
      if (response.ok) {
        const data = await response.json();
        setApiUsage(data);
      }
    } catch (error) {
      console.error('Failed to fetch API usage:', error);
    } finally {
      setLoadingUsage(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchApiUsage();
    }
  }, [open]);

  // Load saved API keys on mount
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setApiKeys(parsed);
        setTempKeys(parsed);
      } catch (e) {
        console.error('Failed to parse saved API keys:', e);
      }
    }
  }, []);

  const handleKeyChange = (envName: string, value: string) => {
    setTempKeys(prev => ({
      ...prev,
      [envName]: value,
    }));
  };

  const handleSave = async () => {
    // Filter out empty keys
    const filteredKeys = Object.fromEntries(
      Object.entries(tempKeys).filter(([_, value]) => value.trim() !== '')
    );
    
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filteredKeys));
    setApiKeys(filteredKeys);
    
    // Reset API usage counters on the backend when new keys are saved
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/stock-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_usage' }),
      });
      // Refresh usage stats
      await fetchApiUsage();
    } catch (e) {
      console.error('Failed to reset API usage:', e);
    }
    
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 2000);
  };

  const handleClearAll = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setApiKeys({});
    setTempKeys({});
  };

  const getKeyStatus = (envName: string): 'set' | 'empty' | 'pending' => {
    const current = apiKeys[envName];
    const temp = tempKeys[envName];
    
    if (temp && temp !== current) return 'pending';
    if (current) return 'set';
    return 'empty';
  };

  const hasUnsavedChanges = JSON.stringify(apiKeys) !== JSON.stringify(
    Object.fromEntries(Object.entries(tempKeys).filter(([_, v]) => v.trim() !== ''))
  );

  const keysConfigured = Object.keys(apiKeys).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          API Keys
          {keysConfigured > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {keysConfigured}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            API Key Configuration
          </DialogTitle>
          <DialogDescription>
            Add your own API keys to avoid rate limits. Keys are stored locally in your browser.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {/* API Usage Stats */}
          <div className="space-y-3 p-3 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">API Usage (This Session)</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchApiUsage}
                disabled={loadingUsage}
                className="h-7 px-2"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", loadingUsage && "animate-spin")} />
              </Button>
            </div>
            
            {apiUsage ? (
              <div className="space-y-3">
                {/* Alpha Vantage */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Alpha Vantage (Primary)</span>
                    <span className={cn(
                      "font-medium",
                      apiUsage.alpha_vantage.remaining < 5 ? "text-destructive" : "text-foreground"
                    )}>
                      {apiUsage.alpha_vantage.remaining}/{apiUsage.alpha_vantage.limit} remaining
                    </span>
                  </div>
                  <Progress 
                    value={(apiUsage.alpha_vantage.remaining / apiUsage.alpha_vantage.limit) * 100} 
                    className="h-1.5"
                  />
                  <div className="text-[10px] text-muted-foreground">
                    Resets in: {formatResetTime(apiUsage.alpha_vantage.resetIn)}
                  </div>
                </div>
                
                {/* Twelve Data */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Twelve Data (Fallback)</span>
                    <span className={cn(
                      "font-medium",
                      apiUsage.twelve_data.remaining < 50 ? "text-destructive" : "text-foreground"
                    )}>
                      {apiUsage.twelve_data.remaining}/{apiUsage.twelve_data.limit} remaining
                    </span>
                  </div>
                  <Progress 
                    value={(apiUsage.twelve_data.remaining / apiUsage.twelve_data.limit) * 100} 
                    className="h-1.5"
                  />
                  <div className="text-[10px] text-muted-foreground">
                    Resets in: {formatResetTime(apiUsage.twelve_data.resetIn)}
                  </div>
                </div>
                
                {/* Finnhub */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Finnhub (News)</span>
                    <span className={cn(
                      "font-medium",
                      apiUsage.finnhub.remaining < 10 ? "text-destructive" : "text-foreground"
                    )}>
                      {apiUsage.finnhub.remaining}/{apiUsage.finnhub.limit} remaining
                    </span>
                  </div>
                  <Progress 
                    value={(apiUsage.finnhub.remaining / apiUsage.finnhub.limit) * 100} 
                    className="h-1.5"
                  />
                  <div className="text-[10px] text-muted-foreground">
                    Resets in: {formatResetTime(apiUsage.finnhub.resetIn)}
                  </div>
                </div>
                
                {/* Yahoo Finance Scraping (Fallback) */}
                {apiUsage.scraping && (
                  <div className="space-y-1 pt-2 border-t border-border">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Yahoo Finance Scraping (Auto-Fallback)</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/50 text-primary">
                        Unlimited
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>
                        Calls: {apiUsage.scraping.calls} 
                        {apiUsage.scraping.calls > 0 && (
                          <span className="ml-1">
                            (✓ {apiUsage.scraping.successes} / ✗ {apiUsage.scraping.failures})
                          </span>
                        )}
                      </span>
                      <span>
                        {apiUsage.scraping.lastUsed 
                          ? `Last used: ${new Date(apiUsage.scraping.lastUsed).toLocaleTimeString()}`
                          : 'Not used yet'}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70">
                      Automatically activates when API limits are reached. No key required.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {loadingUsage ? 'Loading usage stats...' : 'Usage stats unavailable'}
              </p>
            )}
          </div>

          {/* Rate Limit Info */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Activity className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-primary">Auto-Scraping Enabled</p>
              <p className="text-muted-foreground mt-1">
                When API limits are reached, stock prices are automatically scraped from Yahoo Finance — no extra keys needed.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-500">Rate Limit Reached?</p>
              <p className="text-muted-foreground mt-1">
                Add your own API keys below for higher limits. Keys are saved locally and sent directly to the backend.
              </p>
            </div>
          </div>

          {/* API Key Inputs */}
          {API_KEY_CONFIG.map((config) => {
            const status = getKeyStatus(config.envName);
            return (
              <div key={config.envName} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={config.envName} className="flex items-center gap-2">
                    {config.name}
                    {status === 'set' && (
                      <Check className="w-3.5 h-3.5 text-chart-up" />
                    )}
                    {status === 'pending' && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        Unsaved
                      </Badge>
                    )}
                  </Label>
                  <a
                    href={config.signupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Get API Key
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <Input
                  id={config.envName}
                  type="password"
                  placeholder={`Enter your ${config.name} API key`}
                  value={tempKeys[config.envName] || ''}
                  onChange={(e) => handleKeyChange(config.envName, e.target.value)}
                  className={cn(
                    status === 'set' && 'border-chart-up/50',
                    status === 'pending' && 'border-primary/50'
                  )}
                />
                <p className="text-xs text-muted-foreground">{config.description}</p>
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {Object.keys(apiKeys).length > 0 && (
            <Button
              variant="ghost"
              onClick={handleClearAll}
              className="text-destructive hover:text-destructive"
            >
              <X className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
          <div className="flex-1" />
          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            className="gap-2"
          >
            {showSuccess ? (
              <>
                <Check className="w-4 h-4" />
                Saved!
              </>
            ) : (
              'Save Keys'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Utility to get user API keys for use in services
export function getUserApiKeys(): Record<string, string> {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load user API keys:', e);
  }
  return {};
}
