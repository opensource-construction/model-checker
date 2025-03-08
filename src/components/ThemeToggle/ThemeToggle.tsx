import { useTheme } from '@context'
import { IconSun, IconMoon } from '@tabler/icons-react'
import './ThemeToggle.css'

export const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className='theme-toggle'
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className={`toggle-wrapper ${isDarkMode ? 'dark' : ''}`}>
        <div className='icons'>
          <IconSun className='sun-icon' size={24} stroke={2} />
          <IconMoon className='moon-icon' size={24} stroke={2} />
        </div>
      </div>
    </button>
  )
}
