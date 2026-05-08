import { useEffect, useRef, useCallback } from 'react'
import {
  MapContainer, TileLayer, Polyline, CircleMarker, Popup,
  Marker, useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet's broken default icon paths in Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const BAND_COLOR = {
  '2m':    '#3b82f6',
  '70cm':  '#f59e0b',
  '1.25m': '#10b981',
  '10m':   '#ef4444',
  '6m':    '#ec4899',
  '23cm':  '#06b6d4',
  'other': '#8b5cf6',
}

// Sub-component that pans/zooms when the route changes
function FitBounds({ routeCoords }) {
  const map = useMap()
  useEffect(() => {
    if (routeCoords.length > 0) {
      map.fitBounds(routeCoords, { padding: [40, 40] })
    }
  }, [routeCoords, map])
  return null
}

// Pan to a selected repeater
function FlyToRepeater({ repeater }) {
  const map = useMap()
  useEffect(() => {
    if (repeater) {
      map.setView([repeater.lat, repeater.lon], Math.max(map.getZoom(), 11), { animate: true })
    }
  }, [repeater, map])
  return null
}

export default function MapView({ routeCoords, repeaters, selectedRepeater, onRepeaterClick }) {
  const markerRefs = useRef({})

  // Open popup when a repeater is selected from the list
  useEffect(() => {
    if (selectedRepeater) {
      const ref = markerRefs.current[selectedRepeater.id]
      ref?.openPopup()
    }
  }, [selectedRepeater])

  const startCoord = routeCoords[0]
  const endCoord = routeCoords[routeCoords.length - 1]

  return (
    <MapContainer
      center={[39.5, -98.35]}
      zoom={4}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {routeCoords.length > 1 && (
        <>
          <FitBounds routeCoords={routeCoords} />
          {/* Corridor shading — wide semi-transparent stroke */}
          <Polyline
            positions={routeCoords}
            pathOptions={{ color: '#3b82f6', weight: 40, opacity: 0.08 }}
          />
          {/* Route line */}
          <Polyline
            positions={routeCoords}
            pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.85 }}
          />
          {/* Start/end markers */}
          <CircleMarker
            center={startCoord}
            radius={8}
            pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 1, weight: 2 }}
          >
            <Popup>Start</Popup>
          </CircleMarker>
          <CircleMarker
            center={endCoord}
            radius={8}
            pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1, weight: 2 }}
          >
            <Popup>End</Popup>
          </CircleMarker>
        </>
      )}

      {selectedRepeater && <FlyToRepeater repeater={selectedRepeater} />}

      {repeaters.map(r => {
        const color = BAND_COLOR[r.band] ?? '#8b5cf6'
        const isSelected = selectedRepeater?.id === r.id
        const tone = r.tone ? `PL ${r.tone}` : r.tsq ? `DCS ${r.tsq}` : 'No tone'
        return (
          <CircleMarker
            key={r.id}
            center={[r.lat, r.lon]}
            radius={isSelected ? 10 : 7}
            pathOptions={{
              color: isSelected ? '#fff' : color,
              fillColor: color,
              fillOpacity: 0.9,
              weight: isSelected ? 3 : 1.5,
            }}
            eventHandlers={{ click: () => onRepeaterClick(r) }}
            ref={el => { if (el) markerRefs.current[r.id] = el }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-bold text-base mb-1">{r.callsign}</div>
                <table className="text-xs w-full border-collapse">
                  <tbody>
                    <tr><td className="text-slate-500 pr-2">Freq</td><td className="font-mono">{r.frequency.toFixed(4)} MHz</td></tr>
                    <tr><td className="text-slate-500 pr-2">Offset</td><td className="font-mono">{formatOffset(r)}</td></tr>
                    <tr><td className="text-slate-500 pr-2">Tone</td><td>{tone}</td></tr>
                    <tr><td className="text-slate-500 pr-2">Mode</td><td>{r.mode}</td></tr>
                    <tr><td className="text-slate-500 pr-2">Band</td><td>{r.band}</td></tr>
                    <tr><td className="text-slate-500 pr-2">Location</td><td>{r.city}, {r.state}</td></tr>
                    <tr><td className="text-slate-500 pr-2">Coords</td><td className="font-mono">{r.lat.toFixed(4)}, {r.lon.toFixed(4)}</td></tr>
                    <tr><td className="text-slate-500 pr-2">Route mi</td><td>{Math.round(r.routeMile)}</td></tr>
                    <tr><td className="text-slate-500 pr-2">Off route</td><td>{r.distMiles.toFixed(1)} mi</td></tr>
                  </tbody>
                </table>
                {r.notes && <p className="mt-1 text-slate-500 text-xs">{r.notes}</p>}
                <p className="mt-2 text-[10px] text-slate-400">
                  Data: <a href="https://hearham.com" target="_blank" rel="noopener" className="underline">HearHam.com</a>
                </p>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}

function formatOffset(r) {
  if (!r.offset) return 'simplex'
  const dir = r.offsetDir === '-' ? '−' : '+'
  return `${dir}${Math.abs(r.offset).toFixed(3)} MHz`
}
