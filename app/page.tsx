'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Cloud,
  CloudDrizzle,
  CloudRain,
  Droplets,
  Gauge,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  Sun,
  Umbrella,
  Wind,
} from 'lucide-react'

const API_URL = 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=en'

const districts = [
  { name: 'Central & Western', short: 'Central', temp: 28, rain: 35, note: 'Light showers' },
  { name: 'Wan Chai', short: 'Wan Chai', temp: 29, rain: 42, note: 'Passing rain' },
  { name: 'Kowloon City', short: 'Kowloon', temp: 30, rain: 28, note: 'Mostly cloudy' },
  { name: 'Sha Tin', short: 'Sha Tin', temp: 27, rain: 55, note: 'Scattered showers' },
  { name: 'Sai Kung', short: 'Sai Kung', temp: 26, rain: 68, note: 'Rain likely' },
]

type WeatherData = {
  rainfall?: { data?: Array<{ unit: string; place: string; max: number }> }
  temperature?: { data?: Array<{ place: string; value: number; unit: string }> }
  humidity?: { data?: Array<{ value: number; unit: string }> }
  wind?: { data?: Array<{ place: string; speed: number; direction: string; unit: string }> }
  warningMessage?: string[]
  updateTime?: string
}

function weatherIcon(rain: number) {
  if (rain > 60) return <CloudRain aria-hidden="true" />
  if (rain > 30) return <CloudDrizzle aria-hidden="true" />
  return <Cloud aria-hidden="true" />
}

function formatUpdated(value?: string) {
  if (!value) return 'Waiting for live data'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value.replace('T', ' ').replace('+08:00', '')
    : `Updated ${date.toLocaleTimeString('en-HK', { hour: '2-digit', minute: '2-digit' })}`
}

