import log from '../utils/logger.js'

// Proxy through Vite dev server to avoid CORS issues with non-200 responses
const NOMINATIM = '/api/nominatim'
const HEADERS = { 'Accept-Language': 'en' }

export async function geocode(query) {
  const url = `${NOMINATIM}/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=us`
  log.info('geocoding', `geocode("${query}")`, { url })
  const done = log.timer('geocoding', `geocode("${query}")`)

  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) {
    log.error('geocoding', `HTTP ${res.status} for geocode("${query}")`)
    throw new Error(`Geocoding failed: ${res.status}`)
  }

  const data = await res.json()
  done({ results: data.length })

  if (!data.length) {
    log.warn('geocoding', `No results for "${query}"`)
    throw new Error(`No results found for "${query}"`)
  }

  const result = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display: data[0].display_name }
  log.debug('geocoding', `resolved → ${result.lat.toFixed(4)}, ${result.lon.toFixed(4)}`, result)
  return result
}

// Autocomplete via Photon (Komoot) — OSM-backed, CORS-enabled, no burst rate limit.
// Kept separate from geocode() which uses Nominatim for final single-shot resolution.
const PHOTON = 'https://photon.komoot.io/api'
// Bounding box for continental US + AK/HI (lon_min,lat_min,lon_max,lat_max)
const US_BBOX = '-180,18,180,72'

export async function geocodeSuggest(query) {
  if (!query || query.trim().length < 3) return []
  const url = `${PHOTON}/?q=${encodeURIComponent(query)}&limit=6&lang=en&bbox=${US_BBOX}`
  log.debug('geocoding', `suggest("${query}") via Photon`, { url })

  try {
    const res = await fetch(url)
    if (!res.ok) {
      log.warn('geocoding', `suggest HTTP ${res.status}`)
      return []
    }
    const geojson = await res.json()
    const features = geojson.features ?? []
    log.debug('geocoding', `suggest("${query}") → ${features.length} results`)

    return features
      .filter(f => f.properties?.countrycode === 'US')
      .map(f => {
        const p = f.properties ?? {}
        const [lon, lat] = f.geometry.coordinates
        return {
          lat,
          lon,
          display: buildPhotonDisplay(p),
          short: buildPhotonShort(p),
        }
      })
  } catch (err) {
    log.warn('geocoding', 'suggest fetch failed', err)
    return []
  }
}

function buildPhotonShort(p) {
  const parts = [p.name ?? p.city ?? p.county ?? '', p.state ?? ''].filter(Boolean)
  return parts.join(', ')
}

function buildPhotonDisplay(p) {
  return [p.name, p.street, p.city ?? p.county, p.state, 'USA']
    .filter(Boolean)
    .join(', ')
}

// Photon reverse geocode — used for state detection along route.
// Reverse endpoint is at the root, not under /api/.
export async function reverseGeocode(lat, lon) {
  const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&limit=1&lang=en`
  log.debug('geocoding', `reverseGeocode(${lat.toFixed(4)}, ${lon.toFixed(4)}) via Photon`)

  const res = await fetch(url)
  if (!res.ok) {
    log.error('geocoding', `HTTP ${res.status} for reverseGeocode(${lat}, ${lon})`)
    throw new Error(`Reverse geocoding failed: ${res.status}`)
  }

  const geojson = await res.json()
  const props = geojson.features?.[0]?.properties ?? {}
  // Photon returns state name in `state` for US results
  const state = props.state ?? null
  log.debug('geocoding', `reverseGeocode → state: ${state ?? '(none)'}`)
  return state
}

