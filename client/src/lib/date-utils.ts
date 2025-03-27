import { format, isToday, isPast, isFuture, isSameDay } from 'date-fns';
import { pl } from 'date-fns/locale';

/**
 * Format a date to a string in Polish locale
 */
export const formatDate = (date: Date, formatStr: string = 'dd.MM.yyyy'): string => {
  if (!date) return '';
  return format(date, formatStr, { locale: pl });
};

/**
 * Format a date for use in an input[type="date"] field
 */
export const formatDateForInput = (date: Date): string => {
  if (!date) return '';
  return format(date, 'yyyy-MM-dd');
};

/**
 * Check if a date is today
 */
export const isDateToday = (date: Date): boolean => {
  if (!date) return false;
  return isToday(date);
};

/**
 * Check if a date is in the past but not today
 */
export const isDatePast = (date: Date): boolean => {
  if (!date) return false;
  return isPast(date) && !isToday(date);
};

/**
 * Check if a date is in the future
 */
export const isDateFuture = (date: Date): boolean => {
  if (!date) return false;
  return isFuture(date);
};

/**
 * Check if a date is overdue (in the past and not today)
 */
export const isDateOverdue = (date: Date): boolean => {
  if (!date) return false;
  return isDatePast(date);
};

/**
 * Check if two dates are the same day
 */
export const isSameDayFunc = (date1: Date, date2: Date): boolean => {
  if (!date1 || !date2) return false;
  return isSameDay(date1, date2);
};
