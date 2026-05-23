import { useState, useEffect, useRef } from 'react'
import { geocodeSuggest } from '../services/geocoding.js'
import log from '../utils/logger.js'

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function AddressInput({ label, value, onChange, onSelect, disabled, placeholder, onLocate, locating }) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(-1)
  const [fetching, setFetching] = useState(false)
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)
  const pickedValueRef = useRef(value)  // suppress fetch for pre-populated values (e.g. from URL params)

  const debounced = useDebounce(value, 500)

  // Fetch suggestions when debounced input changes
  useEffect(() => {
    // Value came from pickSuggestion — don't re-query for it
    if (debounced === pickedValueRef.current) {
      pickedValueRef.current = null
      return
    }

    if (debounced.trim().length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }

    // Cancel previous in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setFetching(true)
    log.debug('geocoding', `autocomplete query: "${debounced}"`)

    geocodeSuggest(debounced)
      .then(results => {
        if (controller.signal.aborted) return
        setSuggestions(results)
        setOpen(results.length > 0)
        setCursor(-1)
      })
      .finally(() => {
        if (!controller.signal.aborted) setFetching(false)
      })

    return () => controller.abort()
  }, [debounced])

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (!containerRef.current?.contains(e.target)) {
        setOpen(false)
        setCursor(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleKeyDown(e) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor(c => Math.min(c + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor(c => Math.max(c - 1, -1))
    } else if (e.key === 'Enter') {
      if (cursor >= 0 && suggestions[cursor]) {
        e.preventDefault()
        pickSuggestion(suggestions[cursor])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setCursor(-1)
    }
  }

  function pickSuggestion(s) {
    log.info('geocoding', `autocomplete selected: "${s.short}"`, { lat: s.lat, lon: s.lon })
    pickedValueRef.current = s.short  // tell the debounce effect to skip this value
    onChange(s.short)
    onSelect?.({ lat: s.lat, lon: s.lon, display: s.display })
    setSuggestions([])
    setOpen(false)
    setCursor(-1)
    inputRef.current?.blur()
  }

  function handleChange(e) {
    onChange(e.target.value)
    onSelect?.(null)  // clear pre-resolved coord when user types
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder ?? 'City, address, or lat,lon'}
          disabled={disabled}
          autoComplete="off"
          className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-7"
        />
        {(fetching || locating) ? (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : onLocate ? (
          <button
            type="button"
            onClick={onLocate}
            disabled={disabled}
            title="Use my location"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400 transition-colors disabled:opacity-40"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>
            </svg>
          </button>
        ) : null}
      </div>

      {open && (
        <ul className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded-md shadow-xl overflow-hidden text-sm">
          {suggestions.map((s, i) => (
            <li
              key={`${s.lat}_${s.lon}_${i}`}
              onMouseDown={e => { e.preventDefault(); pickSuggestion(s) }}
              onMouseEnter={() => setCursor(i)}
              className={`px-3 py-2 cursor-pointer transition-colors ${
                i === cursor ? 'bg-blue-700 text-white' : 'text-slate-200 hover:bg-slate-700'
              }`}
            >
              <div className="font-medium truncate">{s.short}</div>
              <div className="text-xs text-slate-400 truncate">{s.display}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
