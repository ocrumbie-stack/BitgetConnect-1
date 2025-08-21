import { apiRequest } from '@/lib/queryClient';

export interface AlertNotification {
  id: string;
  userId: string;
  botExecutionId?: string;
  alertType: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  data?: {
    pnl?: string;
    tradingPair?: string;
    price?: string;
    change?: string;
    profit?: string;
    winRate?: string;
    actionRequired?: boolean;
  };
}

export class AlertService {
  private static instance: AlertService;
  private notifications: AlertNotification[] = [];
  private listeners: ((notifications: AlertNotification[]) => void)[] = [];

  private constructor() {
    this.setupBrowserNotifications();
  }

  static getInstance(): AlertService {
    if (!AlertService.instance) {
      AlertService.instance = new AlertService();
    }
    return AlertService.instance;
  }

  // Setup browser notifications permission
  private async setupBrowserNotifications() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  // Add listener for alert updates
  addListener(listener: (notifications: AlertNotification[]) => void) {
    this.listeners.push(listener);
  }

  // Remove listener
  removeListener(listener: (notifications: AlertNotification[]) => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  // Notify all listeners
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.notifications));
  }

  // Create a new alert
  async createAlert(alert: Omit<AlertNotification, 'id'>) {
    try {
      const newAlert = await apiRequest('/api/alerts', 'POST', alert);
      this.notifications.unshift(newAlert);
      this.notifyListeners();
      
      // Show browser notification if enabled
      if (Notification.permission === 'granted') {
        this.showBrowserNotification(newAlert);
      }
      
      return newAlert;
    } catch (error) {
      console.error('Failed to create alert:', error);
    }
  }

  // Show browser notification
  private showBrowserNotification(alert: AlertNotification) {
    const notification = new Notification(alert.title, {
      body: alert.message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: alert.id,
      requireInteraction: alert.severity === 'error',
    });

    // Auto-close after 5 seconds for non-critical alerts
    if (alert.severity !== 'error') {
      setTimeout(() => notification.close(), 5000);
    }

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }

  // Quick alert creators for common scenarios
  async notifyProfitThreshold(tradingPair: string, pnl: string, threshold: string) {
    return this.createAlert({
      userId: 'default-user',
      alertType: 'pnl_gain',
      title: 'Profit Target Reached! 🎉',
      message: `${tradingPair} has reached your profit target of $${threshold}`,
      severity: 'success',
      data: {
        tradingPair,
        pnl,
        actionRequired: false
      }
    });
  }

  async notifyLossThreshold(tradingPair: string, pnl: string, threshold: string) {
    return this.createAlert({
      userId: 'default-user',
      alertType: 'pnl_loss',
      title: 'Loss Threshold Exceeded ⚠️',
      message: `${tradingPair} has exceeded your loss threshold of $${threshold}`,
      severity: 'warning',
      data: {
        tradingPair,
        pnl,
        actionRequired: true
      }
    });
  }

  async notifyEntrySignal(tradingPair: string, price: string, strategy: string) {
    return this.createAlert({
      userId: 'default-user',
      alertType: 'entry_signal',
      title: 'Entry Signal Detected 📈',
      message: `${strategy} strategy detected entry signal for ${tradingPair} at $${price}`,
      severity: 'info',
      data: {
        tradingPair,
        price,
        actionRequired: false
      }
    });
  }

  async notifyExitSignal(tradingPair: string, price: string, pnl: string) {
    return this.createAlert({
      userId: 'default-user',
      alertType: 'exit_signal',
      title: 'Exit Signal Detected 📉',
      message: `Exit signal for ${tradingPair} at $${price} (P&L: ${pnl})`,
      severity: 'info',
      data: {
        tradingPair,
        price,
        pnl,
        actionRequired: false
      }
    });
  }

  async notifyBotError(botName: string, error: string) {
    return this.createAlert({
      userId: 'default-user',
      alertType: 'bot_error',
      title: 'Bot Error ❌',
      message: `${botName} encountered an error: ${error}`,
      severity: 'error',
      data: {
        actionRequired: true
      }
    });
  }

  async notifyPerformanceMilestone(botName: string, milestone: string, value: string) {
    return this.createAlert({
      userId: 'default-user',
      alertType: 'performance_milestone',
      title: 'Performance Milestone! 🚀',
      message: `${botName} achieved ${milestone}: ${value}`,
      severity: 'success',
      data: {
        actionRequired: false
      }
    });
  }

  // Get unread notifications count
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  // Mark notification as read
  markAsRead(id: string) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.isRead = true;
      this.notifyListeners();
    }
  }

  // Get all notifications
  getNotifications(): AlertNotification[] {
    return this.notifications;
  }

  // Clear all notifications
  clearAll() {
    this.notifications = [];
    this.notifyListeners();
  }
}

export const alertService = AlertService.getInstance();