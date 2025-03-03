import { FileState } from '@types/FileState'
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
      const worker = new Worker('/pyodideWorker.js')
      
      // Get the current validation state
      const currentState = Object.values(state)[0] as FileState
      
      console.log('ResultPage: Language details:', {
        currentLanguage: currentLanguageRef.current,
        resolvedLanguage: i18n.resolvedLanguage,
        languages: i18n.languages,
        fallbackLng: i18n.options.fallbackLng
      })

      worker.postMessage({
        arrayBuffer: currentState.arrayBuffer,
        idsContent: currentState.idsContent,
        reporterCode: currentState.reporterCode,
        templateContent: currentState.templateContent,
        fileName: currentState.fileName,
        language: currentLanguageRef.current // Use the ref value
      })
      return contentToPrint.current
    }
  })

  useEffect(() => {
    if (!Object.keys(state).length) {
      navigate('/')
    }
  }, [navigate, state])

  return (
    <Container
      mt={36}
      style={{
        width: '98%',
        maxWidth: '98%',
        margin: '36px auto 0',
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
