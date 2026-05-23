import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FilterPanel from './FilterPanel.jsx'

const DEFAULT_FILTERS = {
  bands: ['2m', '70cm'],
  modes: ['FM', 'DMR', 'P25', 'Fusion', 'D-STAR', 'NXDN'],
  operationalOnly: true,
  openOnly: true,
}

describe('FilterPanel', () => {
  it('renders all band buttons', () => {
    render(<FilterPanel filters={DEFAULT_FILTERS} onChange={vi.fn()} />)
    for (const band of ['2m', '70cm', '1.25m', '10m', '6m', '23cm']) {
      expect(screen.getByText(new RegExp(band.replace('.', '\\.')+'(\\s|$|\\()'))).toBeInTheDocument()
    }
  })

  it('renders all mode buttons', () => {
    render(<FilterPanel filters={DEFAULT_FILTERS} onChange={vi.fn()} />)
    for (const mode of ['FM', 'DMR', 'P25', 'Fusion', 'D-STAR', 'NXDN']) {
      expect(screen.getByRole('button', { name: mode })).toBeInTheDocument()
    }
  })

  it('calls onChange with the toggled band removed when an active band is clicked', () => {
    const onChange = vi.fn()
    render(<FilterPanel filters={DEFAULT_FILTERS} onChange={onChange} />)
    fireEvent.click(screen.getByText(/^2m/))
    expect(onChange).toHaveBeenCalledOnce()
    const next = onChange.mock.calls[0][0]
    expect(next.bands).not.toContain('2m')
    expect(next.bands).toContain('70cm')
  })

  it('calls onChange with the band added when an inactive band is clicked', () => {
    const onChange = vi.fn()
    const filters = { ...DEFAULT_FILTERS, bands: ['70cm'] }
    render(<FilterPanel filters={filters} onChange={onChange} />)
    fireEvent.click(screen.getByText(/^2m/))
    const next = onChange.mock.calls[0][0]
    expect(next.bands).toContain('2m')
    expect(next.bands).toContain('70cm')
  })

  it('calls onChange with the toggled mode removed when an active mode is clicked', () => {
    const onChange = vi.fn()
    render(<FilterPanel filters={DEFAULT_FILTERS} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'FM' }))
    const next = onChange.mock.calls[0][0]
    expect(next.modes).not.toContain('FM')
  })

  it('toggles operationalOnly via its checkbox', () => {
    const onChange = vi.fn()
    render(<FilterPanel filters={DEFAULT_FILTERS} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText(/Operational only/i))
    const next = onChange.mock.calls[0][0]
    expect(next.operationalOnly).toBe(false)
  })

  it('toggles openOnly via its checkbox', () => {
    const onChange = vi.fn()
    render(<FilterPanel filters={DEFAULT_FILTERS} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText(/Open use only/i))
    const next = onChange.mock.calls[0][0]
    expect(next.openOnly).toBe(false)
  })

  it('shows band counts when bandCounts prop is provided', () => {
    render(
      <FilterPanel
        filters={DEFAULT_FILTERS}
        onChange={vi.fn()}
        bandCounts={{ '2m': 14, '70cm': 3 }}
      />
    )
    expect(screen.getByText('(14)')).toBeInTheDocument()
    expect(screen.getByText('(3)')).toBeInTheDocument()
  })

  it('does not show counts for bands with no entry in bandCounts', () => {
    render(
      <FilterPanel
        filters={DEFAULT_FILTERS}
        onChange={vi.fn()}
        bandCounts={{ '2m': 5 }}
      />
    )
    // Only the 2m count should appear
    expect(screen.getByText('(5)')).toBeInTheDocument()
    expect(screen.queryByText('(0)')).not.toBeInTheDocument()
  })
})
