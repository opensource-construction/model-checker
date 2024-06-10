import oscLogo from 'assets/osc_logo.png'
import { Group, Title, UnstyledButton, useMatches } from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export const Header = () => {
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const imageHeight = useMatches({
    base: '24px',
    lg: '36px',
  })

  return (
    <Group justify='space-between'>
      <UnstyledButton onClick={() => navigate('/')}>
        <Group pt={8}>
          <img src={oscLogo} alt={'opensource.construction'} style={{ maxHeight: imageHeight }} />
          <Title order={4}>IFC Model Checker</Title>
        </Group>
      </UnstyledButton>
      <UnstyledButton onClick={() => i18n.changeLanguage(i18n.resolvedLanguage === 'en' ? 'de' : 'en')} mr='md'>
        {i18n.resolvedLanguage === 'en' ? 'DE' : 'EN'}
      </UnstyledButton>
    </Group>
  )
}
