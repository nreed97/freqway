import log from '../utils/logger.js'

const NOMINATIM = '/api/nominatim'
const HEADERS = { 'Accept-Language': 'en' }

// Normalise separators and collapse whitespace so queries like
// "9113 NE 105th St; Vancouver, WA" reach the geocoder clean.
function sanitize(q) {
  return q.replace(/[;|]+/g, ',').replace(/,\s*,+/g, ',').trim()
}

// If the query looks like a street address (has digits at the start),
// extract just the city/state tail — everything after the first comma.
// "9113 NE 105th St, Vancouver, WA" → "Vancouver, WA"
function cityStateFromAddress(q) {
  if (!/^\d/.test(q.trim())) return null
  const tail = q.split(',').slice(1).join(',').trim()
  return tail.length > 1 ? tail : null
}

async function nominatimSearch(q) {
  const url = `${NOMINATIM}/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=us,ca`
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`)
  return res.json()
}

export async function geocode(query) {
  const q = sanitize(query)
  log.info('geocoding', `geocode("${q}")`)
  const done = log.timer('geocoding', `geocode("${q}")`)

  let data = await nominatimSearch(q)

  // Full address returned nothing — retry with just the city/state portion.
  if (!data.length) {
    const fallback = cityStateFromAddress(q)
    if (fallback) {
      log.info('geocoding', `no results for full address, retrying with "${fallback}"`)
      data = await nominatimSearch(fallback)
    }
  }

  done({ results: data.length })

  if (!data.length) {
    log.warn('geocoding', `No results for "${q}"`)
    throw new Error(`No results found for "${q}". Try adding a state or province, e.g. "Vancouver, BC" or "Vancouver, WA".`)
  }

  const result = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display: data[0].display_name }
  log.debug('geocoding', `resolved → ${result.lat.toFixed(4)}, ${result.lon.toFixed(4)}`, result)
  return result
}

// ── Autocomplete ─────────────────────────────────────────────────────────────
// Uses Photon (Komoot) — CORS-enabled, no burst limit, OSM-backed.
// For street addresses Photon's index is sparse, so we query with just the
// city/state tail when we detect a house-number prefix.

const PHOTON = 'https://photon.komoot.io/api'
// Bounding box: North America (US + Canada). Eastern cap at -52 covers all
// Canadian Maritime provinces; countrycode filter prevents European results.
const NA_BBOX = '-180,18,-52,84'
// Geographic centre of North America — biases results appropriately.
const NA_BIAS = 'lat=54.0&lon=-96.0'

function photonRank(p) {
  const v = p.osm_value ?? ''
  if (['city', 'town'].includes(v))                           return 0
  if (['village', 'suburb', 'borough', 'hamlet'].includes(v)) return 1
  if (['neighbourhood', 'quarter'].includes(v))               return 2
  if (p.osm_key === 'highway' || p.street)                    return 3
  return 4
}

export async function geocodeSuggest(query) {
  if (!query || query.trim().length < 3) return []

  const q = sanitize(query)
  // If the user typed a full street address, Photon won't find it by number —
  // query the city/state tail so we still return useful place suggestions.
  const photonQ = cityStateFromAddress(q) ?? q

  const url = `${PHOTON}/?q=${encodeURIComponent(photonQ)}&limit=10&lang=en&bbox=${NA_BBOX}&${NA_BIAS}`
  log.debug('geocoding', `suggest("${photonQ}") via Photon`)

  try {
    const res = await fetch(url)
    if (!res.ok) { log.warn('geocoding', `suggest HTTP ${res.status}`); return [] }

    const features = (await res.json()).features ?? []
    log.debug('geocoding', `suggest → ${features.length} raw results`)

    return features
      .filter(f => ['US', 'CA'].includes((f.properties?.countrycode ?? '').toUpperCase()))
      .sort((a, b) => photonRank(a.properties) - photonRank(b.properties))
      .slice(0, 6)
      .map(f => {
        const p = f.properties ?? {}
        const [lon, lat] = f.geometry.coordinates
        // For street-address queries, keep the original house number + street
        // but use the resolved city coords so the route starts in the right spot.
        const short = cityStateFromAddress(q)
          ? buildAddressShort(q, p)
          : buildPhotonShort(p)
        return { lat, lon, display: buildPhotonDisplay(p), short }
      })
  } catch (err) {
    log.warn('geocoding', 'suggest fetch failed', err)
    return []
  }
}

// For a full address query: preserve the street portion, replace city/state
// with the Photon-resolved name so display is unambiguous.
function buildAddressShort(originalQ, p) {
  const streetPart = originalQ.split(',')[0].trim()
  const city  = p.city ?? p.county ?? p.name ?? ''
  const state = p.state ?? ''
  return [streetPart, city, state].filter(Boolean).join(', ')
}

function buildPhotonShort(p) {
  const name  = p.name ?? ''
  const city  = p.city ?? p.county ?? ''
  const state = p.state ?? ''
  const placePart = (name && name !== city) ? name : (city || name)
  const cityPart  = (name && name !== city) ? city : ''
  return [placePart, cityPart, state].filter(Boolean).join(', ')
}

function buildPhotonDisplay(p) {
  const country = (p.countrycode ?? '').toUpperCase() === 'CA' ? 'Canada' : 'USA'
  return [p.name, p.housenumber, p.street, p.city ?? p.county, p.state, country]
    .filter(Boolean)
    .join(', ')
}

// Photon reverse geocode — returns city, state string for a coordinate.
export async function reverseGeocodeCity(lat, lon) {
  const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&limit=1&lang=en`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Reverse geocoding failed: ${res.status}`)
  const props = (await res.json()).features?.[0]?.properties ?? {}
  const city = props.city ?? props.name ?? props.county ?? null
  const state = props.state ?? null
  return [city, state].filter(Boolean).join(', ') || null
}

// Photon reverse geocode — used for state detection along route.
export async function reverseGeocode(lat, lon) {
  const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&limit=1&lang=en`
  log.debug('geocoding', `reverseGeocode(${lat.toFixed(4)}, ${lon.toFixed(4)})`)

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Reverse geocoding failed: ${res.status}`)

  const props = (await res.json()).features?.[0]?.properties ?? {}
  const state = props.state ?? null
  log.debug('geocoding', `reverseGeocode → state: ${state ?? '(none)'}`)
  return state
}
