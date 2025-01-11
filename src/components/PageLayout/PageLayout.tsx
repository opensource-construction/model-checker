import { AppShell, rem, useMantineTheme, useMatches } from '@mantine/core'
import { ErrorBoundary, Footer, Header } from '@components'
import { Outlet } from 'react-router-dom'

export const PageLayout = () => {
  const theme = useMantineTheme()
  const headerHeight = useMatches({
    base: 40,
    lg: 60,
  })
  const padding = useMatches({ base: 'lg', lg: 'xl' })

  return (
    <AppShell header={{ height: { base: 40, lg: 60 } }} padding={padding} withBorder={false} footer={{ height: 40 }}>
      <AppShell.Header
        pl={`calc(var(--mantine-spacing-xl))`}
        bg='yellow'
        style={{ display: 'flex', alignItems: 'center' }}
      >
        <ErrorBoundary>
          <Header />
        </ErrorBoundary>
      </AppShell.Header>
      <AppShell.Main
        py={`calc(${rem(headerHeight)} + var(--mantine-spacing-${padding}))`}
        bg={theme.other.backgroundColor}
      >
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </AppShell.Main>
      <AppShell.Footer
        px='md'
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--mantine-color-gray-0)',
          height: 40,
        }}
      >
        <Footer />
      </AppShell.Footer>
    </AppShell>
  )
}
