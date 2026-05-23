import { useState, useEffect, useRef } from 'react'
import AddressInput from './AddressInput.jsx'
import { reverseGeocodeCity } from '../services/geocoding.js'

const CORRIDOR_OPTIONS = [5, 10, 25, 50]

function makeStop(value = '', coord = null) {
  return { id: crypto.randomUUID(), value, coord }
}

function parseLL(str) {
  if (!str) return null
  const [lat, lon] = str.split(',').map(Number)
  return (isFinite(lat) && isFinite(lon)) ? { lat, lon } : null
}

function readURLParams() {
  const p = new URLSearchParams(window.location.search)

  // Stops: "label:lat,lon" or just "label" (legacy share links without coords)
  const stops = (p.get('stops') ?? '').split('|').filter(Boolean).map(raw => {
    const sep = raw.lastIndexOf(':')
    if (sep > 0) {
      const coord = parseLL(raw.slice(sep + 1))
      if (coord) return makeStop(raw.slice(0, sep), coord)
    }
    return makeStop(raw)
  })

  return {
    start:      p.get('start') ?? '',
    startCoord: parseLL(p.get('startLL')),
    end:        p.get('end')   ?? '',
    endCoord:   parseLL(p.get('endLL')),
    stops,
    corridor:   Number(p.get('corridor')) || 25,
  }
}

function writeURLParams({ start, startCoord, end, endCoord, stops, corridor }) {
  const p = new URLSearchParams()
  if (start) p.set('start', start)
  if (startCoord) p.set('startLL', `${startCoord.lat.toFixed(5)},${startCoord.lon.toFixed(5)}`)
  if (end)   p.set('end',   end)
  if (endCoord)   p.set('endLL',   `${endCoord.lat.toFixed(5)},${endCoord.lon.toFixed(5)}`)
  if (stops.length) {
    p.set('stops', stops
      .filter(s => s.value)
      .map(s => s.coord ? `${s.value}:${s.coord.lat.toFixed(5)},${s.coord.lon.toFixed(5)}` : s.value)
      .join('|'))
  }
  p.set('corridor', corridor)
  window.history.replaceState(null, '', '?' + p.toString())
}

