export function formatSessionDate(timestamp: number, locale?: string): string {
  const userLocale = locale || (typeof navigator !== 'undefined' ? navigator.language : 'ko-KR');
  return new Intl.DateTimeFormat(userLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp));
}

export function formatSessionTime(timestamp: number, locale?: string): string {
  const userLocale = locale || (typeof navigator !== 'undefined' ? navigator.language : 'ko-KR');
  return new Intl.DateTimeFormat(userLocale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function formatRelativeDate(timestamp: number, language: 'ko' | 'en' = 'ko'): string {
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return language === 'ko' ? '오늘' : 'Today';
  } else if (days === 1) {
    return language === 'ko' ? '어제' : 'Yesterday';
  } else if (days < 7) {
    return language === 'ko' ? `${days}일 전` : `${days} days ago`;
  } else {
    return formatSessionDate(timestamp, language === 'ko' ? 'ko-KR' : 'en-US');
  }
}
