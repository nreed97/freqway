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

export async function fetchRoute(startLat, startLon, endLat, endLon) {
  const url = `${OSRM}/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=polyline`
  log.info('routing', `fetchRoute (${startLat.toFixed(4)},${startLon.toFixed(4)}) → (${endLat.toFixed(4)},${endLon.toFixed(4)})`, { url })
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

  const result = {
    coords,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  }
  done({ coordCount: coords.length, distKm: (route.distance / 1000).toFixed(1), durationMin: Math.round(route.duration / 60) })
  log.debug('routing', `decoded ${coords.length} coords, ${(route.distance / 1000).toFixed(1)} km, ${Math.round(route.duration / 60)} min`)
  return result
}
