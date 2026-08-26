function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Local-date ISO formatting (YYYY-MM-DD) — avoids the UTC shift of Date#toISOString. */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayISODate(): string {
  return toISODate(new Date())
}
