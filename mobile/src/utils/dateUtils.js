// Date formatting utility functions
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';

export const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  try {
    const date = typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp);
    
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`;
    }
    
    if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'h:mm a')}`;
    }
    
    return format(date, 'MMM dd, yyyy • h:mm a');
  } catch (error) {
    return 'Invalid date';
  }
};

export const timeAgo = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  try {
    const date = typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    return 'Invalid date';
  }
};

export const formatShortDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  try {
    const date = typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp);
    return format(date, 'MMM dd, yyyy');
  } catch (error) {
    return 'Invalid date';
  }
};

export const formatTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  try {
    const date = typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp);
    return format(date, 'h:mm a');
  } catch (error) {
    return 'Invalid time';
  }
};
