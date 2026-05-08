import { useState } from 'react'
import AddressInput from './AddressInput.jsx'

const CORRIDOR_OPTIONS = [5, 10, 25, 50]

export default function RouteInput({ onSearch, loading }) {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [startCoord, setStartCoord] = useState(null)
  const [endCoord, setEndCoord] = useState(null)
  const [corridor, setCorridor] = useState(25)

  function handleSubmit(e) {
    e.preventDefault()
    if (!start.trim() || !end.trim()) return
    onSearch({ start: start.trim(), end: end.trim(), corridor, startCoord, endCoord })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <AddressInput
        label="Start"
        value={start}
        onChange={v => { setStart(v); setStartCoord(null) }}
        onSelect={setStartCoord}
        disabled={loading}
      />
      <AddressInput
        label="End"
        value={end}
        onChange={v => { setEnd(v); setEndCoord(null) }}
        onSelect={setEndCoord}
        disabled={loading}
      />

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Corridor width</label>
        <div className="flex gap-2">
          {CORRIDOR_OPTIONS.map(mi => (
            <button
              key={mi}
              type="button"
              onClick={() => setCorridor(mi)}
              className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-colors ${
                corridor === mi
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              disabled={loading}
            >
              {mi} mi
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !start.trim() || !end.trim()}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-md text-sm transition-colors"
      >
        {loading ? 'Planning route…' : 'Find Repeaters'}
      </button>
    </form>
  )
}
