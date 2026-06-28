import { getSettings } from '../services/db';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

export function formatCurrency(amount: number, symbolOverride?: string): string {
  const { currencySymbol } = getSettings();
  const sym = symbolOverride ?? currencySymbol;
  const isNegative = amount < 0;
  return `${isNegative ? '-' : ''}${sym}${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'dd MMM yyyy');
}

export function formatDateShort(dateStr: string): string {
  return format(new Date(dateStr), 'dd MMM');
}

export function formatTime(dateStr: string): string {
  return format(new Date(dateStr), 'hh:mm a');
}

export function formatRelative(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

export function groupTransactionsByDate<T extends { date: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  items.forEach(item => {
    const key = formatDate(item.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  });
  return map;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return clamp((value / total) * 100, 0, 100);
}
