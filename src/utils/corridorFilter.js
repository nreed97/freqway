import log from './logger.js'
import { nearestPointOnRoute } from './geo.js'

export function filterByCorridorAndAnnotate(repeaters, routeCoords, corridorMiles) {
  log.info('corridor', `filtering ${repeaters.length} repeaters, corridor=${corridorMiles} mi, route=${routeCoords.length} coords`)
  const done = log.timer('corridor', 'filter + annotate')

  const skippedNoCoord = []
  const results = []

  for (const r of repeaters) {
    if (!r.lat || !r.lon || isNaN(r.lat) || isNaN(r.lon)) {
      skippedNoCoord.push(r.callsign)
      continue
    }
    const { distMiles, routeMile } = nearestPointOnRoute(r.lat, r.lon, routeCoords)
    if (distMiles <= corridorMiles) {
      results.push({ ...r, distMiles, routeMile })
    }
  }

  results.sort((a, b) => a.routeMile - b.routeMile)

  done({
    input: repeaters.length,
    inCorridor: results.length,
    skippedNoCoord: skippedNoCoord.length,
    dropped: repeaters.length - results.length - skippedNoCoord.length,
  })

  if (skippedNoCoord.length > 0) {
    log.warn('corridor', `${skippedNoCoord.length} repeaters skipped (no valid coords)`, skippedNoCoord.slice(0, 10))
  }
  log.info('corridor', `result: ${results.length} of ${repeaters.length} within ${corridorMiles} mi`)

  return results
}
