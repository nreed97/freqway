import { useEffect } from 'react'

export default function HelpModal({ onClose }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <h2 className="text-white font-semibold text-base">How to use Freqway</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-6 text-sm text-slate-300">

          <section>
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0">1</span>
              Enter your route
            </h3>
            <p className="ml-7 text-slate-400">
              Type a city, address, or <span className="font-mono text-slate-300">lat,lon</span> pair in the <strong className="text-white">Start</strong> and <strong className="text-white">End</strong> fields.
              Autocomplete suggestions appear as you type — click one to select it. Then choose a
              <strong className="text-white"> corridor width</strong> (how far off the route to search) and press <strong className="text-white">Find Repeaters</strong>.
            </p>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0">2</span>
              Read the repeater list
            </h3>
            <div className="ml-7 space-y-2 text-slate-400">
              <p>Repeaters are listed <strong className="text-white">start → end</strong> by route mile so the next one you need is always below the current one as you travel.</p>
              <div className="flex flex-wrap gap-3 mt-2">
                <Chip color="bg-blue-500" label="2m" />
                <Chip color="bg-amber-500" label="70cm" />
                <Chip color="bg-emerald-500" label="1.25m" />
                <Chip color="bg-red-500" label="10m" />
                <Chip color="bg-pink-500" label="6m" />
                <Chip color="bg-cyan-500" label="23cm" />
                <Chip color="bg-violet-500" label="other" />
              </div>
              <p className="mt-2">Each row shows: callsign · frequency · offset · tone · distance off route · route mile marker.</p>
              <p>Use the <strong className="text-white">search box</strong> to filter by callsign or city.</p>
            </div>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0">3</span>
              Interact with the map
            </h3>
            <p className="ml-7 text-slate-400">
              Click any dot on the map or any row in the list to see full details: frequency, offset, tone/DCS code, mode, band, coordinates, and route position.
              Selecting a repeater from the list automatically pans the map to it.
            </p>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0">4</span>
              Filter by band and mode
            </h3>
            <p className="ml-7 text-slate-400">
              Toggle bands (2m, 70cm, 1.25m, 10m, 6m, 23cm) and modes (FM, DMR, P25, Fusion, D-STAR, NXDN) in the Filters panel.
              The <strong className="text-white">Operational only</strong> checkbox hides repeaters marked offline; <strong className="text-white">Open use only</strong> hides members-only machines.
            </p>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0">5</span>
              Export for your radio
            </h3>
            <div className="ml-7 space-y-1 text-slate-400">
              <p>Click <strong className="text-white">Export ▾</strong> above the repeater list to download a CSV:</p>
              <ul className="mt-1 space-y-1 list-none">
                <li><span className="text-white font-medium">CHIRP (.csv)</span> — import via <em>File › Import Data and Settings</em> in CHIRP</li>
                <li><span className="text-white font-medium">RT Systems (.csv)</span> — open as a channel spreadsheet in ADMS / ARCP / CS-series software</li>
                <li><span className="text-white font-medium">Generic CSV</span> — human-readable, all fields, for spreadsheets or manual reference</li>
              </ul>
              <p className="mt-1 text-xs text-slate-500">Exports include only the repeaters currently visible (respects your active filters).</p>
            </div>
          </section>

          <section className="border-t border-slate-700 pt-4">
            <h3 className="text-white font-semibold mb-2">Tips</h3>
            <ul className="space-y-1 text-slate-400 list-disc list-inside">
              <li>The repeater database is cached locally for 24 hours — subsequent searches load instantly.</li>
              <li>Press <kbd className="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded text-xs font-mono">Esc</kbd> to close this dialog.</li>
              <li>Corridor width affects search time only on first load; filtering is instant after that.</li>
              <li>Repeater data sourced from <a href="https://hearham.com" target="_blank" rel="noopener" className="text-blue-400 underline hover:text-blue-300">HearHam.com</a>.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

function Chip({ color, label }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-300">
      <span className={`w-2.5 h-2.5 rounded-full ${color} shrink-0`} />
      {label}
    </span>
  )
}
