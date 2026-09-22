// Preferences are a convenience: when storage is unavailable (private mode,
// blocked site data) the dashboard simply falls back to its defaults.

export function readChoice<T extends string>(key: string, choices: readonly T[], fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return choices.includes(stored as T) ? (stored as T) : fallback
  } catch {
    return fallback
  }
}

export function saveChoice(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Nothing to do: the choice still applies to this visit.
  }
}
