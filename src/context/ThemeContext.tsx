import { createContext, useState, useEffect, ReactNode, useMemo } from 'react'

type ThemeMode = 'light' | 'dark' | 'system'

type ThemeContextType = {
  mode: ThemeMode
  effectiveMode: 'light' | 'dark'
  isDarkMode: boolean
  setTheme: (mode: ThemeMode) => void
  // kept for backwards compatibility with existing components; toggles between light/dark
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

const getInitialMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'system'
  const saved = window.localStorage.getItem('theme')
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  if (saved) return saved === 'dark' ? 'dark' : 'light'
  return 'system'
}

const getInitialSystemPrefersDark = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [mode, setMode] = useState<ThemeMode>(getInitialMode)
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(getInitialSystemPrefersDark)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (event: MediaQueryListEvent | MediaQueryList) => {
      const matches = 'matches' in event ? event.matches : (event as MediaQueryList).matches
      setSystemPrefersDark(matches)
    }
    // initialize in case it changed before mount
    handler(mql)
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handler as (e: Event) => void)
      return () => mql.removeEventListener('change', handler as (e: Event) => void)
    } else {
      // Safari < 14
      const legacyMql = mql as MediaQueryList & {
        addListener: (listener: (e: MediaQueryListEvent) => void) => void
        removeListener: (listener: (e: MediaQueryListEvent) => void) => void
      }
      legacyMql.addListener(handler)
      return () => {
        legacyMql.removeListener(handler)
      }
    }
  }, [])

  const effectiveMode: 'light' | 'dark' = useMemo(() => {
    if (mode === 'system') return systemPrefersDark ? 'dark' : 'light'
    return mode
  }, [mode, systemPrefersDark])

  const isDarkMode = effectiveMode === 'dark'

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode)
    localStorage.setItem('theme', mode)
  }, [isDarkMode, mode])

  const setTheme = (next: ThemeMode) => setMode(next)

  const toggleTheme = () => {
    // toggle between explicit light/dark; if currently system, flip based on current effective
    setMode((prev) => {
      if (prev === 'system') return isDarkMode ? 'light' : 'dark'
      return prev === 'dark' ? 'light' : 'dark'
    })
  }

  return (
    <ThemeContext.Provider value={{ mode, effectiveMode, isDarkMode, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
