// Push notification utilities for price alerts

export interface NotificationConfig {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

// Check if notifications are supported
export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported in this browser');
    return 'denied';
  }
  
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return 'denied';
  }
}

// Get current permission status
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

// Show a notification
export function showNotification(config: NotificationConfig): Notification | null {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported');
    return null;
  }
  
  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return null;
  }
  
  try {
    const notification = new Notification(config.title, {
      body: config.body,
      icon: config.icon || '/favicon.ico',
      tag: config.tag,
      requireInteraction: config.requireInteraction || false,
      badge: '/favicon.ico',
    });
    
    // Auto-close after 10 seconds if not requiring interaction
    if (!config.requireInteraction) {
      setTimeout(() => {
        notification.close();
      }, 10000);
    }
    
    return notification;
  } catch (error) {
    console.error('Failed to show notification:', error);
    return null;
  }
}

// Show price alert notification
export function showPriceAlertNotification(
  symbol: string,
  alertType: 'price' | 'deviation',
  currentPrice: number,
  targetOrPredicted: number,
  condition: string,
  currency: string = '₹'
): Notification | null {
  const formatPrice = (price: number) => 
    `${currency}${price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  
  let title: string;
  let body: string;
  
  if (alertType === 'deviation') {
    const deviation = Math.abs(((currentPrice - targetOrPredicted) / targetOrPredicted) * 100);
    title = `🔔 ${symbol} Deviation Alert`;
    body = `Price deviated ${deviation.toFixed(1)}% from prediction. Current: ${formatPrice(currentPrice)}, Predicted: ${formatPrice(targetOrPredicted)}`;
  } else {
    title = `🔔 ${symbol} Price Alert`;
    body = `Price went ${condition} ${formatPrice(targetOrPredicted)}. Current: ${formatPrice(currentPrice)}`;
  }
  
  return showNotification({
    title,
    body,
    tag: `alert-${symbol}-${Date.now()}`,
    requireInteraction: true,
  });
}

// Initialize notifications on app load
export async function initializeNotifications(): Promise<boolean> {
  if (!isNotificationSupported()) {
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission === 'default') {
    const result = await requestNotificationPermission();
    return result === 'granted';
  }
  
  return false;
}
