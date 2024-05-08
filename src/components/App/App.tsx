import { AppShell, MantineProvider, rem } from '@mantine/core'
import { AppRouter, ErrorBoundary, theme, Header } from '@components'
import '@fontsource/poppins'
import '@mantine/core/styles.css'
import '@mantine/dropzone/styles.css'

export const App = () => (
  <MantineProvider theme={theme}>
    <AppShell header={{ height: 60 }} padding='xl' withBorder={true}>
      <AppShell.Header pl={`calc(var(--mantine-spacing-xl))`} bg='#ffff'>
        <ErrorBoundary>
          <Header />
        </ErrorBoundary>
      </AppShell.Header>
      <AppShell.Main pt={`calc(${rem(40)} + var(--mantine-spacing-xl))`} bg='#fafbff'>
        <ErrorBoundary>
          <AppRouter />
        </ErrorBoundary>
      </AppShell.Main>
    </AppShell>
  </MantineProvider>
)
