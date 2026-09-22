import { useEffect, useState } from 'react'
import { saveChoice } from '../lib/storage'

export type Theme = 'light' | 'dark'

const systemDark = window.matchMedia('(prefers-color-scheme: dark)')

/** The stamped choice (see public/theme.js) if there is one, otherwise the system's. */
function currentTheme(): Theme {
  const stamped = document.documentElement.dataset.theme
  if (stamped === 'light' || stamped === 'dark') return stamped
  return systemDark.matches ? 'dark' : 'light'
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState(currentTheme)

  // Until the visitor picks a theme, follow the system when it changes.
  useEffect(() => {
    const follow = () => setTheme(currentTheme())
    systemDark.addEventListener('change', follow)
    return () => systemDark.removeEventListener('change', follow)
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    saveChoice('theme', next)
    setTheme(next)
  }

  return [theme, toggle]
}
