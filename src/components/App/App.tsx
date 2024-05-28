import { AppShell, MantineProvider, rem } from '@mantine/core'
import { AppRouter, ErrorBoundary, Header, Loading, theme } from '@components'
import '@fontsource/poppins'
import '@mantine/core/styles.css'
import '@mantine/dropzone/styles.css'
import '@mantine/charts/styles.css'
import '../Translation'
import { Suspense } from 'react'

export const App = () => (
  <MantineProvider theme={theme}>
    <Suspense fallback={<Loading />}>
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
    </Suspense>
  </MantineProvider>
)
