import { describe, it, expect } from 'vitest'
import { filterByCorridorAndAnnotate } from './corridorFilter.js'
import { distanceMiles } from './geo.js'

// East–west route at ~39.7°N (Denver area)
const ROUTE = [
  [39.7, -104.9],
  [39.7, -100.0],
  [39.7,  -95.0],
]

const ON_ROUTE = {
  callsign: 'W0ON', frequency: 146.94, band: '2m', mode: 'FM',
  lat: 39.7, lon: -104.9,
}

// ~14 miles north of midpoint — inside 25 mi, outside 10 mi
const NEAR_ROUTE = {
  callsign: 'W0NEAR', frequency: 146.52, band: '2m', mode: 'FM',
  lat: 39.9, lon: -100.0,
}

// ~90 miles north — outside any practical corridor
const FAR_ROUTE = {
  callsign: 'W0FAR', frequency: 446.0, band: '70cm', mode: 'FM',
  lat: 41.0, lon: -100.0,
}

describe('filterByCorridorAndAnnotate', () => {
  it('returns an empty array for empty input', () => {
    expect(filterByCorridorAndAnnotate([], ROUTE, 25)).toHaveLength(0)
  })

  it('includes repeaters within the corridor', () => {
    const results = filterByCorridorAndAnnotate([ON_ROUTE, NEAR_ROUTE], ROUTE, 25)
    expect(results).toHaveLength(2)
  })

  it('excludes repeaters beyond the corridor width', () => {
    const results = filterByCorridorAndAnnotate([FAR_ROUTE], ROUTE, 25)
    expect(results).toHaveLength(0)
  })

  it('respects the corridor width threshold', () => {
    // NEAR_ROUTE is ~14 miles off — inside 25 mi, outside 10 mi
    expect(filterByCorridorAndAnnotate([NEAR_ROUTE], ROUTE, 25)).toHaveLength(1)
    expect(filterByCorridorAndAnnotate([NEAR_ROUTE], ROUTE, 10)).toHaveLength(0)
  })

  it('annotates results with distMiles', () => {
    const [r] = filterByCorridorAndAnnotate([ON_ROUTE], ROUTE, 25)
    expect(r.distMiles).toBeDefined()
    expect(typeof r.distMiles).toBe('number')
    expect(r.distMiles).toBeLessThan(1)  // ON_ROUTE is on the route
  })

  it('annotates results with routeMile', () => {
    const [r] = filterByCorridorAndAnnotate([ON_ROUTE], ROUTE, 25)
    expect(r.routeMile).toBeDefined()
    expect(r.routeMile).toBeGreaterThanOrEqual(0)
  })

  it('sorts results by routeMile ascending', () => {
    const results = filterByCorridorAndAnnotate([NEAR_ROUTE, ON_ROUTE], ROUTE, 25)
    expect(results[0].routeMile).toBeLessThanOrEqual(results[1].routeMile)
  })

  it('skips repeaters with missing coordinates', () => {
    const bad = [
      { callsign: 'W0NULL', lat: null, lon: null },
      { callsign: 'W0NAN',  lat: NaN,  lon: NaN  },
      ON_ROUTE,
    ]
    const results = filterByCorridorAndAnnotate(bad, ROUTE, 25)
    expect(results).toHaveLength(1)
    expect(results[0].callsign).toBe('W0ON')
  })

  it('preserves all original repeater fields on annotated results', () => {
    const [r] = filterByCorridorAndAnnotate([ON_ROUTE], ROUTE, 25)
    expect(r.callsign).toBe(ON_ROUTE.callsign)
    expect(r.frequency).toBe(ON_ROUTE.frequency)
    expect(r.band).toBe(ON_ROUTE.band)
    expect(r.mode).toBe(ON_ROUTE.mode)
  })

  it('distMiles for NEAR_ROUTE matches expected great-circle distance', () => {
    const [r] = filterByCorridorAndAnnotate([NEAR_ROUTE], ROUTE, 25)
    // Nearest point on route is (39.7, -100.0); NEAR_ROUTE is at (39.9, -100.0)
    const expected = distanceMiles(39.9, -100.0, 39.7, -100.0)
    expect(r.distMiles).toBeCloseTo(expected, 1)
  })
})
