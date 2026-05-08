// Debug logger — enable via localStorage or URL flag
// Usage: log.info('geocoding', 'fetching', { url })
// Toggle: localStorage.setItem('freqway_debug', '1') then reload

const ENABLED =
  typeof localStorage !== 'undefined' && localStorage.getItem('freqway_debug') === '1' ||
  typeof location !== 'undefined' && location.search.includes('debug=1') ||
  import.meta.env.DEV && typeof localStorage !== 'undefined' && localStorage.getItem('freqway_debug') !== '0'

const NS_COLORS = {
  geocoding:     '#60a5fa',
  routing:       '#34d399',
  stateDetect:   '#a78bfa',
  repeaterbook:  '#fb923c',
  corridor:      '#f472b6',
  app:           '#94a3b8',
}

function color(ns) {
  return NS_COLORS[ns] ?? '#94a3b8'
}

function ts() {
  return new Date().toISOString().slice(11, 23)  // HH:MM:SS.mmm
}

function emit(level, ns, msg, data) {
  if (!ENABLED) return
  const c = color(ns)
  const prefix = `%c[${ts()}] [${ns}]%c ${msg}`
  const styles = [`color:${c};font-weight:bold`, 'color:inherit']

  if (data !== undefined) {
    console[level]?.(prefix, ...styles, data) ?? console.log(prefix, ...styles, data)
  } else {
    console[level]?.(prefix, ...styles) ?? console.log(prefix, ...styles)
  }
}

// Timing helper — returns a done() fn that logs elapsed ms
function timer(ns, label) {
  const start = performance.now()
  return (extra) => {
    const ms = (performance.now() - start).toFixed(1)
    emit('debug', ns, `${label} — ${ms}ms`, extra)
  }
}

const log = {
  debug: (ns, msg, data) => emit('debug', ns, msg, data),
  info:  (ns, msg, data) => emit('info',  ns, msg, data),
  warn:  (ns, msg, data) => emit('warn',  ns, msg, data),
  error: (ns, msg, data) => emit('error', ns, msg, data),
  timer,

  // Group related log lines under a collapsible console group
  group: (ns, label, fn) => {
    if (!ENABLED) return fn()
    console.groupCollapsed(`%c[${ns}] ${label}`, `color:${color(ns)};font-weight:bold`)
    const result = fn()
    if (result instanceof Promise) {
      return result.finally(() => console.groupEnd())
    }
    console.groupEnd()
    return result
  },

  // Expose enable/disable helpers to the browser console
  enable:  () => { localStorage.setItem('freqway_debug', '1');  console.info('Freqway debug logging ENABLED — reload to apply.') },
  disable: () => { localStorage.setItem('freqway_debug', '0');  console.info('Freqway debug logging DISABLED — reload to apply.') },
}

// Attach to window so devs can call freqway.log.enable() in the console
if (typeof window !== 'undefined') {
  window.freqway = { log }
}

export default log
