import { Group, Stack, Text, Title } from '@mantine/core'
import { ResultTable } from '../ResultTable'
import { useValidationContext } from '@context'
import { ValidationProgressbar } from '../ValidationProgressbar'
import { useTranslation } from 'react-i18next'

interface ProjectResultProps {
  fileName: string
}

export const ProjectResult = (props: ProjectResultProps) => {
  const { fileName } = props
  const { t, i18n } = useTranslation()
  const { state } = useValidationContext()

  return (
    <Stack mt='lg'>
      <Title order={3}>{fileName}</Title>
      <Group>
        <Text size='sm'>
          {t('author')}
          {': '}
          {state[fileName].author}
        </Text>
        <Text size='sm'>
          {t('exported')}
          {': '}
          {new Date(state[fileName].exported).toLocaleDateString(i18n.resolvedLanguage)}{' '}
          {new Date(state[fileName].exported).toLocaleTimeString(i18n.resolvedLanguage)}
        </Text>
      </Group>
      <ValidationProgressbar show={state[fileName].fileProcessing} progress={state[fileName].progress} />
      <ResultTable results={state[fileName].results} inProgress={state[fileName].fileProcessing} />
    </Stack>
  )
}
