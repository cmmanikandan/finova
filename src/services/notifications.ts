// Notifications service
import { getBudgets, getGoals, getSettings } from './db';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const perm = await Notification.requestPermission();
  return perm === 'granted';
}

export function sendNotification(title: string, body: string, icon = '/icon-192x192.png') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification(title, { body, icon, badge: '/icon-96x96.png' });
}

export function checkBudgetAlerts() {
  const settings = getSettings();
  if (!settings.budgetAlertsEnabled) return;
  const budgets = getBudgets();
  budgets.forEach(b => {
    const pct = b.limit > 0 ? (b.spent / b.limit) * 100 : 0;
    if (pct >= 100) {
      sendNotification(
        `⚠️ Budget Exceeded: ${b.name}`,
        `You've spent ₹${b.spent.toLocaleString()} against a budget of ₹${b.limit.toLocaleString()}.`
      );
    } else if (pct >= 80) {
      sendNotification(
        `🔔 Budget Alert: ${b.name}`,
        `You've used ${Math.round(pct)}% of your ${b.name} budget.`
      );
    }
  });
}

export function checkGoalReminders() {
  const settings = getSettings();
  if (!settings.dailyReminderEnabled) return;
  const goals = getGoals().filter(g => g.status === 'active');
  goals.forEach(g => {
    const daysLeft = Math.ceil((new Date(g.targetDate).getTime() - Date.now()) / 86400000);
    if (daysLeft > 0 && daysLeft <= 7) {
      sendNotification(
        `🎯 Goal Reminder: ${g.name}`,
        `Only ${daysLeft} day${daysLeft > 1 ? 's' : ''} left! Save more toward your goal.`
      );
    }
  });
}
