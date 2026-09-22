// Applies the saved theme before first paint, so the page never flashes the
// wrong one. Lives in its own file because the page's CSP forbids inline scripts.
try {
  const theme = localStorage.getItem('theme')
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme
} catch {
  // Storage is unavailable (private mode): follow the system theme.
}
