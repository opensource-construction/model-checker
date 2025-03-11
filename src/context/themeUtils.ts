import { useContext } from 'react'
import { ThemeContext } from './ThemeContext'

/**
 * Hook to access the theme context
 * @returns The theme context containing isDarkMode and toggleTheme
 */
export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
