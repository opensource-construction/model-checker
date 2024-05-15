import { Paper, ProjectResult } from '@components'
import { Button, Container, Divider, Title, Group } from '@mantine/core'
import { useValidationContext } from '@context'

export const ResultPage = () => {
  const { state } = useValidationContext()

  return (
    <Container mt={36} size='xl'>
      <Paper>
        <Group justify='space-between'>
          <Title order={2}>Results</Title>
          <Button color='#B2B2B2' mt='md' radius='md'>
            Print
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
