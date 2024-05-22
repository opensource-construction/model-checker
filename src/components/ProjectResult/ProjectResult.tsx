import { Stack, Title } from '@mantine/core'
import { ResultTable } from '../ResultTable'
import { useValidationContext } from '@context'
import { ValidationProgressbar } from '../ValidationProgressbar'

interface ProjectResultProps {
  fileName: string
}

export const ProjectResult = (props: ProjectResultProps) => {
  const { fileName } = props
  const { state } = useValidationContext()

  return (
    <Stack mt='lg'>
      <Title order={3}>{fileName}</Title>
      <ValidationProgressbar show={state[fileName].fileProcessing} progress={state[fileName].progress} />
      <ResultTable results={state[fileName].results} inProgress={state[fileName].fileProcessing} />
    </Stack>
  )
}
