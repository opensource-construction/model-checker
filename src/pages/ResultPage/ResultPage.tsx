import { Paper, ProjectResult } from '@components'
import { Button, Container, Divider, Title, Group } from '@mantine/core'

export const ResultPage = () => {
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
        <ProjectResult fileName={'my_project.ifc'} />
      </Paper>
    </Container>
  )
}
