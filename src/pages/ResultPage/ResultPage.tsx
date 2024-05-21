import { Paper, ProjectResult } from '@components'
import { Button, Container, Divider, Group, Title } from '@mantine/core'
import { useValidationContext } from '@context'
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export const ResultPage = () => {
  const { state } = useValidationContext()
  const { t } = useTranslation()
  const navigate = useNavigate()

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
          <Button color='#B2B2B2' mt='md' radius='md'>
            {t('print')}
          </Button>
        </Group>
        <Divider my='sm' style={{ width: '30%' }} />
        {Object.values(state).map((result) => (
          <ProjectResult key={result.name} fileName={result.name} />
        ))}
      </Paper>
    </Container>
  )
}
