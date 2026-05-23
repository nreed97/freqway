import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusBar from './StatusBar.jsx'

const ROUTE = { distanceMeters: 160934.4, durationSeconds: 5400 } // 100 mi, 1h30m

describe('StatusBar', () => {
  it('renders nothing route-related when no route is provided', () => {
    render(<StatusBar route={null} repeaterCount={null} status="" />)
    expect(screen.queryByText(/\bmi\b/)).not.toBeInTheDocument()
    expect(screen.queryByText(/\d+h/)).not.toBeInTheDocument()
  })

  it('shows formatted distance', () => {
    render(<StatusBar route={ROUTE} repeaterCount={null} status="" />)
    expect(screen.getByText(/100/)).toBeInTheDocument()
  })

  it('shows formatted duration', () => {
    render(<StatusBar route={ROUTE} repeaterCount={null} status="" />)
    expect(screen.getByText(/1h 30m/)).toBeInTheDocument()
  })

  it('shows repeater count when provided', () => {
    render(<StatusBar route={ROUTE} repeaterCount={42} status="" />)
    expect(screen.getByText(/42 repeaters/)).toBeInTheDocument()
  })

  it('uses singular "repeater" for a count of 1', () => {
    render(<StatusBar route={ROUTE} repeaterCount={1} status="" />)
    expect(screen.getByText(/1 repeater\b/)).toBeInTheDocument()
  })

  it('does not show repeater count when it is null', () => {
    render(<StatusBar route={ROUTE} repeaterCount={null} status="" />)
    expect(screen.queryByText(/repeater/)).not.toBeInTheDocument()
  })

  it('shows a status message', () => {
    render(<StatusBar route={null} repeaterCount={null} status="Loading…" />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows the HearHam and OpenStreetMap attribution links', () => {
    render(<StatusBar route={null} repeaterCount={null} status="" />)
    expect(screen.getByRole('link', { name: /HearHam/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /OpenStreetMap/i })).toBeInTheDocument()
  })

  it('shows the GitHub attribution link', () => {
    render(<StatusBar route={null} repeaterCount={null} status="" />)
    expect(screen.getByRole('link', { name: /GitHub/i })).toBeInTheDocument()
  })
})
