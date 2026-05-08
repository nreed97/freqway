import { useState } from 'react'
import { exportCSV, exportCHIRP, exportRTSystems } from '../utils/export.js'
import { fmtMiles } from '../utils/geo.js'

const BAND_DOT = {
  '2m':    'bg-blue-500',
  '70cm':  'bg-amber-500',
  '1.25m': 'bg-emerald-500',
  '10m':   'bg-red-500',
  '6m':    'bg-pink-500',
  '23cm':  'bg-cyan-500',
  'other': 'bg-violet-500',
}

export default function RepeaterList({ repeaters, onSelect, selectedId }) {
  const [search, setSearch] = useState('')

  const q = search.trim().toLowerCase()
  const filtered = q
    ? repeaters.filter(r =>
        r.callsign.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q)
      )
    : repeaters

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <span className="text-xs text-slate-400">
          {filtered.length} repeater{filtered.length !== 1 ? 's' : ''}
          {search ? ` matching "${search}"` : ' along route'}
        </span>
        {repeaters.length > 0 && (
          <ExportMenu repeaters={repeaters} />
        )}
      </div>

      <input
        type="search"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search callsign, city…"
        className="mb-2 w-full bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shrink-0"
      />

      <div className="overflow-y-auto repeater-list flex-1 min-h-0 -mx-1 px-1">
        {filtered.length === 0 && (
          <p className="text-center text-slate-500 text-sm py-8">No repeaters match your filters.</p>
        )}
        {filtered.map(r => (
          <RepeaterRow
            key={r.id}
            repeater={r}
            selected={r.id === selectedId}
            onClick={() => onSelect(r)}
          />
        ))}
      </div>
    </div>
  )
}

function RepeaterRow({ repeater: r, selected, onClick }) {
  const tone = r.tone ? `PL ${r.tone}` : r.tsq ? `DCS ${r.tsq}` : 'No tone'
  const offset = formatOffset(r)

  return (
    <div
      onClick={onClick}
      className={`mb-1 rounded-md px-3 py-2.5 cursor-pointer transition-colors border ${
        selected
          ? 'bg-blue-900/50 border-blue-500'
          : 'bg-slate-800 border-transparent hover:bg-slate-700'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`shrink-0 w-2.5 h-2.5 rounded-full ${BAND_DOT[r.band] ?? 'bg-slate-500'}`} />
          <span className="font-bold text-sm text-white">{r.callsign}</span>
          <span className={`shrink-0 text-[10px] px-1 py-0.5 rounded font-medium ${
            r.mode === 'FM' ? 'bg-slate-600 text-slate-300' : 'bg-indigo-700 text-indigo-200'
          }`}>
            {r.mode}
          </span>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs font-mono text-white">{r.frequency.toFixed(4)}</div>
          <div className="text-[10px] text-slate-400">{offset}</div>
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
        <span className="truncate">{r.city}</span>
        <span className="shrink-0 ml-2 text-slate-500">
          {tone} · {fmtMiles(r.distMiles)} mi off · mi {Math.round(r.routeMile)}
        </span>
      </div>
    </div>
  )
}

function ExportMenu({ repeaters }) {
  const [open, setOpen] = useState(false)

  function pick(fn) {
    fn(repeaters)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-0.5"
      >
        Export
        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 8L2 4h8L6 8z"/>
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-44 bg-slate-800 border border-slate-600 rounded-md shadow-xl text-xs overflow-hidden">
            <div className="px-3 py-1.5 text-slate-500 font-medium border-b border-slate-700">Export format</div>
            <button onClick={() => pick(exportCHIRP)}
              className="w-full text-left px-3 py-2 hover:bg-slate-700 text-slate-200 transition-colors">
              CHIRP (.csv)
              <div className="text-slate-500 text-[10px]">Import via File › Import</div>
            </button>
            <button onClick={() => pick(exportRTSystems)}
              className="w-full text-left px-3 py-2 hover:bg-slate-700 text-slate-200 transition-colors">
              RT Systems (.csv)
              <div className="text-slate-500 text-[10px]">Import via channel spreadsheet</div>
            </button>
            <button onClick={() => pick(exportCSV)}
              className="w-full text-left px-3 py-2 hover:bg-slate-700 text-slate-200 transition-colors border-t border-slate-700">
              Generic CSV
              <div className="text-slate-500 text-[10px]">Human-readable, all fields</div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function formatOffset(r) {
  if (!r.offset) return 'no offset'
  const dir = r.offsetDir === '-' ? '−' : '+'
  return `${dir}${Math.abs(r.offset).toFixed(2)} MHz`
}
