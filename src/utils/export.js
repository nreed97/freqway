function csvRow(cells) {
  return cells.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')
}

function csvBlob(header, rows, filename) {
  const content = [header.join(','), ...rows.map(csvRow)].join('\r\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// CHIRP CSV import format
// Ref: https://chirp.danplanet.com/projects/chirp/wiki/Memories
export function exportCHIRP(repeaters) {
  const headers = [
    'Location', 'Name', 'Frequency', 'Duplex', 'Offset',
    'Tone', 'rToneFreq', 'cToneFreq', 'DtcsCode', 'DtcsPolarity',
    'Mode', 'TStep', 'Skip', 'Comment', 'URCALL', 'RPT1CALL', 'RPT2CALL', 'DVCODE',
  ]

  const rows = repeaters.map((r, i) => {
    const duplex = r.offset ? (r.offsetDir === '-' ? '-' : '+') : ''
    const offset = r.offset ? r.offset.toFixed(6) : '0.000000'
    const hasTone = r.tone && parseFloat(r.tone) > 0
    const hasTsq  = r.tsq  && parseFloat(r.tsq)  > 0
    let toneMode = ''
    let cTone = hasTone ? r.tone : '88.5'
    let rTone = hasTsq  ? r.tsq  : (hasTone ? r.tone : '88.5')
    if (hasTone && hasTsq)  toneMode = 'TSQL'
    else if (hasTone)       toneMode = 'Tone'

    return [
      i,
      r.callsign.slice(0, 8),
      r.frequency.toFixed(6),
      duplex,
      offset,
      toneMode,
      rTone,
      cTone,
      '023',
      'NN',
      chirpMode(r.mode),
      '5.00',
      '',
      `${r.callsign} ${r.city}`.trim(),
      '', '', '', '',
    ]
  })

  csvBlob(headers, rows, 'freqway-chirp.csv')
}

function chirpMode(mode) {
  if (mode === 'FM')     return 'FM'
  if (mode === 'DMR')    return 'FM'   // CHIRP doesn't do DMR; import as FM placeholder
  if (mode === 'D-STAR') return 'DV'
  return 'FM'
}

// RT Systems CSV format (generic — compatible with most RT Systems radio software)
// Matches the "Channel Spreadsheet" layout used across ADMS / ARCP / CS series.
export function exportRTSystems(repeaters) {
  const headers = [
    'Channel Number', 'Receive Frequency', 'Transmit Frequency',
    'Offset Direction', 'Operating Mode', 'Name',
    'Tone', 'CTCSS', 'DCS', 'Comment',
  ]

  const rows = repeaters.map((r, i) => {
    const txFreq = r.offset
      ? (r.offsetDir === '-'
          ? (r.frequency - r.offset).toFixed(4)
          : (r.frequency + r.offset).toFixed(4))
      : r.frequency.toFixed(4)
    const dir = r.offset ? (r.offsetDir === '-' ? '-' : '+') : 'Simplex'
    const hasTone = r.tone && parseFloat(r.tone) > 0
    const hasTsq  = r.tsq  && parseFloat(r.tsq)  > 0
    let toneMode = 'None'
    if (hasTone && hasTsq)  toneMode = 'TSQL'
    else if (hasTone)       toneMode = 'CTCSS'

    return [
      i + 1,
      r.frequency.toFixed(4),
      txFreq,
      dir,
      rtMode(r.mode),
      r.callsign.slice(0, 8),
      toneMode,
      hasTone ? r.tone : '',
      '',
      `${r.callsign} ${r.city}`.trim(),
    ]
  })

  csvBlob(headers, rows, 'freqway-rtsystems.csv')
}

function rtMode(mode) {
  if (mode === 'FM' || mode === 'DMR' || mode === 'P25' || mode === 'Fusion' || mode === 'NXDN') return 'FM'
  if (mode === 'D-STAR') return 'DV'
  return 'FM'
}

// Generic / human-readable export (existing behaviour, kept as fallback)
export function exportCSV(repeaters) {
  const headers = [
    'Route mi', 'Off route (mi)', 'Callsign', 'Frequency', 'Offset',
    'Tone', 'TSQ', 'Band', 'Mode', 'City', 'Lat', 'Lon', 'Notes',
  ]

  const rows = repeaters.map(r => [
    r.routeMile?.toFixed(1) ?? '',
    r.distMiles?.toFixed(1) ?? '',
    r.callsign,
    r.frequency?.toFixed(4) ?? '',
    r.offset ? `${r.offsetDir === '-' ? '-' : '+'}${r.offset.toFixed(3)}` : '',
    r.tone ?? '',
    r.tsq ?? '',
    r.band,
    r.mode,
    r.city,
    r.lat?.toFixed(5) ?? '',
    r.lon?.toFixed(5) ?? '',
    r.notes ?? '',
  ])

  csvBlob(headers, rows, 'freqway-repeaters.csv')
}
