export function cleanText(value: unknown, max = 2000): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, max)
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

export function daysUntil(deadline: string, from = new Date()): number {
  const d = new Date(`${deadline}T23:59:59`)
  return Math.ceil((d.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

export function hoursBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return (eh * 60 + em - (sh * 60 + sm)) / 60
}

export const LAB_SLOTS: Array<{ start: string; end: string; label: string }> = [
  { start: '09:00', end: '11:00', label: '09:00–11:00' },
  { start: '11:00', end: '13:00', label: '11:00–13:00' },
  { start: '14:00', end: '16:00', label: '14:00–16:00' },
  { start: '16:00', end: '18:00', label: '16:00–18:00' },
]

export function nextWeekdays(from: Date, count: number): string[] {
  const dates: string[] = []
  const cursor = new Date(from)
  cursor.setHours(12, 0, 0, 0)
  while (dates.length < count) {
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) {
      dates.push(cursor.toISOString().slice(0, 10))
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}
