import { MantineProvider } from '@mantine/core'
import { AppRouter, Loading, theme } from '@components'
import '@fontsource/poppins'
import '@mantine/core/styles.css'
import '@mantine/dropzone/styles.css'
import '@mantine/charts/styles.css'
import '../Translation'
import { Suspense } from 'react'

export const App = () => (
  <MantineProvider theme={theme} defaultColorScheme='light'>
    <Suspense fallback={<Loading />}>
      <AppRouter />
    </Suspense>
  </MantineProvider>
)
