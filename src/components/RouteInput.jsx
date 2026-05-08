import { useState } from 'react'
import AddressInput from './AddressInput.jsx'

const CORRIDOR_OPTIONS = [5, 10, 25, 50]

function makeStop() {
  return { id: crypto.randomUUID(), value: '', coord: null }
}

export default function RouteInput({ onSearch, loading }) {
  const [start,    setStart]    = useState({ value: '', coord: null })
  const [end,      setEnd]      = useState({ value: '', coord: null })
  const [stops,    setStops]    = useState([])   // middle waypoints
  const [corridor, setCorridor] = useState(25)

  const canSubmit = !loading && start.value.trim() && end.value.trim()

  function addStop() {
    setStops(s => [...s, makeStop()])
  }

  function removeStop(id) {
    setStops(s => s.filter(w => w.id !== id))
  }

  function updateStop(id, value, coord) {
    setStops(s => s.map(w => w.id === id ? { ...w, value, coord } : w))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    onSearch({ start: start.value, startCoord: start.coord, stops, end: end.value, endCoord: end.coord, corridor })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">

      {/* Start */}
      <StopRow dot="bg-green-500">
        <AddressInput
          label="Start"
          value={start.value}
          onChange={v => setStart({ value: v, coord: null })}
          onSelect={c => setStart(s => ({ ...s, coord: c }))}
          disabled={loading}
        />
      </StopRow>

      {/* Middle stops */}
      {stops.map((stop, i) => (
        <StopRow key={stop.id} dot="bg-blue-400" onRemove={() => removeStop(stop.id)}>
          <AddressInput
            label={`Stop ${i + 1}`}
            value={stop.value}
            onChange={v => updateStop(stop.id, v, null)}
            onSelect={c => updateStop(stop.id, stop.value, c)}
            disabled={loading}
          />
        </StopRow>
      ))}

      {/* Add stop button */}
      <div className="pl-5">
        <button
          type="button"
          onClick={addStop}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 transition-colors py-0.5"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 5v6M5 8h6" />
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
      <div className="pt-1">
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

function StopRow({ dot, onRemove, children }) {
  return (
    <div className="flex items-start gap-2">
      {/* Dot */}
      <div className="flex flex-col items-center pt-6 shrink-0">
        <span className={`w-2.5 h-2.5 rounded-full ${dot} shrink-0`} />
      </div>

      {/* Input */}
      <div className="flex-1 min-w-0">{children}</div>

      {/* Remove button (stops only) */}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="mt-6 text-slate-500 hover:text-red-400 transition-colors shrink-0"
          title="Remove stop"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      )}
    </div>
  )
}
