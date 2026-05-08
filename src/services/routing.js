import log from '../utils/logger.js'

const OSRM = 'https://router.project-osrm.org/route/v1/driving'

function decodePolyline(encoded) {
  const coords = []
  let index = 0, lat = 0, lng = 0
  while (index < encoded.length) {
    let b, shift = 0, result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    lat += result & 1 ? ~(result >> 1) : result >> 1

    shift = 0; result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    lng += result & 1 ? ~(result >> 1) : result >> 1

    coords.push([lat / 1e5, lng / 1e5])
  }
  return coords
}

// waypoints: [{lat, lon}, ...] — at least 2 entries (start + end).
// OSRM accepts any number separated by semicolons.
export async function fetchRoute(waypoints) {
  const coordStr = waypoints.map(w => `${w.lon},${w.lat}`).join(';')
  const url = `${OSRM}/${coordStr}?overview=full&geometries=polyline`
  log.info('routing', `fetchRoute ${waypoints.length} waypoints`, { url })
  const done = log.timer('routing', 'OSRM fetch')

  const res = await fetch(url)
  if (!res.ok) {
    log.error('routing', `OSRM HTTP ${res.status}`)
    throw new Error(`OSRM routing failed: ${res.status}`)
  }

  const data = await res.json()
  if (data.code !== 'Ok') {
    log.error('routing', `OSRM error code: ${data.code}`, data)
    throw new Error(`OSRM: ${data.message ?? data.code}`)
  }

  const route = data.routes[0]
  const coords = decodePolyline(route.geometry)

  const result = { coords, distanceMeters: route.distance, durationSeconds: route.duration }
  done({ coordCount: coords.length, distKm: (route.distance / 1000).toFixed(1), durationMin: Math.round(route.duration / 60) })
  return result
}
