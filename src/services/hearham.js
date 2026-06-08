import log from '../utils/logger.js'

const HEARHAM_URL = '/api/hearham'
const CACHE_KEY = 'freqway_hearham_v3'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

let _memCache = null

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { ts, data } = JSON.parse(raw)
    const ageMin = Math.round((Date.now() - ts) / 60000)
    if (Date.now() - ts > CACHE_TTL_MS) {
      log.debug('hearham', `cache EXPIRED (age: ${ageMin}m)`)
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    log.debug('hearham', `cache HIT (age: ${ageMin}m, ${data.length} repeaters)`)
    return data
  } catch {
    return null
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }))
    log.debug('hearham', `cached ${data.length} repeaters`)
  } catch (err) {
    log.warn('hearham', 'localStorage quota exceeded — skipping cache', err)
  }
}

function normalizeRepeater(r) {
  const freqMHz = r.frequency / 1e6
  const offsetMHz = r.offset / 1e6
  return {
    callsign: r.callsign ?? '',
    frequency: freqMHz,
    offset: Math.abs(offsetMHz),
    offsetDir: offsetMHz > 0 ? '+' : offsetMHz < 0 ? '-' : '',
    tone: r.encode ?? '',
    tsq: r.decode ?? '',
    lat: r.latitude,
    lon: r.longitude,
    city: r.city ?? '',
    band: bandFromFreq(freqMHz),
    mode: modeFromStr(r.mode),
    operational: r.operational === 1,
    use: r.restriction ? 'MEMBERS' : 'OPEN',
    state: r.state ?? '',
    notes: r.description ?? '',
    irlp: r.irlp_node ?? r.irlp ?? null,
    echolink: r.echolink_node ?? r.echolink ?? null,
    allstar: r.allstar_node ?? r.allstar ?? null,
    id: `${r.callsign ?? r.id}_${freqMHz}`,
  }
}

function bandFromFreq(freq) {
  if (freq >= 144 && freq <= 148) return '2m'
  if (freq >= 222 && freq <= 225) return '1.25m'
  if (freq >= 420 && freq <= 450) return '70cm'
  if (freq >= 28 && freq <= 29.7) return '10m'
  if (freq >= 50 && freq <= 54) return '6m'
  if (freq >= 1240 && freq <= 1300) return '23cm'
  return 'other'
}

function modeFromStr(mode) {
  const m = (mode ?? '').toUpperCase()
  if (m === 'DMR') return 'DMR'
  if (m === 'P25' || m === 'APCO P-25') return 'P25'
  if (m === 'FUSION' || m === 'YSF') return 'Fusion'
  if (m === 'D-STAR' || m === 'DSTAR') return 'D-STAR'
  if (m === 'NXDN') return 'NXDN'
  return 'FM'
}

export async function fetchAllRepeaters(onProgress) {
  if (_memCache) {
    log.debug('hearham', `memory cache hit (${_memCache.length} repeaters)`)
    return _memCache
  }

  const cached = readCache()
  if (cached) {
    _memCache = cached
    onProgress?.(`Loaded ${cached.length} repeaters from cache`)
    return cached
  }

  onProgress?.('Downloading repeater database…')
  log.info('hearham', 'fetching full HearHam database')
  const done = log.timer('hearham', 'fetch all')

  const res = await fetch(HEARHAM_URL)
  if (!res.ok) throw new Error(`HearHam fetch failed: ${res.status}`)

  const raw = await res.json()
  done({ total: raw.length })

  const normalized = raw.map(normalizeRepeater)
  log.info('hearham', `normalized ${normalized.length} repeaters`)

  _memCache = normalized
  writeCache(normalized)
  return normalized
}
