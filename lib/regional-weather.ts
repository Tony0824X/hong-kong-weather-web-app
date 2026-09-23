export const HKO_CURRENT_WEATHER_URL = 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=en'

export type Observation = {
  place: string
  value: number | null
  status: 'available' | 'unavailable' | 'maintenance'
}

export type ObservationGroup = {
  rows: Observation[]
  status: 'available' | 'unavailable' | 'stale'
  recordTime: string | null
  startTime: string | null
}

const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

function timestamp(value: unknown) {
  return typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)) ? value : null
}

function observations(input: unknown, kind: 'temperature' | 'rainfall', now: number): ObservationGroup {
  const source = object(input)
  const recordTime = timestamp(kind === 'temperature' ? source.recordTime : source.endTime)
  const startTime = kind === 'rainfall' ? timestamp(source.startTime) : null
  const age = recordTime ? now - Date.parse(recordTime) : NaN
  const validPeriod = kind === 'temperature' || !!(startTime && recordTime && Date.parse(startTime) < Date.parse(recordTime))
  let status: ObservationGroup['status'] = !Number.isFinite(age) || age < -5 * 60_000 || !validPeriod
    ? 'unavailable'
    : age > 2 * 60 * 60_000 ? 'stale' : 'available'
  const rows: Observation[] = []
  const seen = new Set<string>()
  for (const item of Array.isArray(source.data) ? source.data : []) {
    const row = object(item)
    if (typeof row.place !== 'string' || !row.place.trim() || seen.has(row.place)) continue
    seen.add(row.place)
    const maintenance = kind === 'rainfall' && String(row.main ?? row.Main).toUpperCase() === 'TRUE'
    const value = kind === 'temperature' ? row.value : row.max
    const validValue = typeof value === 'number' && Number.isFinite(value)
      && row.unit === (kind === 'temperature' ? 'C' : 'mm') && (kind === 'temperature' || value >= 0)
    const available = status === 'available' && validValue && !maintenance
    rows.push({ place: row.place, value: available ? value : null, status: maintenance ? 'maintenance' : available ? 'available' : 'unavailable' })
  }
  if (status === 'available' && !rows.some(row => row.status === 'available')) status = 'unavailable'
  return { rows, status, recordTime, startTime }
}

export function regionalObservations(data: unknown, now = Date.now()) {
  const source = object(data)
  return {
    temperature: observations(source.temperature, 'temperature', now),
    rainfall: observations(source.rainfall, 'rainfall', now),
  }
}

export function formatObservationTime(value: string | null) {
  if (!value) return 'Time unavailable'
  return new Date(value).toLocaleString('en-GB', {
    timeZone: 'Asia/Hong_Kong', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }) + ' HKT'
}
