import { useState, useMemo, useCallback } from 'react'
import MapView from './components/MapView.jsx'
import RouteInput from './components/RouteInput.jsx'
import FilterPanel from './components/FilterPanel.jsx'
import RepeaterList from './components/RepeaterList.jsx'
import StatusBar from './components/StatusBar.jsx'
import HelpModal from './components/HelpModal.jsx'
import { geocode } from './services/geocoding.js'
import { fetchRoute } from './services/routing.js'
import { fetchAllUSRepeaters } from './services/hearham.js'
import { filterByCorridorAndAnnotate } from './utils/corridorFilter.js'
import log from './utils/logger.js'

const DEFAULT_FILTERS = {
  bands: ['2m', '70cm'],
  modes: ['FM', 'DMR', 'P25', 'Fusion', 'D-STAR', 'NXDN'],
  operationalOnly: true,
  openOnly: true,
}

export default function App() {
  const [route, setRoute] = useState(null)          // { coords, distanceMeters, durationSeconds }
  const [allRepeaters, setAllRepeaters] = useState([])  // annotated, in-corridor repeaters
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [selectedRepeater, setSelectedRepeater] = useState(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [corridorMiles, setCorridorMiles] = useState(25)
  const [showHelp, setShowHelp] = useState(false)
  const [copied,   setCopied]   = useState(false)

  function handleShare() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const visibleRepeaters = useMemo(() => {
    return allRepeaters.filter(r => {
      if (!filters.bands.includes(r.band)) return false
      if (!filters.modes.includes(r.mode)) return false
      if (filters.operationalOnly && !r.operational) return false
      if (filters.openOnly && r.use?.toUpperCase() !== 'OPEN') return false
      return true
    })
  }, [allRepeaters, filters])

  const handleSearch = useCallback(async ({ start, startCoord: preStart, stops, end, endCoord: preEnd, corridor }) => {
    setLoading(true)
    setError('')
    setRoute(null)
    setAllRepeaters([])
    setSelectedRepeater(null)
    setCorridorMiles(corridor)

    log.info('app', 'handleSearch', { start, end, corridor, stopCount: stops.length })
    const totalDone = log.timer('app', 'full search pipeline')

    try {
      // Geocode any stops that weren't resolved via autocomplete
      setStatus('Geocoding addresses…')
      const toGeocode = []

      let startCoord = preStart
      let endCoord   = preEnd
      if (!startCoord) toGeocode.push(geocode(start).then(r => { startCoord = r }))
      if (!endCoord)   toGeocode.push(geocode(end).then(r => { endCoord = r }))

      const stopCoords = stops.map(s => ({ coord: s.coord }))
      stops.forEach((s, i) => {
        if (!s.coord) {
          toGeocode.push(geocode(s.value).then(r => { stopCoords[i].coord = r }))
        }
      })

      await Promise.all(toGeocode)

      const allWaypoints = [
        startCoord,
        ...stopCoords.map(s => s.coord),
        endCoord,
      ]
      log.debug('app', 'all waypoints resolved', allWaypoints)

      setStatus('Fetching driving route…')
      const routeData = await fetchRoute(allWaypoints)
      setRoute(routeData)

      setStatus('Loading repeater database…')
      const raw = await fetchAllUSRepeaters(msg => setStatus(msg))

      setStatus('Filtering to corridor…')
      const annotated = filterByCorridorAndAnnotate(raw, routeData.coords, corridor)
      setAllRepeaters(annotated)
      setStatus('')
      totalDone({ repeaters: annotated.length })
      log.info('app', `pipeline complete — ${annotated.length} repeaters in corridor`)
    } catch (err) {
      log.error('app', 'pipeline error', err)
      setError(err.message ?? 'An unknown error occurred.')
      setStatus('')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleRepeaterSelect = useCallback(r => {
    setSelectedRepeater(prev => prev?.id === r.id ? null : r)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-slate-800 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-7 h-7 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span className="text-xl font-bold tracking-tight text-white">Freqway</span>
          <span className="text-xs text-slate-400 font-normal hidden sm:block">Ham Radio Repeater Route Planner</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {route && (
            <button
              onClick={handleShare}
              title="Copy shareable link"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-slate-700"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                  Share
                </>
              )}
            </button>
          )}
          <button
            onClick={() => setShowHelp(true)}
            title="How to use Freqway"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-slate-700"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Help
          </button>
        </div>
      </header>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {/* Main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left sidebar */}
        <aside className="w-80 shrink-0 flex flex-col bg-slate-800 border-r border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700 shrink-0">
            <RouteInput onSearch={handleSearch} loading={loading} />
          </div>

          {error && (
            <div className="mx-4 mt-3 p-3 bg-red-900/50 border border-red-700 rounded-md text-sm text-red-300 shrink-0">
              {error}
            </div>
          )}

          <div className="p-4 border-b border-slate-700 shrink-0">
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Filters</p>
            <FilterPanel filters={filters} onChange={setFilters} />
          </div>

          <div className="flex-1 min-h-0 p-4 flex flex-col">
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Repeaters
            </p>
            {allRepeaters.length > 0 ? (
              <RepeaterList
                repeaters={visibleRepeaters}
                onSelect={handleRepeaterSelect}
                selectedId={selectedRepeater?.id}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-slate-500 text-sm text-center px-4">
                  {loading
                    ? status || 'Loading…'
                    : 'Enter a route above to find repeaters along your path.'}
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Map */}
        <main className="flex-1 relative min-w-0">
          <MapView
            routeCoords={route?.coords ?? []}
            repeaters={visibleRepeaters}
            selectedRepeater={selectedRepeater}
            onRepeaterClick={handleRepeaterSelect}
          />

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center z-[1000]">
              <div className="bg-slate-800 rounded-xl px-8 py-6 shadow-2xl text-center max-w-xs">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white font-medium text-sm">{status || 'Working…'}</p>
                <p className="text-slate-400 text-xs mt-1">This may take a moment for multi-state routes</p>
              </div>
            </div>
          )}
        </main>
      </div>

      <StatusBar
        route={route}
        repeaterCount={allRepeaters.length > 0 ? visibleRepeaters.length : null}
        status={!loading ? status : ''}
      />
    </div>
  )
}