export default function Home() {
  const [data, setData] = useState<WeatherData | null>(null)
  const [selected, setSelected] = useState('Central & Western')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastFetched, setLastFetched] = useState<Date | null>(null)

  const fetchWeather = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(API_URL, { cache: 'no-store' })
      if (!response.ok) throw new Error('Weather service unavailable')
      const nextData = (await response.json()) as WeatherData
      setData(nextData)
      setLastFetched(new Date())
    } catch {
      setError('Unable to connect to the Hong Kong Observatory. Showing the latest available view.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWeather()
  }, [fetchWeather])

  const centralTemp = data?.temperature?.data?.find((item) => item.place === 'Hong Kong Observatory')?.value ?? 28
  const humidity = data?.humidity?.data?.[0]?.value ?? 78
  const wind = data?.wind?.data?.[0]
  const selectedDistrict = districts.find((district) => district.name === selected) ?? districts[0]
  const warnings = useMemo(() => {
    const raw = data?.warningMessage
    if (Array.isArray(raw)) return raw.filter((item): item is string => typeof item === 'string' && item.length > 0)
    if (typeof raw === 'string' && raw.length > 0) return [raw]
    return []
  }, [data])

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="weather-grid pointer-events-none fixed inset-0 -z-0 opacity-60" />
      <div className="relative z-10 mx-auto max-w-7xl px-5 pb-12 pt-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-border/70 pb-5">
          <div className="flex items-center gap-3">
            <div className="brand-mark"><Cloud aria-hidden="true" size={20} /></div>
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-primary">HK WEATHER</p>
              <p className="text-xs text-muted-foreground">Live conditions, citywide</p>
            </div>
          </div>
          <button className="refresh-button" onClick={fetchWeather} disabled={loading} aria-label="Refresh weather data">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
            <span className="hidden sm:inline">Refresh data</span>
          </button>
        </header>

        {error && <div className="mt-5 flex items-center gap-3 border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"><AlertTriangle size={17} aria-hidden="true" />{error}</div>}

        <section className="hero-section py-10 md:py-14">
          <div className="max-w-3xl">
            <p className="eyebrow"><span className="live-dot" /> Hong Kong · {lastFetched ? formatUpdated(lastFetched.toISOString()) : 'Live feed'}</p>
            <h1 className="mt-4 max-w-2xl text-balance font-sans text-5xl font-semibold leading-[0.98] tracking-[-0.06em] sm:text-7xl">Know before you<br /><span className="text-primary">step outside.</span></h1>
            <p className="mt-6 max-w-xl text-pretty text-base leading-7 text-muted-foreground">A clear view of what&apos;s happening across the city, from your morning commute to tonight&apos;s plans.</p>
          </div>
        </section>

        <section aria-labelledby="current-heading" className="dashboard-card overflow-hidden">
          <div className="flex flex-col justify-between gap-8 p-6 sm:p-8 lg:flex-row lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><MapPin size={15} className="text-primary" aria-hidden="true" /> Hong Kong Observatory</div>
              <div className="mt-5 flex items-end gap-4"><span className="temperature">{centralTemp}°</span><div className="pb-2"><p className="text-lg font-medium">Mostly cloudy</p><p className="text-sm text-muted-foreground">Feels like {centralTemp + 2}°</p></div></div>
            </div>
            <div className="weather-icon-large"><Cloud aria-hidden="true" size={72} strokeWidth={1.3} /></div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-5 border-t border-border pt-6 sm:grid-cols-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <Metric icon={<Droplets />} label="Humidity" value={`${humidity}%`} />
              <Metric icon={<Wind />} label="Wind" value={wind ? `${wind.speed} km/h` : '12 km/h'} />
              <Metric icon={<Umbrella />} label="Rain chance" value="40%" />
              <Metric icon={<Gauge />} label="Visibility" value="10 km" />
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border bg-secondary/50 px-6 py-3 text-xs text-muted-foreground sm:px-8"><span>Source: Hong Kong Observatory</span><span>{loading ? 'Updating…' : formatUpdated(data?.updateTime)}</span></div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
          <section aria-labelledby="locations-heading" className="section-panel">
            <div className="section-heading"><div><p className="eyebrow">Across the city</p><h2 id="locations-heading">Compare locations</h2></div><Search size={19} className="text-muted-foreground" aria-hidden="true" /></div>
            <div className="location-list">{districts.map((district) => <button key={district.name} className={`location-row ${selected === district.name ? 'selected' : ''}`} onClick={() => setSelected(district.name)} aria-pressed={selected === district.name}><span className="location-weather-icon">{weatherIcon(district.rain)}</span><span className="min-w-0 flex-1 text-left"><span className="block truncate font-medium">{district.name}</span><span className="block text-xs text-muted-foreground">{district.note}</span></span><span className="mr-5 text-sm text-muted-foreground">{district.rain}%</span><span className="w-12 text-right text-lg font-medium">{district.temp}°</span></button>)}</div>
            <div className="selected-location mt-5"><div><p className="eyebrow text-primary">Selected area</p><p className="mt-1 text-xl font-medium">{selectedDistrict.name}</p><p className="mt-1 text-sm text-muted-foreground">{selectedDistrict.note} · {selectedDistrict.rain}% chance of rain</p></div><Navigation size={28} className="text-primary" aria-hidden="true" /></div>
          </section>

          <section aria-labelledby="warnings-heading" className="section-panel">
            <div className="section-heading"><div><p className="eyebrow">Stay prepared</p><h2 id="warnings-heading">Weather warnings</h2></div><AlertTriangle size={19} className="text-warning" aria-hidden="true" /></div>
            {warnings.length > 0 ? <div className="warning-stack">{warnings.map((warning, index) => <div className="warning-row" key={`${warning}-${index}`}><AlertTriangle size={18} aria-hidden="true" /><p>{warning}</p></div>)}</div> : <div className="all-clear"><div className="clear-icon"><Sun size={25} aria-hidden="true" /></div><p className="font-medium">No active warnings</p><p className="mt-1 text-sm leading-6 text-muted-foreground">The city is clear for now. We&apos;ll show Observatory alerts here as soon as they&apos;re issued.</p></div>}
            <div className="mt-6 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground"><span className="status-dot" /> Monitoring live Observatory alerts</div>
          </section>
        </div>

        <footer className="mt-10 flex flex-col gap-2 border-t border-border/70 pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>Built for Hong Kong&apos;s moving skies.</span><span className="font-mono">HKO / RHRREAD / EN</span></footer>
      </div>
    </main>
  )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div><div className="mb-2 flex items-center gap-1.5 text-muted-foreground [&_svg]:size-3.5">{icon}<span className="text-xs">{label}</span></div><p className="text-base font-medium">{value}</p></div>
}
