import { AppShell, rem, useMantineTheme, useMatches } from '@mantine/core'
import { ErrorBoundary, Footer, Header } from '@components'
import { Outlet } from 'react-router-dom'

export const PageLayout = () => {
  const theme = useMantineTheme()
  const headerHeight = useMatches({
    base: 40,
    lg: 60,
  })

  return (
    <AppShell header={{ height: { base: 40, lg: 60 } }} padding='xl' withBorder={false}>
      <AppShell.Header pl={`calc(var(--mantine-spacing-xl))`} bg='yellow'>
        <ErrorBoundary>
          <Header />
        </ErrorBoundary>
      </AppShell.Header>
      <AppShell.Main pt={`calc(${rem(headerHeight)} + var(--mantine-spacing-xl))`} bg={theme.other.backgroundColor}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </AppShell.Main>
      <AppShell.Footer bg={theme.other.backgroundColor} px='md' pb='xs'>
        <Footer />
      </AppShell.Footer>
    </AppShell>
  )
}
