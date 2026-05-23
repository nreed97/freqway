import { describe, it, expect } from 'vitest'
import {
  distanceMiles, distanceMeters,
  nearestPointOnRoute, routeLengthMiles,
  fmtMiles, fmtDuration,
} from './geo.js'

// ── distanceMiles ────────────────────────────────────────────────────────────

describe('distanceMiles', () => {
  it('returns 0 for identical points', () => {
    expect(distanceMiles(40, -80, 40, -80)).toBe(0)
  })

  it('is symmetric', () => {
    const a = distanceMiles(39.7, -104.9, 41.1, -104.8)
    const b = distanceMiles(41.1, -104.8, 39.7, -104.9)
    expect(a).toBeCloseTo(b, 8)
  })

  it('returns ~69 miles per degree of latitude', () => {
    // 1° latitude ≈ 69.1 miles everywhere
    expect(distanceMiles(0, 0, 1, 0)).toBeCloseTo(69.1, 0)
    expect(distanceMiles(40, 0, 41, 0)).toBeCloseTo(69.1, 0)
  })

  it('returns ~69 miles per degree of longitude at equator', () => {
    expect(distanceMiles(0, 0, 0, 1)).toBeCloseTo(69.1, 0)
  })

  it('longitude degrees shrink away from equator', () => {
    // At 60°N, 1° lon ≈ cos(60°) × 69.1 ≈ 34.6 miles
    const d = distanceMiles(60, 0, 60, 1)
    expect(d).toBeCloseTo(34.6, 0)
  })
})

// ── distanceMeters ───────────────────────────────────────────────────────────

describe('distanceMeters', () => {
  it('is consistent with distanceMiles × 1609.344', () => {
    const miles  = distanceMiles(39.7, -104.9, 40.0, -105.1)
    const meters = distanceMeters(39.7, -104.9, 40.0, -105.1)
    expect(meters).toBeCloseTo(miles * 1609.344, 3)
  })
})

// ── nearestPointOnRoute ──────────────────────────────────────────────────────

describe('nearestPointOnRoute', () => {
  // Simple east–west route along the equator
  const ROUTE = [[0, 0], [0, 10]]

  it('projects a perpendicular point onto the route correctly', () => {
    // Point 1° north of the midpoint → nearest point is (0, 5)
    const { distMiles, routeMile } = nearestPointOnRoute(1, 5, ROUTE)
    expect(distMiles).toBeCloseTo(distanceMiles(1, 5, 0, 5), 4)
    const halfLen = distanceMiles(0, 0, 0, 5)
    expect(routeMile).toBeCloseTo(halfLen, 1)
  })

  it('clamps to the near endpoint when projection falls before segment start', () => {
    const { distMiles, routeMile } = nearestPointOnRoute(0, -5, ROUTE)
    expect(distMiles).toBeCloseTo(distanceMiles(0, -5, 0, 0), 4)
    expect(routeMile).toBeCloseTo(0, 4)
  })

  it('clamps to the far endpoint when projection falls beyond segment end', () => {
    const totalLen = routeLengthMiles(ROUTE)
    const { distMiles, routeMile } = nearestPointOnRoute(0, 15, ROUTE)
    expect(distMiles).toBeCloseTo(distanceMiles(0, 15, 0, 10), 4)
    expect(routeMile).toBeCloseTo(totalLen, 1)
  })

  it('returns near-zero distance for a point exactly on the route', () => {
    const { distMiles } = nearestPointOnRoute(0, 3, ROUTE)
    expect(distMiles).toBeLessThan(0.01)
  })

  it('works for multi-segment routes and picks the closest segment', () => {
    const route = [[0, 0], [0, 5], [0, 10]]
    const { distMiles } = nearestPointOnRoute(1, 3, route)
    expect(distMiles).toBeCloseTo(distanceMiles(1, 3, 0, 3), 4)
  })
})

// ── routeLengthMiles ─────────────────────────────────────────────────────────

describe('routeLengthMiles', () => {
  it('returns 0 for an empty route', () => {
    expect(routeLengthMiles([])).toBe(0)
  })

  it('returns 0 for a single-point route', () => {
    expect(routeLengthMiles([[40, -80]])).toBe(0)
  })

  it('sums segment lengths correctly', () => {
    const route = [[0, 0], [0, 5], [0, 10]]
    const full = routeLengthMiles(route)
    const half = routeLengthMiles([[0, 0], [0, 5]])
    expect(full).toBeCloseTo(half * 2, 4)
  })
})

// ── fmtMiles ─────────────────────────────────────────────────────────────────

describe('fmtMiles', () => {
  it('shows one decimal place for values below 10', () => {
    expect(fmtMiles(0)).toBe('0.0')
    expect(fmtMiles(3.45)).toBe('3.5')
    expect(fmtMiles(9.94)).toBe('9.9')
  })

  it('rounds to the nearest integer for values ≥ 10', () => {
    expect(fmtMiles(10)).toBe('10')
    expect(fmtMiles(123.7)).toBe('124')
    expect(fmtMiles(999.4)).toBe('999')
  })
})

// ── fmtDuration ──────────────────────────────────────────────────────────────

describe('fmtDuration', () => {
  it('shows minutes only for durations under one hour', () => {
    expect(fmtDuration(0)).toBe('0m')
    expect(fmtDuration(1800)).toBe('30m')
    expect(fmtDuration(3540)).toBe('59m')
  })

  it('shows hours and minutes for durations of one hour or more', () => {
    expect(fmtDuration(3600)).toBe('1h 0m')
    expect(fmtDuration(5400)).toBe('1h 30m')
    expect(fmtDuration(9000)).toBe('2h 30m')
  })

  it('rounds partial minutes', () => {
    expect(fmtDuration(90)).toBe('2m')  // 1.5 min → rounds to 2
  })
})
