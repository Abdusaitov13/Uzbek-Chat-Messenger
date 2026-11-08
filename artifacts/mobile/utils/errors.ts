export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = error.data;
    if (data && typeof data === 'object' && 'error' in data) {
      const message = data.error;
      if (typeof message === 'string' && message.trim()) return message;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function formatTime(value: string | Date, language: 'uz' | 'ru') {
  return new Date(value).toLocaleTimeString(language === 'uz' ? 'uz-UZ' : 'ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
