export function formatDateLima(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    day:   "2-digit",
    month: "2-digit",
    year:  "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  }).format(date);
}