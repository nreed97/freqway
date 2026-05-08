const R_MILES = 3958.8  // Earth radius in miles
const R_METERS = 6371000

export function toRad(deg) {
  return deg * (Math.PI / 180)
}

// Haversine distance in miles
export function distanceMiles(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Distance in meters
export function distanceMeters(lat1, lon1, lat2, lon2) {
  return distanceMiles(lat1, lon1, lat2, lon2) * 1609.344
}

// Minimum distance (miles) from point (pLat, pLon) to a polyline [[lat,lon],...]
// Also returns the index of the nearest segment and fraction along it,
// and cumulative route distance to the nearest point.
export function nearestPointOnRoute(pLat, pLon, routeCoords) {
  let minDist = Infinity
  let bestSegIdx = 0
  let bestFrac = 0
  let cumBefore = 0  // cumulative miles before bestSegIdx

  let cumDist = 0
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const [aLat, aLon] = routeCoords[i]
    const [bLat, bLon] = routeCoords[i + 1]
    const segLen = distanceMiles(aLat, aLon, bLat, bLon)

    const { dist, frac } = pointToSegmentDist(pLat, pLon, aLat, aLon, bLat, bLon)
    if (dist < minDist) {
      minDist = dist
      bestSegIdx = i
      bestFrac = frac
      cumBefore = cumDist
    }
    cumDist += segLen
  }

  const [aLat, aLon] = routeCoords[bestSegIdx]
  const [bLat, bLon] = routeCoords[bestSegIdx + 1]
  const segLen = distanceMiles(aLat, aLon, bLat, bLon)
  const routeMile = cumBefore + bestFrac * segLen

  return { distMiles: minDist, routeMile }
}

// Signed distance from point P to segment AB, plus fraction [0,1] along AB
function pointToSegmentDist(pLat, pLon, aLat, aLon, bLat, bLon) {
  const dx = bLon - aLon
  const dy = bLat - aLat
  const lenSq = dx * dx + dy * dy

  if (lenSq === 0) {
    return { dist: distanceMiles(pLat, pLon, aLat, aLon), frac: 0 }
  }

  const t = ((pLon - aLon) * dx + (pLat - aLat) * dy) / lenSq
  const frac = Math.max(0, Math.min(1, t))
  const closestLat = aLat + frac * dy
  const closestLon = aLon + frac * dx

  return { dist: distanceMiles(pLat, pLon, closestLat, closestLon), frac }
}

// Total route length in miles
export function routeLengthMiles(routeCoords) {
  let total = 0
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const [lat1, lon1] = routeCoords[i]
    const [lat2, lon2] = routeCoords[i + 1]
    total += distanceMiles(lat1, lon1, lat2, lon2)
  }
  return total
}

// Format miles nicely
export function fmtMiles(miles) {
  return miles < 10 ? miles.toFixed(1) : Math.round(miles).toString()
}

// Format duration in seconds → "2h 15m" or "45m"
export function fmtDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
