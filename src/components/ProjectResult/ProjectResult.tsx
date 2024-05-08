import { Stack, Title } from '@mantine/core'
import { ResultTable } from '../ResultTable'

interface ProjectResultProps {
  fileName: string
}

export const ProjectResult = (props: ProjectResultProps) => {
  const { fileName } = props
  return (
    <Stack mt={16}>
      <Title order={3}>{fileName}</Title>
      <ResultTable />
    </Stack>
  )
}
