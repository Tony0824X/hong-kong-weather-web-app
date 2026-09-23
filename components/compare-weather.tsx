'use client'

import { useEffect, useMemo, useState } from 'react'
import { Droplets, MapPin, Thermometer } from 'lucide-react'
import { formatObservationTime, HKO_CURRENT_WEATHER_URL, regionalObservations, type Observation } from '@/lib/regional-weather'

type Mode = 'temperature' | 'rainfall'

export function CompareWeather({ data, loading, refreshFailed }: { data: unknown; loading: boolean; refreshFailed: boolean }) {
  const [mode, setMode] = useState<Mode>('temperature')
  const [selected, setSelected] = useState<Partial<Record<Mode, string>>>({})
  const [query, setQuery] = useState('')
  const [now, setNow] = useState(() => Date.now())
  // Age out old readings even when a tab stays open during an outage.
  useEffect(() => {
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [data])
  const groups = useMemo(() => regionalObservations(data, now), [data, now])
  const group = groups[mode]
  const isTemperature = mode === 'temperature'
  const rows = group.rows.filter(row => row.place.toLowerCase().includes(query.trim().toLowerCase()))
  const selectedRow = rows.find(row => row.place === selected[mode]) ?? rows[0]
  const availableCount = group.rows.filter(row => row.status === 'available').length
  const Icon = isTemperature ? Thermometer : Droplets
  const valueLabel = (row: Observation) => row.value === null
    ? row.status === 'maintenance' ? 'Maintenance' : 'Unavailable'
    : `${row.value}${isTemperature ? '°C' : ' mm'}`
  const period = isTemperature
    ? `Observed ${formatObservationTime(group.recordTime)}`
    : `${formatObservationTime(group.startTime)} → ${formatObservationTime(group.recordTime)}`

  return <section>
    <div className="mb-6">
      <p className="eyebrow"><MapPin size={13} /> Across the city</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em]">Compare locations</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Observed temperatures by station and measured rainfall by district.</p>
    </div>
    <div className="section-panel">
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Compare measurement">
        <button className={`rounded-lg border px-2 py-3 text-xs font-medium sm:text-sm ${isTemperature ? 'border-primary bg-secondary text-primary' : 'border-border text-muted-foreground'}`} aria-pressed={isTemperature} onClick={() => { setMode('temperature'); setQuery('') }}>
          <Thermometer size={16} className="mx-auto mb-1" aria-hidden="true" /> Temperature
        </button>
        <button className={`rounded-lg border px-2 py-3 text-xs font-medium sm:text-sm ${!isTemperature ? 'border-primary bg-secondary text-primary' : 'border-border text-muted-foreground'}`} aria-pressed={!isTemperature} onClick={() => { setMode('rainfall'); setQuery('') }}>
          <Droplets size={16} className="mx-auto mb-1" aria-hidden="true" /> Rainfall
        </button>
      </div>
      <div className="mt-4 text-xs leading-5 text-muted-foreground" aria-live="polite">
        <p className="font-medium text-foreground">{isTemperature ? 'Station temperature' : 'District maximum rainfall'}</p>
        <p>{group.recordTime ? period : 'Observation time unavailable'}</p>
        <p>{isTemperature ? 'Each reading belongs to the named weather station.' : 'Highest measured rainfall within each district during the period shown. This is not a rain probability or a daily total.'}</p>
        {loading && <p className="mt-2" role="status">Updating observations…</p>}
        {!loading && refreshFailed && group.status === 'available' && <p className="mt-2 text-warning" role="status">Could not refresh. Readings below are from the last successful update; check their observation time.</p>}
        {group.status === 'stale' && <p className="mt-2 text-warning" role="status">These observations are over two hours old. Values are hidden until newer data is available.</p>}
        {!loading && group.status === 'unavailable' && <p className="mt-2 text-warning" role="status">Current {isTemperature ? 'temperature' : 'rainfall'} readings are unavailable. Use Refresh to try again.</p>}
      </div>
      {group.rows.length > 0 && <>
        <label className="mt-4 block text-xs text-muted-foreground" htmlFor="compare-location-search">{isTemperature ? 'Find a station' : 'Find a district'}</label>
        <input id="compare-location-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={isTemperature ? 'e.g. Sha Tin' : 'e.g. Wan Chai'} className="mt-1 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
        {selectedRow && <div className="selected-location mt-4 gap-3" aria-live="polite">
          <div className="min-w-0">
            <p className="eyebrow text-primary">{isTemperature ? 'Selected station' : 'Selected district'}</p>
            <p className="mt-1 break-words text-base font-medium">{selectedRow.place}</p>
            <p className="mt-1 text-xs text-muted-foreground">{isTemperature ? 'Observed temperature' : 'Maximum recorded rainfall'}</p>
          </div>
          <span className={`shrink-0 text-right font-medium ${selectedRow.value === null ? 'text-xs' : 'text-xl'}`}>{valueLabel(selectedRow)}</span>
        </div>}
        <div className="mt-4 flex justify-between gap-2 text-[10px] text-muted-foreground">
          <span>{availableCount} {isTemperature ? 'stations' : 'districts'} reporting</span>
          <span>{isTemperature ? 'Temperature' : 'Max rain'}</span>
        </div>
        <div className="location-list">
          {rows.map(row => <button key={row.place} className={`location-row w-full gap-3 ${selectedRow?.place === row.place ? 'selected' : ''}`} onClick={() => setSelected(current => ({ ...current, [mode]: row.place }))} aria-pressed={selectedRow?.place === row.place}>
            <span className="location-weather-icon shrink-0"><Icon aria-hidden="true" /></span>
            <span className="min-w-0 flex-1 break-words text-left text-sm font-medium">{row.place}</span>
            <span className={`shrink-0 text-right font-medium ${row.value === null ? 'text-[10px] text-muted-foreground' : 'text-base'}`}>{valueLabel(row)}</span>
          </button>)}
          {!rows.length && <p className="py-6 text-center text-sm text-muted-foreground">No matching {isTemperature ? 'stations' : 'districts'}.</p>}
        </div>
      </>}
      <div className="mt-5 border-t border-border pt-3 text-[10px] leading-5 text-muted-foreground">
        <a href={HKO_CURRENT_WEATHER_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Source: Hong Kong Observatory</a>
        <p>All times are Hong Kong time. Refreshes every 5 minutes while the app is open.</p>
      </div>
    </div>
  </section>
}
