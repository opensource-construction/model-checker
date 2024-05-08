/// <reference types="vite-plugin-svgr/client" />
import AppLogo from '../../assets/app_logo.svg?react'
import { Group, Title, UnstyledButton } from '@mantine/core'
import { useNavigate } from 'react-router-dom'

export const Header = () => {
  const navigate = useNavigate()
  const size = 36

  return (
    <UnstyledButton onClick={() => navigate('/')}>
      <Group pt={8}>
        <AppLogo width={size} height={size} />
        <Title order={3}>IFC Model Checker</Title>
      </Group>
    </UnstyledButton>
  )
}
