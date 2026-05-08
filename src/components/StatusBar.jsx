import { fmtMiles, fmtDuration } from '../utils/geo.js'

export default function StatusBar({ route, repeaterCount, status }) {
  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-slate-900 border-t border-slate-700 text-xs text-slate-400 shrink-0">
      <div className="flex items-center gap-4">
        {route && (
          <>
            <span>{fmtMiles(route.distanceMeters * 0.000621371)} mi</span>
            <span>{fmtDuration(route.durationSeconds)}</span>
            {repeaterCount !== null && (
              <span>{repeaterCount} repeater{repeaterCount !== 1 ? 's' : ''} found</span>
            )}
          </>
        )}
        {status && <span className="text-blue-400">{status}</span>}
      </div>
      <span>
        Data: <a href="https://hearham.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-300">HearHam.com</a>
        {' · '}
        Map: <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-300">OpenStreetMap</a>
      </span>
    </div>
  )
}
