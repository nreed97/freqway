const BANDS = ['2m', '70cm', '1.25m', '10m', '6m', '23cm', 'other']
const MODES = ['FM', 'DMR', 'P25', 'Fusion', 'D-STAR', 'NXDN']

const BAND_COLORS = {
  '2m': 'bg-blue-500',
  '70cm': 'bg-amber-500',
  '1.25m': 'bg-emerald-500',
  '10m': 'bg-red-500',
  '6m': 'bg-pink-500',
  '23cm': 'bg-cyan-500',
  'other': 'bg-violet-500',
}

export default function FilterPanel({ filters, onChange }) {
  function toggleBand(band) {
    const next = filters.bands.includes(band)
      ? filters.bands.filter(b => b !== band)
      : [...filters.bands, band]
    onChange({ ...filters, bands: next })
  }

  function toggleMode(mode) {
    const next = filters.modes.includes(mode)
      ? filters.modes.filter(m => m !== mode)
      : [...filters.modes, mode]
    onChange({ ...filters, modes: next })
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium text-slate-400 mb-1.5">Band</p>
        <div className="flex flex-wrap gap-1.5">
          {BANDS.map(band => (
            <button
              key={band}
              onClick={() => toggleBand(band)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                filters.bands.includes(band)
                  ? 'text-white ring-1 ring-white/30'
                  : 'opacity-40 text-slate-300 ring-1 ring-slate-600'
              }`}
              style={filters.bands.includes(band) ? {} : {}}
            >
              <span className={`w-2 h-2 rounded-full ${BAND_COLORS[band] ?? 'bg-slate-500'}`} />
              {band}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-slate-400 mb-1.5">Mode</p>
        <div className="flex flex-wrap gap-1.5">
          {MODES.map(mode => (
            <button
              key={mode}
              onClick={() => toggleMode(mode)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                filters.modes.includes(mode)
                  ? 'bg-slate-500 text-white'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.operationalOnly}
            onChange={e => onChange({ ...filters, operationalOnly: e.target.checked })}
            className="rounded border-slate-500 bg-slate-700 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-xs text-slate-300">Operational only</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.openOnly}
            onChange={e => onChange({ ...filters, openOnly: e.target.checked })}
            className="rounded border-slate-500 bg-slate-700 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-xs text-slate-300">Open use only</span>
        </label>
      </div>
    </div>
  )
}
