import log from '../utils/logger.js'
import { reverseGeocode } from './geocoding.js'

const STATE_ALIASES = {
  'Alabama': 'Alabama', 'Alaska': 'Alaska', 'Arizona': 'Arizona',
  'Arkansas': 'Arkansas', 'California': 'California', 'Colorado': 'Colorado',
  'Connecticut': 'Connecticut', 'Delaware': 'Delaware', 'Florida': 'Florida',
  'Georgia': 'Georgia', 'Hawaii': 'Hawaii', 'Idaho': 'Idaho',
  'Illinois': 'Illinois', 'Indiana': 'Indiana', 'Iowa': 'Iowa',
  'Kansas': 'Kansas', 'Kentucky': 'Kentucky', 'Louisiana': 'Louisiana',
  'Maine': 'Maine', 'Maryland': 'Maryland', 'Massachusetts': 'Massachusetts',
  'Michigan': 'Michigan', 'Minnesota': 'Minnesota', 'Mississippi': 'Mississippi',
  'Missouri': 'Missouri', 'Montana': 'Montana', 'Nebraska': 'Nebraska',
  'Nevada': 'Nevada', 'New Hampshire': 'New Hampshire', 'New Jersey': 'New Jersey',
  'New Mexico': 'New Mexico', 'New York': 'New York', 'North Carolina': 'North Carolina',
  'North Dakota': 'North Dakota', 'Ohio': 'Ohio', 'Oklahoma': 'Oklahoma',
  'Oregon': 'Oregon', 'Pennsylvania': 'Pennsylvania', 'Rhode Island': 'Rhode Island',
  'South Carolina': 'South Carolina', 'South Dakota': 'South Dakota',
  'Tennessee': 'Tennessee', 'Texas': 'Texas', 'Utah': 'Utah',
  'Vermont': 'Vermont', 'Virginia': 'Virginia', 'Washington': 'Washington',
  'West Virginia': 'West Virginia', 'Wisconsin': 'Wisconsin', 'Wyoming': 'Wyoming',
}

export async function detectStates(routeCoords) {
  return log.group('stateDetect', `detectStates over ${routeCoords.length} coords`, async () => {
    const SAMPLES = Math.min(20, routeCoords.length)
    const step = Math.max(1, Math.floor(routeCoords.length / SAMPLES))

    const samplePoints = []
    for (let i = 0; i < routeCoords.length; i += step) samplePoints.push(routeCoords[i])
    samplePoints.push(routeCoords[0])
    samplePoints.push(routeCoords[routeCoords.length - 1])

    log.debug('stateDetect', `sampling ${samplePoints.length} points (step=${step})`)

    const states = new Set()
    let pointIdx = 0
    for (const [lat, lon] of samplePoints) {
      pointIdx++
      try {
        const state = await reverseGeocode(lat, lon)
        log.debug('stateDetect', `point ${pointIdx}/${samplePoints.length} (${lat.toFixed(3)},${lon.toFixed(3)}) → ${state ?? '(no state)'}`)
        if (state && STATE_ALIASES[state]) states.add(STATE_ALIASES[state])
      } catch (err) {
        log.warn('stateDetect', `reverseGeocode failed for point ${pointIdx}`, err)
      }
      // Photon is more lenient than Nominatim — 200ms is sufficient
      await new Promise(r => setTimeout(r, 200))
    }

    const result = [...states]
    log.info('stateDetect', `detected ${result.length} states`, result)
    return result
  })
}
