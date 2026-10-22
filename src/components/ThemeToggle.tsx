import { useTheme } from '../lib/theme'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      className="btn-icon"
      onClick={toggle}
      title={theme === 'dark' ? 'Switch to light pages' : 'Switch to dark pages'}
      aria-label="Toggle light and dark"
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  )
}
