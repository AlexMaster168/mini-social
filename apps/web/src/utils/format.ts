/** Picks the Russian plural form: plural(5, ['пост', 'поста', 'постов']) → 'постов'. */
export function plural(n: number, forms: [one: string, few: string, many: string]): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return forms[2]
  if (last > 1 && last < 5) return forms[1]
  if (last === 1) return forms[0]
  return forms[2]
}

const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
const dateYearFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const timeFormatter = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })

/** "только что", "5 мин", "3 ч", "12 мая", "12 мая 2024 г." */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000)
  if (seconds < 60) return 'только что'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} мин`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ч`
  return date.getFullYear() === now.getFullYear()
    ? dateFormatter.format(date)
    : dateYearFormatter.format(date)
}

export function clockTime(iso: string): string {
  return timeFormatter.format(new Date(iso))
}

// A full date gives the genitive month ("сентября"); the day is dropped afterwards.
const genitiveMonthFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** "С нами с сентября 2026" */
export function joinedAt(iso: string): string {
  const parts = genitiveMonthFormatter.formatToParts(new Date(iso))
  const month = parts.find((part) => part.type === 'month')?.value ?? ''
  const year = parts.find((part) => part.type === 'year')?.value ?? ''
  return `С нами с ${month} ${year}`
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? [parts[0]![0], parts[1]![0]] : [name.trim()[0]]
  return letters.join('').toUpperCase() || '?'
}

/** Stable hue for a user's avatar background. */
export function avatarHue(seed: string): number {
  let hash = 0
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return Math.abs(hash) % 360
}