export default function RouteInput({ onSearch, loading }) {
  const init = useRef(readURLParams())

  const [start,      setStart]      = useState({ value: init.current.start, coord: init.current.startCoord })
  const [end,        setEnd]        = useState({ value: init.current.end,   coord: init.current.endCoord })
  const [stops,      setStops]      = useState(init.current.stops)
  const [corridor,   setCorridor]   = useState(init.current.corridor)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const [locating, setLocating] = useState(false)
  const dragIdx = useRef(null)

  // Auto-search on mount if URL has a route pre-loaded
  useEffect(() => {
    const { start: s, startCoord: sc, end: e, endCoord: ec, stops: st, corridor: c } = init.current
    if (s && e) {
      onSearch({ start: s, startCoord: sc, stops: st, end: e, endCoord: ec, corridor: c })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const canSubmit = !loading && start.value.trim() && end.value.trim()

  // ── Stops management ───────────────────────────────────────────────────────
  function addStop() {
    setStops(s => [...s, makeStop()])
  }

  function removeStop(id) {
    setStops(s => s.filter(w => w.id !== id))
  }

  function updateStopValue(id, value) {
    setStops(s => s.map(w => w.id === id ? { ...w, value, coord: null } : w))
  }

  function updateStopCoord(id, coord) {
    setStops(s => s.map(w => w.id === id ? { ...w, coord } : w))
  }

  // ── Drag-to-reorder ────────────────────────────────────────────────────────
  function handleDragStart(e, i) {
    dragIdx.current = i
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e, i) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIdx(i)
  }

  function handleDrop(e, i) {
    e.preventDefault()
    const from = dragIdx.current
    if (from === null || from === i) { setDragOverIdx(null); return }
    setStops(s => {
      const next = [...s]
      const [moved] = next.splice(from, 1)
      next.splice(i, 0, moved)
      return next
    })
    dragIdx.current = null
    setDragOverIdx(null)
  }

  function handleDragEnd() {
    dragIdx.current = null
    setDragOverIdx(null)
  }

  // ── Near-me ───────────────────────────────────────────────────────────────
  function handleLocate() {
    if (!navigator.geolocation || locating) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const label = await reverseGeocodeCity(coords.latitude, coords.longitude)
          setStart({
            value: label ?? `${coords.latitude.toFixed(5)},${coords.longitude.toFixed(5)}`,
            coord: { lat: coords.latitude, lon: coords.longitude },
          })
        } catch {
          setStart({
            value: `${coords.latitude.toFixed(5)},${coords.longitude.toFixed(5)}`,
            coord: { lat: coords.latitude, lon: coords.longitude },
          })
        }
        setLocating(false)
      },
      () => setLocating(false),
      { timeout: 10000 }
    )
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    writeURLParams({ start: start.value, startCoord: start.coord, end: end.value, endCoord: end.coord, stops, corridor })
    onSearch({ start: start.value, startCoord: start.coord, stops, end: end.value, endCoord: end.coord, corridor })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1">

      {/* Start */}
      <StopRow dot="bg-green-500" showLine={stops.length > 0 || true}>
        <AddressInput
          label="Start"
          value={start.value}
          onChange={v => setStart({ value: v, coord: null })}
          onSelect={c => setStart(s => ({ ...s, coord: c }))}
          disabled={loading}
          onLocate={handleLocate}
          locating={locating}
        />
      </StopRow>

      {/* Middle stops */}
      {stops.map((stop, i) => (
        <StopRow
          key={stop.id}
          dot="bg-blue-400"
          dragging={dragIdx.current === i}
          dragOver={dragOverIdx === i}
          onDragStart={e => handleDragStart(e, i)}
          onDragOver={e => handleDragOver(e, i)}
          onDrop={e => handleDrop(e, i)}
          onDragEnd={handleDragEnd}
          onRemove={() => removeStop(stop.id)}
        >
          <AddressInput
            label={`Stop ${i + 1}`}
            value={stop.value}
            onChange={v => updateStopValue(stop.id, v)}
            onSelect={c => updateStopCoord(stop.id, c)}
            disabled={loading}
          />
        </StopRow>
      ))}

      {/* Add stop */}
      <div className="pl-5 py-0.5">
        <button
          type="button"
          onClick={addStop}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="8" cy="8" r="6.5"/>
            <path d="M8 5v6M5 8h6"/>
          </svg>
          Add stop
        </button>
      </div>

      {/* End */}
      <StopRow dot="bg-red-500">
        <AddressInput
          label="End"
          value={end.value}
          onChange={v => setEnd({ value: v, coord: null })}
          onSelect={c => setEnd(s => ({ ...s, coord: c }))}
          disabled={loading}
        />
      </StopRow>

      {/* Corridor */}
      <div className="pt-2">
        <label className="block text-xs font-medium text-slate-400 mb-1">Corridor width</label>
        <div className="flex gap-2">
          {CORRIDOR_OPTIONS.map(mi => (
            <button
              key={mi}
              type="button"
              onClick={() => setCorridor(mi)}
              disabled={loading}
              className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-colors ${
                corridor === mi ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {mi} mi
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-md text-sm transition-colors"
      >
        {loading ? 'Planning route…' : 'Find Repeaters'}
      </button>
    </form>
  )
}

function StopRow({ dot, onRemove, dragging, dragOver, onDragStart, onDragOver, onDrop, onDragEnd, children }) {
  const isDraggable = !!onRemove

  return (
    <div
      className={`flex items-start gap-2 rounded transition-colors ${
        dragOver ? 'bg-blue-900/30 ring-1 ring-blue-500' : ''
      } ${dragging ? 'opacity-40' : ''}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Drag handle (stops only) or spacer */}
      <div className="flex flex-col items-center pt-6 shrink-0 gap-0.5">
        {isDraggable ? (
          <div
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 transition-colors select-none"
            title="Drag to reorder"
          >
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
              <circle cx="4" cy="3" r="1"/><circle cx="8" cy="3" r="1"/>
              <circle cx="4" cy="6" r="1"/><circle cx="8" cy="6" r="1"/>
              <circle cx="4" cy="9" r="1"/><circle cx="8" cy="9" r="1"/>
            </svg>
          </div>
        ) : (
          <span className={`w-2.5 h-2.5 rounded-full ${dot} shrink-0`} />
        )}
      </div>

      {/* Input */}
      <div className="flex-1 min-w-0">{children}</div>

      {/* Remove */}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="mt-6 text-slate-500 hover:text-red-400 transition-colors shrink-0"
          title="Remove stop"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4l8 8M12 4l-8 8"/>
          </svg>
        </button>
      )}
    </div>
  )
}
