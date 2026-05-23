import '@testing-library/jest-dom'

// Vitest 4 provides a non-functional localStorage stub in jsdom — replace it.
if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') {
  const store = new Map()
  global.localStorage = {
    getItem:    (k)    => store.get(String(k)) ?? null,
    setItem:    (k, v) => store.set(String(k), String(v)),
    removeItem: (k)    => store.delete(String(k)),
    clear:      ()     => store.clear(),
    key:        (i)    => ([...store.keys()][i] ?? null),
    get length()       { return store.size },
  }
}
