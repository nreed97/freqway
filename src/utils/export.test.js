import { describe, it, expect, beforeAll, vi } from 'vitest'
import { exportCHIRP, exportRTSystems, exportCSV } from './export.js'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const FM_REPEATER = {
  callsign: 'W0TEST',
  frequency: 146.94,
  offset: 0.6,
  offsetDir: '-',
  tone: '100.0',
  tsq: '',
  band: '2m',
  mode: 'FM',
  city: 'Denver',
  lat: 39.7, lon: -104.9,
  routeMile: 42, distMiles: 1.2,
  notes: '',
}

const DMR_REPEATER = {
  callsign: 'W0DMR',
  frequency: 446.075,
  offset: 5,
  offsetDir: '-',
  tone: '',
  tsq: '',
  band: '70cm',
  mode: 'DMR',
  city: 'Boulder',
  lat: 40.0, lon: -105.3,
  routeMile: 18, distMiles: 3.1,
  notes: '',
}

const DSTAR_REPEATER = {
  callsign: 'K0DST',
  frequency: 145.33,
  offset: 0.6,
  offsetDir: '-',
  tone: '',
  tsq: '',
  band: '2m',
  mode: 'D-STAR',
  city: 'Arvada',
  lat: 39.8, lon: -105.1,
  routeMile: 30, distMiles: 0.5,
  notes: 'IRLP node 1234',
}

// ── DOM mocks ─────────────────────────────────────────────────────────────────

let capturedBlob = null
let capturedFilename = null

beforeAll(() => {
  URL.createObjectURL = vi.fn((blob) => { capturedBlob = blob; return 'blob:test' })
  URL.revokeObjectURL = vi.fn()
  HTMLAnchorElement.prototype.click = function () { capturedFilename = this.download }
})

async function runExport(fn, repeaters = [FM_REPEATER]) {
  capturedBlob = null
  capturedFilename = null
  fn(repeaters)
  return capturedBlob ? capturedBlob.text() : Promise.resolve('')
}

// ── CHIRP ─────────────────────────────────────────────────────────────────────

describe('exportCHIRP', () => {
  it('downloads with the correct filename', async () => {
    await runExport(exportCHIRP)
    expect(capturedFilename).toBe('freqway-chirp.csv')
  })

  it('includes the correct header row', async () => {
    const csv = await runExport(exportCHIRP)
    expect(csv).toMatch(/^Location,Name,Frequency,Duplex,Offset/)
  })

  it('writes the repeater callsign and frequency', async () => {
    const csv = await runExport(exportCHIRP)
    expect(csv).toContain('W0TEST')
    expect(csv).toContain('146.940000')
  })

  it('writes negative offset as "-"', async () => {
    const csv = await runExport(exportCHIRP)
    // offset direction column should be "-"
    expect(csv).toContain('"-"')
  })

  it('maps FM mode to FM', async () => {
    const csv = await runExport(exportCHIRP)
    expect(csv).toContain('"FM"')
  })

  it('maps D-STAR mode to DV', async () => {
    const csv = await runExport(exportCHIRP, [DSTAR_REPEATER])
    expect(csv).toContain('"DV"')
  })

  it('encodes a tone-only repeater with Tone mode', async () => {
    const csv = await runExport(exportCHIRP, [FM_REPEATER])
    expect(csv).toContain('"Tone"')
  })

  it('produces one data row per repeater', async () => {
    const csv = await runExport(exportCHIRP, [FM_REPEATER, DMR_REPEATER])
    const lines = csv.trim().split('\r\n')
    expect(lines).toHaveLength(3) // header + 2 data rows
  })
})

// ── RT Systems ────────────────────────────────────────────────────────────────

describe('exportRTSystems', () => {
  it('downloads with the correct filename', async () => {
    await runExport(exportRTSystems)
    expect(capturedFilename).toBe('freqway-rtsystems.csv')
  })

  it('includes the correct header row', async () => {
    const csv = await runExport(exportRTSystems)
    expect(csv).toMatch(/^Channel Number,Receive Frequency,Transmit Frequency/)
  })

  it('computes the transmit frequency for a negative offset', async () => {
    const csv = await runExport(exportRTSystems, [FM_REPEATER])
    // TX = 146.94 - 0.6 = 146.34
    expect(csv).toContain('146.3400')
  })

  it('maps FM/DMR/P25/Fusion/NXDN to FM', async () => {
    const csv = await runExport(exportRTSystems, [DMR_REPEATER])
    expect(csv).toContain('"FM"')
  })

  it('maps D-STAR to DV', async () => {
    const csv = await runExport(exportRTSystems, [DSTAR_REPEATER])
    expect(csv).toContain('"DV"')
  })
})

// ── Generic CSV ───────────────────────────────────────────────────────────────

describe('exportCSV', () => {
  it('downloads with the correct filename', async () => {
    await runExport(exportCSV)
    expect(capturedFilename).toBe('freqway-repeaters.csv')
  })

  it('includes all expected header columns', async () => {
    const csv = await runExport(exportCSV)
    const header = csv.split('\r\n')[0]
    expect(header).toContain('Route mi')
    expect(header).toContain('Callsign')
    expect(header).toContain('Frequency')
    expect(header).toContain('Band')
    expect(header).toContain('Mode')
    expect(header).toContain('City')
    expect(header).toContain('Lat')
    expect(header).toContain('Lon')
  })

  it('writes repeater data correctly', async () => {
    const csv = await runExport(exportCSV)
    expect(csv).toContain('W0TEST')
    expect(csv).toContain('Denver')
    expect(csv).toContain('146.9400')
  })

  it('handles an empty repeater list', async () => {
    const csv = await runExport(exportCSV, [])
    const lines = csv.trim().split('\r\n')
    expect(lines).toHaveLength(1) // header only
  })
})

// ── CSV escaping ─────────────────────────────────────────────────────────────

describe('CSV quoting', () => {
  it('doubles embedded double-quotes', async () => {
    const r = { ...FM_REPEATER, callsign: 'W"TEST' }
    const csv = await runExport(exportCSV, [r])
    expect(csv).toContain('W""TEST')
  })

  it('wraps all data cells in double-quotes', async () => {
    const csv = await runExport(exportCSV, [FM_REPEATER])
    const dataRow = csv.split('\r\n')[1]
    // Every field should be quoted
    expect(dataRow).toMatch(/^"[^"]*"(,"[^"]*")*$/)
  })
})
