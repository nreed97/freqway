import { useEffect, useRef, useState, useMemo } from 'react'
import {
  MapContainer, TileLayer, Polyline, CircleMarker, Popup,
  Marker, useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
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

function locationKey(r) {
  return `${r.lat.toFixed(4)},${r.lon.toFixed(4)}`
}

function FitBounds({ routeCoords }) {
  const map = useMap()
  useEffect(() => {
    if (routeCoords.length > 0) map.fitBounds(routeCoords, { padding: [40, 40] })
  }, [routeCoords, map])
  return null
}

function FlyToRepeater({ repeater }) {
  const map = useMap()
  useEffect(() => {
    if (repeater) map.setView([repeater.lat, repeater.lon], Math.max(map.getZoom(), 11), { animate: true })
  }, [repeater, map])
  return null
}

export default function MapView({ routeCoords, repeaters, selectedRepeater, onRepeaterClick }) {
  const markerRefs = useRef({})
  const [picker, setPicker] = useState(null) // { lat, lon, group }

  // Group repeaters that share the same tower (~11m precision)
  const locationGroups = useMemo(() => {
    const groups = {}
    for (const r of repeaters) {
      const key = locationKey(r)
      if (!groups[key]) groups[key] = []
      groups[key].push(r)
    }
    return groups
  }, [repeaters])

  function getGroup(r) {
    return locationGroups[locationKey(r)] ?? [r]
  }

  function handleDotClick(r) {
    const group = getGroup(r)
    if (group.length > 1) {
      setPicker({ lat: r.lat, lon: r.lon, group })
    } else {
      onRepeaterClick(r)
    }
  }

  useEffect(() => {
    if (selectedRepeater) markerRefs.current[selectedRepeater.id]?.openPopup()
  }, [selectedRepeater])

  // Close picker when repeaters list changes (new search)
  useEffect(() => { setPicker(null) }, [repeaters])

  const startCoord = routeCoords[0]
  const endCoord   = routeCoords[routeCoords.length - 1]

  return (
    <MapContainer center={[39.5, -98.35]} zoom={4} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {routeCoords.length > 1 && (
        <>
          <FitBounds routeCoords={routeCoords} />
          <Polyline positions={routeCoords} pathOptions={{ color: '#3b82f6', weight: 40, opacity: 0.08 }} />
          <Polyline positions={routeCoords} pathOptions={{ color: '#3b82f6', weight: 4,  opacity: 0.85 }} />
          <CircleMarker center={startCoord} radius={8} pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 1, weight: 2 }}>
            <Popup>Start</Popup>
          </CircleMarker>
          <CircleMarker center={endCoord} radius={8} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1, weight: 2 }}>
            <Popup>End</Popup>
          </CircleMarker>
        </>
      )}

      {selectedRepeater && <FlyToRepeater repeater={selectedRepeater} />}

      {repeaters.map(r => {
        const color      = BAND_COLOR[r.band] ?? '#8b5cf6'
        const isSelected = selectedRepeater?.id === r.id
        const isStacked  = getGroup(r).length > 1
        const tone       = r.tone ? `PL ${r.tone}` : r.tsq ? `DCS ${r.tsq}` : 'No tone'
        return (
          <CircleMarker
            key={r.id}
            center={[r.lat, r.lon]}
            radius={isSelected ? 10 : isStacked ? 9 : 7}
            pathOptions={{
              color:       isSelected ? '#fff' : isStacked ? '#fff' : color,
              fillColor:   color,
              fillOpacity: 0.9,
              weight:      isSelected ? 3 : isStacked ? 2.5 : 1.5,
            }}
            eventHandlers={{ click: () => handleDotClick(r) }}
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
                    <tr><td className="text-slate-500 pr-2">Location</td><td>{r.city}</td></tr>
                    <tr><td className="text-slate-500 pr-2">Coords</td><td className="font-mono">{r.lat.toFixed(4)}, {r.lon.toFixed(4)}</td></tr>
                    <tr><td className="text-slate-500 pr-2">Route mi</td><td>{Math.round(r.routeMile)}</td></tr>
                    <tr><td className="text-slate-500 pr-2">Off route</td><td>{r.distMiles.toFixed(1)} mi</td></tr>
                    {r.irlp     && <tr><td className="text-slate-500 pr-2">IRLP</td><td className="font-mono">{r.irlp}</td></tr>}
                    {r.echolink && <tr><td className="text-slate-500 pr-2">EchoLink</td><td className="font-mono">{r.echolink}</td></tr>}
                    {r.allstar  && <tr><td className="text-slate-500 pr-2">AllStar</td><td className="font-mono">{r.allstar}</td></tr>}
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

      {/* Picker popup for colocated repeaters */}
      {picker && (
        <Popup
          position={[picker.lat, picker.lon]}
          onClose={() => setPicker(null)}
          autoPan={true}
        >
          <div style={{ minWidth: 180 }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {picker.group.length} repeaters at this site
            </div>
            {picker.group.map(r => (
              <button
                key={r.id}
                onClick={() => {
                  // If already selected, toggle-off won't open a popup so close picker manually.
                  // Otherwise let openPopup() close it via Leaflet's single-popup behaviour,
                  // which triggers onClose → setPicker(null).
                  if (selectedRepeater?.id === r.id) setPicker(null)
                  onRepeaterClick(r)
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  width: '100%', textAlign: 'left',
                  padding: '5px 4px', borderRadius: 4, border: 'none',
                  background: 'none', cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: BAND_COLOR[r.band] ?? '#8b5cf6',
                }} />
                <span style={{ fontWeight: 700, fontSize: 13 }}>{r.callsign}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#475569' }}>{r.frequency.toFixed(4)}</span>
                <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 'auto' }}>{r.mode}</span>
              </button>
            ))}
          </div>
        </Popup>
      )}
    </MapContainer>
  )
}

function formatOffset(r) {
  if (!r.offset) return 'simplex'
  const dir = r.offsetDir === '-' ? '−' : '+'
  return `${dir}${Math.abs(r.offset).toFixed(3)} MHz`
}
