import oscLogo from 'assets/osc_logo.png'
import { Group, Menu, Title, UnstyledButton, useMatches } from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle'
import { IconChevronDown } from '@tabler/icons-react'

export const Header = () => {
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const imageHeight = useMatches({
    base: '24px',
    lg: '36px',
  })

  // Define all supported languages
  const languages = {
    en: 'English',
    de: 'Deutsch',
    fr: 'Français',
    it: 'Italiano',
    rm: 'Rumantsch',
  }

  return (
    <Group h='100%' w='100%' justify='space-between' align='center' style={{ flexWrap: 'nowrap', padding: 0 }}>
      <UnstyledButton
        onClick={() => navigate('/')}
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          marginLeft: 0,
          paddingLeft: '12px',
        }}
      >
        <Group gap='xs' wrap='nowrap' pl={0} style={{ marginLeft: 0 }}>
          <img src={oscLogo} alt={'opensource.construction'} style={{ maxHeight: imageHeight }} />
          <Title order={4} style={{ whiteSpace: 'nowrap' }}>
            IFC Model Checker
          </Title>
        </Group>
      </UnstyledButton>
      <Group gap='xs' wrap='nowrap' pr='md' style={{ marginLeft: 'auto' }}>
        <ThemeToggle />
        <Menu>
          <Menu.Target>
            <UnstyledButton>
              <Group gap={4}>
                {languages[i18n.resolvedLanguage as keyof typeof languages] || 'English'}
                <IconChevronDown size={14} />
              </Group>
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
            {Object.entries(languages).map(([code, label]) => (
              <Menu.Item
                key={code}
                onClick={() => i18n.changeLanguage(code)}
                fw={code === i18n.resolvedLanguage ? 700 : 400}
              >
                {label}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  )
}
