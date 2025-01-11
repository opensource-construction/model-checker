import oscLogo from 'assets/osc_logo.png'
import { Group, Title, UnstyledButton, useMatches } from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle'

export const Header = () => {
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const imageHeight = useMatches({
    base: '24px',
    lg: '36px',
  })

  return (
    <Group h='100%' w='100%' justify='space-between' align='center' style={{ flexWrap: 'nowrap' }}>
      <UnstyledButton onClick={() => navigate('/')} style={{ height: '100%', display: 'flex', alignItems: 'center' }}>
        <Group gap='xs' wrap='nowrap'>
          <img src={oscLogo} alt={'opensource.construction'} style={{ maxHeight: imageHeight }} />
          <Title order={4} style={{ whiteSpace: 'nowrap' }}>
            IFC Model Checker
          </Title>
        </Group>
      </UnstyledButton>
      <Group gap='xs' wrap='nowrap' pr='xl'>
        <ThemeToggle />
        <UnstyledButton
          onClick={() => i18n.changeLanguage(i18n.resolvedLanguage === 'en' ? 'de' : 'en')}
          style={{ height: '100%', display: 'flex', alignItems: 'center' }}
        >
          {i18n.resolvedLanguage === 'en' ? 'DE' : 'EN'}
        </UnstyledButton>
      </Group>
    </Group>
  )
}
