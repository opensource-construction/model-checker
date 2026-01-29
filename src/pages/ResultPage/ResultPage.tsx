import { Paper, ProjectResult } from '@components'
import { Button, Container, Divider, Group, Title, useMatches } from '@mantine/core'
import { useValidationContext } from '@context'
import { useTranslation } from 'react-i18next'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReactToPrint } from 'react-to-print'

export const ResultPage = () => {
  const { state } = useValidationContext()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const contentToPrint = useRef(null)

  // Store current language in a ref to ensure it's up to date
  const currentLanguageRef = useRef(i18n.language)

  // Update ref when language changes
  useEffect(() => {
    currentLanguageRef.current = i18n.language
  }, [i18n.language])

  const handlePrint = useReactToPrint({
    documentTitle: `model_checker_${new Date().toLocaleDateString()}`,
    removeAfterPrint: true,
    content: () => {
      // For basic checking results, we can just print what's currently displayed
      return contentToPrint.current
    },
  })

  useEffect(() => {
    if (!Object.keys(state).length) {
      navigate('/')
    }
  }, [navigate, state])

  return (
    <Container
      mt={0}
      className='ResultPage'
      style={{
        width: '98%',
        maxWidth: '98%',
        margin: '0 auto',
      }}
    >
      <Paper hide={useMatches({ base: true, sm: false })}>
        <Group justify='space-between'>
          <Title order={2}>{t('results')}</Title>
          <Button color='gray.6' mt='md' onClick={() => handlePrint(null, () => contentToPrint.current)}>
            {t('print')}
          </Button>
        </Group>
        <Divider my='sm' style={{ width: '30%' }} />
        {/* @ts-expect-error TS doesn't know about '@page'*/}
        <div ref={contentToPrint} style={{ '@page': { size: 'landscape' } }}>
          {Object.values(state).map((result) => (
            <ProjectResult key={result.name} fileName={result.name} />
          ))}
        </div>
      </Paper>
    </Container>
  )
}
