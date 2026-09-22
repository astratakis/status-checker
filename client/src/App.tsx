import { useEffect, useState } from 'react'
import { FleetSummary, summarize } from './components/FleetSummary'
import { Icon } from './components/Icon'
import { ServerCard } from './components/ServerCard'
import { ServerTable } from './components/ServerTable'
import { useFleet } from './hooks/useFleet'
import { useTheme } from './hooks/useTheme'
import { CRITICAL_PERCENT, WARNING_PERCENT } from './lib/health'
import { readChoice, saveChoice } from './lib/storage'

const VIEWS = ['cards', 'table'] as const
type View = (typeof VIEWS)[number]

export default function App() {
  const { servers, refreshSeconds, error } = useFleet()
  const [theme, toggleTheme] = useTheme()
  const [view, setView] = useState<View>(() => readChoice('view', VIEWS, 'cards'))
  const summary = summarize(servers)

  // The page's ambient glow follows the health of the fleet.
  useEffect(() => {
    document.documentElement.dataset.fleet = summary.tone
  }, [summary.tone])

  const chooseView = (next: View) => {
    saveChoice('view', next)
    setView(next)
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <img src="/favicon.svg" alt="" width="28" height="28" />
          Status
        </div>
        <div className="controls">
          <div className="segmented" role="group" aria-label="Layout">
            {VIEWS.map((option) => (
              <button key={option} type="button" aria-pressed={view === option} onClick={() => chooseView(option)}>
                <Icon name={option} />
                {option === 'cards' ? 'Cards' : 'Table'}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
        </div>
      </header>

      <FleetSummary servers={servers} summary={summary} refreshSeconds={refreshSeconds} />

      {error && <p className="notice" role="alert">{error}</p>}

      <main>
        {view === 'cards' ? (
          <div className="cards">
            {servers.map((server, index) => (
              // A pause of a few refreshes means missing data, not a flat line.
              <ServerCard key={server.id} server={server} index={index} gapMs={refreshSeconds * 3000} />
            ))}
          </div>
        ) : (
          <ServerTable servers={servers} />
        )}
      </main>

      <footer className="legend">
        Trend lines cover the last 5 minutes on a 0–100% scale. Meters turn amber at {WARNING_PERCENT}% and red at{' '}
        {CRITICAL_PERCENT}%.
      </footer>
    </div>
  )
}
