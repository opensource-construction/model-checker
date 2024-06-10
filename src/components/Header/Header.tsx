import oscLogo from 'assets/osc_logo.png'
import { Group, Title, UnstyledButton } from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export const Header = () => {
  const navigate = useNavigate()
  const { i18n } = useTranslation()

  return (
    <Group justify='space-between'>
      <UnstyledButton onClick={() => navigate('/')}>
        <Group pt={8}>
          <img src={oscLogo} alt={'opensource.construction'} style={{ maxHeight: '36px' }} />
          <Title order={3}>IFC Model Checker</Title>
        </Group>
      </UnstyledButton>
      <UnstyledButton onClick={() => i18n.changeLanguage(i18n.resolvedLanguage === 'en' ? 'en' : 'de')} mr='md'>
        {i18n.resolvedLanguage?.toUpperCase()}
      </UnstyledButton>
    </Group>
  )
}
