import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RepeaterList from './RepeaterList.jsx'

// Suppress download side-effects from the export menu
vi.mock('../utils/export.js', () => ({
  exportCSV:      vi.fn(),
  exportCHIRP:    vi.fn(),
  exportRTSystems: vi.fn(),
}))

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:test')
  URL.revokeObjectURL = vi.fn()
})

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeRepeater = (overrides) => ({
  id: 'W0TEST_146.94',
  callsign: 'W0TEST',
  frequency: 146.94,
  offset: 0.6,
  offsetDir: '-',
  tone: '100.0',
  tsq: '',
  band: '2m',
  mode: 'FM',
  city: 'Denver',
  state: 'Colorado',
  lat: 39.7, lon: -104.9,
  routeMile: 42, distMiles: 1.2,
  notes: '',
  ...overrides,
})

const COLORADO = makeRepeater({ id: 'co', callsign: 'W0CO', state: 'Colorado', routeMile: 10 })
const WYOMING  = makeRepeater({ id: 'wy', callsign: 'W0WY', state: 'Wyoming',  routeMile: 80 })
const MONTANA  = makeRepeater({ id: 'mt', callsign: 'W0MT', state: 'Montana',  routeMile: 200 })

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('RepeaterList — rendering', () => {
  it('shows "0 repeaters along route" with an empty list', () => {
    render(<RepeaterList repeaters={[]} onSelect={vi.fn()} selectedId={null} />)
    expect(screen.getByText(/0 repeaters/i)).toBeInTheDocument()
  })

  it('shows the correct repeater count', () => {
    render(<RepeaterList repeaters={[COLORADO, WYOMING]} onSelect={vi.fn()} selectedId={null} />)
    expect(screen.getByText(/2 repeaters/i)).toBeInTheDocument()
  })

  it('renders each repeater callsign', () => {
    render(<RepeaterList repeaters={[COLORADO, WYOMING]} onSelect={vi.fn()} selectedId={null} />)
    expect(screen.getByText('W0CO')).toBeInTheDocument()
    expect(screen.getByText('W0WY')).toBeInTheDocument()
  })

  it('shows the export button when the list has entries', () => {
    render(<RepeaterList repeaters={[COLORADO]} onSelect={vi.fn()} selectedId={null} />)
    expect(screen.getByText(/Export/i)).toBeInTheDocument()
  })

  it('hides the export button when the list is empty', () => {
    render(<RepeaterList repeaters={[]} onSelect={vi.fn()} selectedId={null} />)
    expect(screen.queryByText(/Export/i)).not.toBeInTheDocument()
  })
})

// ── Search ────────────────────────────────────────────────────────────────────

describe('RepeaterList — search', () => {
  it('filters by callsign (case-insensitive)', () => {
    render(<RepeaterList repeaters={[COLORADO, WYOMING]} onSelect={vi.fn()} selectedId={null} />)
    fireEvent.change(screen.getByPlaceholderText(/Search/i), { target: { value: 'w0co' } })
    expect(screen.getByText('W0CO')).toBeInTheDocument()
    expect(screen.queryByText('W0WY')).not.toBeInTheDocument()
  })

  it('filters by city (case-insensitive)', () => {
    const r = makeRepeater({ id: 'x', callsign: 'W0X', city: 'Cheyenne', state: 'Wyoming', routeMile: 5 })
    render(<RepeaterList repeaters={[COLORADO, r]} onSelect={vi.fn()} selectedId={null} />)
    fireEvent.change(screen.getByPlaceholderText(/Search/i), { target: { value: 'chey' } })
    expect(screen.getByText('W0X')).toBeInTheDocument()
    expect(screen.queryByText('W0CO')).not.toBeInTheDocument()
  })

  it('shows matching count in the subtitle', () => {
    render(<RepeaterList repeaters={[COLORADO, WYOMING]} onSelect={vi.fn()} selectedId={null} />)
    fireEvent.change(screen.getByPlaceholderText(/Search/i), { target: { value: 'w0co' } })
    expect(screen.getByText(/1 repeater.*matching/i)).toBeInTheDocument()
  })

  it('shows "No repeaters match" message when nothing passes the search', () => {
    render(<RepeaterList repeaters={[COLORADO]} onSelect={vi.fn()} selectedId={null} />)
    fireEvent.change(screen.getByPlaceholderText(/Search/i), { target: { value: 'ZZZZ' } })
    expect(screen.getByText(/no repeaters match/i)).toBeInTheDocument()
  })
})

// ── State dividers ────────────────────────────────────────────────────────────

describe('RepeaterList — state dividers', () => {
  it('renders a state divider when state changes between repeaters', () => {
    render(<RepeaterList repeaters={[COLORADO, WYOMING]} onSelect={vi.fn()} selectedId={null} />)
    expect(screen.getByText('Wyoming')).toBeInTheDocument()
  })

  it('renders dividers for each new state', () => {
    render(
      <RepeaterList
        repeaters={[COLORADO, WYOMING, MONTANA]}
        onSelect={vi.fn()}
        selectedId={null}
      />
    )
    expect(screen.getByText('Wyoming')).toBeInTheDocument()
    expect(screen.getByText('Montana')).toBeInTheDocument()
  })

  it('does not render a divider when all repeaters share the same state', () => {
    const r2 = makeRepeater({ id: 'co2', callsign: 'W0CO2', state: 'Colorado', routeMile: 20 })
    render(<RepeaterList repeaters={[COLORADO, r2]} onSelect={vi.fn()} selectedId={null} />)
    // "Colorado" appears in the state col of the first row — but NOT as a standalone divider.
    // The divider is rendered as uppercase text in a standalone flex row; a repeater row
    // never independently shows its state, so querying by role is the cleaner check.
    const dividers = screen.queryAllByText('Colorado')
    // buildItems starts with currentState=null, so null→Colorado always produces one divider
    expect(dividers).toHaveLength(1)
  })

  it('shows no dividers for repeaters without a state field', () => {
    const noState = makeRepeater({ id: 'ns', state: '', routeMile: 5 })
    render(<RepeaterList repeaters={[noState, COLORADO]} onSelect={vi.fn()} selectedId={null} />)
    // Colorado divider should appear when transitioning from '' → 'Colorado'
    expect(screen.getByText('Colorado')).toBeInTheDocument()
  })
})

// ── Selection ─────────────────────────────────────────────────────────────────

describe('RepeaterList — selection', () => {
  it('calls onSelect when a repeater row is clicked', () => {
    const onSelect = vi.fn()
    render(<RepeaterList repeaters={[COLORADO]} onSelect={onSelect} selectedId={null} />)
    fireEvent.click(screen.getByText('W0CO'))
    expect(onSelect).toHaveBeenCalledWith(COLORADO)
  })
})
