/// <reference types="vite-plugin-svgr/client" />
import AppLogo from '../../assets/app_logo.svg?react'
import { Group, Title, UnstyledButton } from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export const Header = () => {
  const navigate = useNavigate()
  const { i18n} = useTranslation()
  const size = 36

  return (
    <Group justify='space-between'>
      <UnstyledButton onClick={() => navigate('/')}>
        <Group pt={8}>
          <AppLogo width={size} height={size} />
          <Title order={3}>IFC Model Checker</Title>
        </Group>
      </UnstyledButton>
      <UnstyledButton onClick={() => i18n.changeLanguage(i18n.resolvedLanguage === 'en'? 'de': 'en')} mr='md'>
        {i18n.resolvedLanguage?.toUpperCase()}
      </UnstyledButton>
    </Group>
  )
}
