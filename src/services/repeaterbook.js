import log from '../utils/logger.js'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

function cacheKey(state) {
  return `freqway_rb_${state.toLowerCase().replace(/\s+/g, '_')}`
}

function readCache(state) {
  try {
    const raw = localStorage.getItem(cacheKey(state))
    if (!raw) return null
    const { ts, data } = JSON.parse(raw)
    const ageMin = Math.round((Date.now() - ts) / 60000)
    if (Date.now() - ts > CACHE_TTL_MS) {
      log.debug('repeaterbook', `cache EXPIRED for ${state} (age: ${ageMin}m)`)
      localStorage.removeItem(cacheKey(state))
      return null
    }
    log.debug('repeaterbook', `cache HIT for ${state} (age: ${ageMin}m, ${data.length} repeaters)`)
    return data
  } catch (err) {
    log.warn('repeaterbook', `cache read error for ${state}`, err)
    return null
  }
}

function writeCache(state, data) {
  try {
    localStorage.setItem(cacheKey(state), JSON.stringify({ ts: Date.now(), data }))
    log.debug('repeaterbook', `cached ${data.length} repeaters for ${state}`)
  } catch (err) {
    log.warn('repeaterbook', 'localStorage quota exceeded — skipping cache', err)
  }
}

export async function fetchRepeatersForState(state, onProgress) {
  const cached = readCache(state)
  if (cached) {
    onProgress?.(`${state} (cached)`)
    return cached
  }

  onProgress?.(`Fetching ${state}…`)
  const url = `/api/repeaterbook?state=${encodeURIComponent(state)}`
  log.info('repeaterbook', `fetching ${state}`, { url })
  const done = log.timer('repeaterbook', `fetch ${state}`)

  const res = await fetch(url)
  if (!res.ok) {
    log.error('repeaterbook', `HTTP ${res.status} for ${state}`)
    throw new Error(`RepeaterBook fetch failed for ${state}: ${res.status}`)
  }

  const json = await res.json()
  const repeaters = json.results ?? json ?? []
  log.debug('repeaterbook', `raw response for ${state}`, { count: json.count, raw: repeaters.length })

  const normalized = repeaters.map(normalizeRepeater)
  done({ normalized: normalized.length })
  log.info('repeaterbook', `${state}: ${normalized.length} repeaters normalized`)

  writeCache(state, normalized)
  return normalized
}

export async function fetchRepeatersForStates(states, onProgress) {
  log.info('repeaterbook', `fetchRepeatersForStates: ${states.join(', ')}`)
  const done = log.timer('repeaterbook', `all states (${states.length})`)
  const all = []
  for (const state of states) {
    try {
      const repeaters = await fetchRepeatersForState(state, onProgress)
      all.push(...repeaters)
    } catch (err) {
      log.warn('repeaterbook', `failed for ${state}`, err)
    }
  }
  done({ total: all.length })
  log.info('repeaterbook', `total repeaters fetched: ${all.length}`)
  return all
}

function normalizeRepeater(r) {
  const freq = parseFloat(r['Frequency'] ?? r.frequency ?? 0)
  return {
    callsign: r['Callsign'] ?? r.callsign ?? '',
    frequency: freq,
    offset: parseFloat(r['Input Freq'] ?? r['Offset'] ?? r.offset ?? 0) || offsetFromFreq(freq),
    offsetDir: r['Offset Direction'] ?? (freq > 0 ? offsetDirFromFreq(freq) : ''),
    tone: r['Tone'] ?? r['CTCSS'] ?? r.tone ?? '',
    tsq: r['TSQ'] ?? r['DCS'] ?? r.tsq ?? '',
    lat: parseFloat(r['Latitude'] ?? r.lat ?? 0),
    lon: parseFloat(r['Longitude'] ?? r.lon ?? 0),
    state: r['State'] ?? r.state ?? '',
    city: r['Nearest City'] ?? r['City'] ?? r.city ?? '',
    county: r['County'] ?? r.county ?? '',
    band: normalizeBand(r['Band'] ?? r.band ?? '', freq),
    mode: normalizeMode(r),
    operational: (r['Operational Status'] ?? r.status ?? 'On') === 'On',
    use: r['Use'] ?? r.use ?? 'OPEN',
    notes: r['Notes'] ?? r.notes ?? '',
    id: `${r['Callsign'] ?? ''}_${freq}`,
  }
}

function normalizeBand(band, freq) {
  if (band) {
    if (band.includes('2m') || band === '144') return '2m'
    if (band.includes('70cm') || band.includes('440') || band === '420') return '70cm'
    if (band.includes('1.25') || band.includes('220') || band === '222') return '1.25m'
    if (band.includes('10m') || band === '28') return '10m'
    if (band.includes('6m') || band === '50') return '6m'
    if (band.includes('23cm') || band === '1240') return '23cm'
  }
  if (freq >= 144 && freq <= 148) return '2m'
  if (freq >= 222 && freq <= 225) return '1.25m'
  if (freq >= 420 && freq <= 450) return '70cm'
  if (freq >= 28 && freq <= 29.7) return '10m'
  if (freq >= 50 && freq <= 54) return '6m'
  if (freq >= 1240 && freq <= 1300) return '23cm'
  return 'other'
}

function normalizeMode(r) {
  if (r['DMR'] === 'Yes' || r['DMR'] === '1') return 'DMR'
  if (r['P25'] === 'Yes' || r['P25'] === '1') return 'P25'
  if (r['System Fusion'] === 'Yes' || r['System Fusion'] === '1') return 'Fusion'
  if (r['D-Star'] === 'Yes' || r['D-Star'] === '1') return 'D-STAR'
  if (r['NXDN'] === 'Yes' || r['NXDN'] === '1') return 'NXDN'
  return 'FM'
}

function offsetFromFreq(freq) {
  if (freq >= 144 && freq <= 148) return 0.6
  if (freq >= 222 && freq <= 225) return 1.6
  if (freq >= 420 && freq <= 450) return 5.0
  if (freq >= 1240 && freq <= 1300) return 12.0
  return 0
}

function offsetDirFromFreq(freq) {
  if (freq >= 144 && freq <= 148) return '+'
  if (freq >= 222 && freq <= 225) return '-'
  if (freq >= 420 && freq <= 450) return '-'
  return '+'
}
