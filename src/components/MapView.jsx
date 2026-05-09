import { useEffect, useRef } from 'react'
import {
  MapContainer, TileLayer, Polyline, CircleMarker, Popup,
  Marker, useMap,
} from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
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

function markerIcon(color, isSelected) {
  const size = isSelected ? 20 : 14
  const border = isSelected ? '3px solid #fff' : '1.5px solid rgba(0,0,0,0.25)'
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${border};box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

function clusterIcon(cluster) {
  const n = cluster.getChildCount()
  const size = n < 10 ? 32 : n < 100 ? 36 : 42
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:rgba(59,130,246,0.85);border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:${n < 100 ? 12 : 10}px;box-shadow:0 2px 8px rgba(0,0,0,0.35)">${n}</div>`,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
  })
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

  useEffect(() => {
    if (selectedRepeater) markerRefs.current[selectedRepeater.id]?.openPopup()
  }, [selectedRepeater])

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

      <MarkerClusterGroup
        chunkedLoading
        disableClusteringAtZoom={11}
        iconCreateFunction={clusterIcon}
        maxClusterRadius={50}
      >
        {repeaters.map(r => {
          const color      = BAND_COLOR[r.band] ?? '#8b5cf6'
          const isSelected = selectedRepeater?.id === r.id
          const tone       = r.tone ? `PL ${r.tone}` : r.tsq ? `DCS ${r.tsq}` : 'No tone'
          return (
            <Marker
              key={r.id}
              position={[r.lat, r.lon]}
              icon={markerIcon(color, isSelected)}
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
            </Marker>
          )
        })}
      </MarkerClusterGroup>
    </MapContainer>
  )
}

function formatOffset(r) {
  if (!r.offset) return 'simplex'
  const dir = r.offsetDir === '-' ? '−' : '+'
  return `${dir}${Math.abs(r.offset).toFixed(3)} MHz`
}
