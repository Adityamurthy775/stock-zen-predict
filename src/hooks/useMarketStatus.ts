import { useState, useEffect } from 'react';
import type { MarketStatus } from '@/types/stock';

export function useMarketStatus(): MarketStatus {
  const [status, setStatus] = useState<MarketStatus>({
    isOpen: false,
    openTime: '9:30 AM',
    closeTime: '4:00 PM',
    market: 'US Stock Market',
  });

  useEffect(() => {
    const checkMarketStatus = () => {
      const now = new Date();
      const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      
      const hours = nyTime.getHours();
      const minutes = nyTime.getMinutes();
      const day = nyTime.getDay();
      
      const currentMinutes = hours * 60 + minutes;
      const openMinutes = 9 * 60 + 30; // 9:30 AM
      const closeMinutes = 16 * 60; // 4:00 PM
      
      const isWeekday = day >= 1 && day <= 5;
      const isMarketHours = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
      const isOpen = isWeekday && isMarketHours;
      
      let nextOpenIn: string | undefined;
      
      if (!isOpen) {
        let nextOpen = new Date(nyTime);
        
        if (isWeekday && currentMinutes < openMinutes) {
          // Today before market opens
          nextOpen.setHours(9, 30, 0, 0);
        } else if (day === 0) {
          // Sunday
          nextOpen.setDate(nextOpen.getDate() + 1);
          nextOpen.setHours(9, 30, 0, 0);
        } else if (day === 6) {
          // Saturday
          nextOpen.setDate(nextOpen.getDate() + 2);
          nextOpen.setHours(9, 30, 0, 0);
        } else if (day === 5 && currentMinutes >= closeMinutes) {
          // Friday after close
          nextOpen.setDate(nextOpen.getDate() + 3);
          nextOpen.setHours(9, 30, 0, 0);
        } else {
          // Weekday after close
          nextOpen.setDate(nextOpen.getDate() + 1);
          nextOpen.setHours(9, 30, 0, 0);
        }
        
        const diffMs = nextOpen.getTime() - now.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        nextOpenIn = `${diffHours}h ${diffMinutes}m`;
      }
      
      setStatus({
        isOpen,
        openTime: '9:30 AM',
        closeTime: '4:00 PM',
        nextOpenIn,
        market: 'US Stock Market',
      });
    };

    checkMarketStatus();
    const interval = setInterval(checkMarketStatus, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return status;
}
