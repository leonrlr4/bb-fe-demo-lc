import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek, parseISO } from 'date-fns';

/**
 * Format date with timezone awareness
 */
export function formatDateTime(dateString: string | Date, showTime: boolean = false): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (showTime) {
      return format(date, 'PPpp');
    }

    return format(date, 'PP');
  } catch (error) {
    console.error('Date formatting error:', error);
    return String(dateString);
  }
}

/**
 * Format date as relative time (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error('Date formatting error:', error);
    return String(dateString);
  }
}

/**
 * Format date for conversation lists (smart formatting)
 */
export function formatConversationDate(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (isToday(date)) {
      return format(date, 'HH:mm');
    }

    if (isYesterday(date)) {
      return 'Yesterday';
    }

    if (isThisWeek(date)) {
      return format(date, 'EEEE');
    }

    return format(date, 'MMM d');
  } catch (error) {
    console.error('Date formatting error:', error);
    return String(dateString);
  }
}

/**
 * Format full date with time for tooltips
 */
export function formatFullDateTime(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, 'yyyy-MM-dd HH:mm:ss');
  } catch (error) {
    console.error('Date formatting error:', error);
    return String(dateString);
  }
}
