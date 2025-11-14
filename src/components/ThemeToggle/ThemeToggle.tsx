import { useTheme } from '@context'
import { IconSun, IconMoon, IconDeviceDesktop } from '@tabler/icons-react'
import './ThemeToggle.css'

export const ThemeToggle = () => {
  const { mode, isDarkMode, setTheme } = useTheme()

  const cycleMode = () => {
    if (mode === 'system') setTheme('light')
    else if (mode === 'light') setTheme('dark')
    else setTheme('system')
  }

  return (
    <button onClick={cycleMode} className='theme-toggle' title={`Theme: ${mode}. Click to change`}>
      <div className={`toggle-wrapper ${isDarkMode ? 'dark' : ''} ${mode === 'system' ? 'system' : ''}`}>
        <div className='icons'>
          <IconSun className='sun-icon' size={24} stroke={2} />
          <IconMoon className='moon-icon' size={24} stroke={2} />
          <IconDeviceDesktop className='system-icon' size={24} stroke={2} />
        </div>
      </div>
    </button>
  )
}
