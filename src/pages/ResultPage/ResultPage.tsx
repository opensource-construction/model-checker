import { Paper, ProjectResult } from '@components'
import { Button, Container, Divider, Group, Title } from '@mantine/core'
import { useValidationContext } from '@context'
import { useTranslation } from 'react-i18next'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReactToPrint } from 'react-to-print'

export const ResultPage = () => {
  const { state } = useValidationContext()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const contentToPrint = useRef(null)
  const handlePrint = useReactToPrint({
    documentTitle: `model_checker_${new Date().toLocaleDateString()}`,
    removeAfterPrint: true,
  })

  useEffect(() => {
    if (!Object.keys(state).length) {
      navigate('/')
    }
  }, [navigate, state])

  return (
    <Container mt={36} size='xl'>
      <Paper>
        <Group justify='space-between'>
          <Title order={2}>{t('results')}</Title>
          <Button color='#B2B2B2' mt='md' radius='md' onClick={() => handlePrint(null, () => contentToPrint.current)}>
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
