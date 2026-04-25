export const formatCurrency = (amount: number, currency = 'EUR'): string =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount);

export const formatDate = (date: string | Date): string =>
  new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(date),
  );

export const formatRelativeTime = (date: string | Date): string => {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
};

export const formatRating = (rating: number): string => rating.toFixed(1);
